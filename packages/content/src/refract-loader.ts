import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin, SiteConfig, SecurityPolicy, RefraktConfig, XrefPattern } from '@refrakt-md/types';
import { getThemePackage } from '@refrakt-md/types';
import { normalizeRefraktConfig, resolveSite, loadPresets } from '@refrakt-md/transform/node';
import type { ThemeTokensConfig } from '@refrakt-md/types';
import { compileXrefPatterns, type CompiledXrefPattern } from '@refrakt-md/runes';
import { mergeFileRoots, resolveUserFileRoots, type FileRoots } from './file-roots.js';
import {
	createSiteLoader,
	createVirtualSiteLoader,
	type SiteLoader,
} from './loader.js';
import type { ContentTree } from './content-tree.js';
import type { Site, VirtualReader } from './site.js';

export interface RefraktLoaderOptions {
	/** Path to refrakt.config.json. Default: './refrakt.config.json' */
	configPath?: string;
	/** Site name to load from a multi-site config. Required when the config
	 *  declares multiple `sites.*`; optional otherwise. */
	site?: string;
	/** Markdoc variables available in content via {% $name %} syntax. */
	variables?: Record<string, unknown>;
	/** Security policy for untrusted author content. Defaults to `'trusted'`
	 *  — no sanitisation. Set to `'strict'` (or a custom `SecurityPolicy` object)
	 *  when authoring content comes from untrusted sources (hosted product,
	 *  external editors, etc.). Forwarded to `loadContent`'s `securityPolicy`. */
	security?: SecurityPolicy;
	/** Skip caching — re-read on every load(). Default: false. */
	dev?: boolean;
}

export interface RefraktLoader {
	/** Returns the loaded Site (cached unless dev mode). */
	getSite(): Promise<Site>;
	/** Returns the assembled identity transform function. */
	getTransform(): Promise<(tree: any) => any>;
	/** Returns the syntax highlight transform. */
	getHighlightTransform(): Promise<{ (tree: any): any; css: string }>;
	/** Clears the cached site so the next getSite() re-reads from disk. */
	invalidateSite(): void;
}

interface AssembledSiteContext {
	transform: (tree: any) => any;
	communityTags: Record<string, any> | undefined;
	communityPackages: Plugin[] | undefined;
	icons: Record<string, Record<string, string>>;
	/** Plugin-contributed file roots (already absolute paths). Merged with
	 *  user-config roots downstream. */
	pluginFileRoots: FileRoots;
}

/** Compile xref patterns from a raw config, logging any diagnostics to
 *  stderr so the build surface remains visible. Errors don't throw — they
 *  produce a permissively-empty pattern set so the rest of the load
 *  succeeds and the user can fix the config without losing the whole site. */
function compileConfiguredXrefPatterns(
	patterns: XrefPattern[] | undefined,
): CompiledXrefPattern[] {
	const result = compileXrefPatterns(patterns);
	for (const warning of result.warnings) {
		process.stderr.write(`refrakt: xref pattern warning — ${warning}\n`);
	}
	for (const error of result.errors) {
		process.stderr.write(`refrakt: xref pattern error — ${error}\n`);
	}
	return result.patterns;
}

/** Compose the options bag handed to `createHighlightTransform`. Merges the
 *  site's `highlight.*` block with theme-level code settings (`theme.code.*`)
 *  so a single object reaches the transform — keeps adapter call sites tidy
 *  and lets the highlight package stay unaware of where each option comes
 *  from. Exported so non-SvelteKit adapters (HTML build script, Astro setup,
 *  custom hosts) can compose options the same way. */
export function buildHighlightOptions(site: SiteConfig) {
	const themeCode = typeof site.theme === 'object' && site.theme !== null
		? site.theme.code
		: undefined;
	return {
		...(site.highlight ?? {}),
		...(themeCode?.colorScheme ? { codeColorScheme: themeCode.colorScheme } : {}),
	};
}

/** Collect preset module specifiers referenced by a site's tints (SPEC-056
 *  preset-path extends). Mirrors the discovery the SvelteKit plugin does in
 *  `composeSiteTokensCss` so the runtime transform sees the same projection
 *  the static stylesheet does. */
function collectTintPresetSpecs(site: SiteConfig): string[] {
	const tints = site.tints as Record<string, { extends?: string }> | undefined;
	if (!tints) return [];
	const specs: string[] = [];
	for (const tint of Object.values(tints)) {
		const ext = tint.extends;
		if (typeof ext !== 'string') continue;
		// Only treat module-path / file-path values as preset specs; bare names
		// are tint-name extends and stay on the existing resolveTintExtends path.
		if (ext.startsWith('@') || ext.startsWith('./') || ext.startsWith('../') || ext.startsWith('/')) {
			if (!specs.includes(ext)) specs.push(ext);
		}
	}
	return specs;
}

/** Resolve a site's theme module + plugin merges into a single context object.
 *  Shared between the FS loader and the virtual loader so both produce
 *  byte-identical transforms from the same SiteConfig. */
async function assembleSiteContext(
	site: SiteConfig,
	opts: { configDir?: string } = {},
): Promise<AssembledSiteContext> {
	const themePackage = getThemePackage(site.theme);
	const themeModule = await import(/* @vite-ignore */ themePackage + '/transform');
	const themeConfig = themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;

	const icons = {
		...themeConfig.icons,
		global: { ...(themeConfig.icons?.global ?? {}), ...(site.icons ?? {}) },
	};

	const { assembleThemeConfig, createTransform } = await import('@refrakt-md/transform');

	// Load any presets referenced by `site.tints[*].extends` so the engine can
	// project their chrome accents into TintTokens at runtime — that's what
	// makes inline `--tint-*` styles available to `tint.css`'s `tint-mode`
	// override selectors. The SvelteKit plugin already loads these for the
	// scoped-tint stylesheet; we replicate the discovery here so the FS /
	// virtual loaders are self-sufficient.
	const tintPresetSpecs = collectTintPresetSpecs(site);
	const presetMap: Record<string, ThemeTokensConfig> = {};
	if (tintPresetSpecs.length > 0) {
		const tintPresetConfigs = await loadPresets(tintPresetSpecs, { from: opts.configDir });
		tintPresetSpecs.forEach((spec, i) => {
			presetMap[spec] = tintPresetConfigs[i];
		});
	}

	const siteOverrides: { tints?: any; backgrounds?: any } = {};
	if (site.tints) siteOverrides.tints = site.tints;
	if (site.backgrounds) siteOverrides.backgrounds = site.backgrounds;
	const hasSiteOverrides = Object.keys(siteOverrides).length > 0;

	const pluginNames = site.plugins ?? [];

	if (pluginNames.length === 0) {
		// No plugins, but we still need to route site-level tint/background
		// overrides + presetMap through assembleThemeConfig so tints with
		// preset-path extends get resolved.
		if (!hasSiteOverrides && Object.keys(presetMap).length === 0) {
			return {
				transform: createTransform(themeConfig),
				communityTags: undefined,
				communityPackages: undefined,
				icons,
				pluginFileRoots: {},
			};
		}
		const { config: assembledConfig } = assembleThemeConfig({
			coreConfig: themeConfig,
			themeOverrides: siteOverrides,
			presetMap,
		});
		return {
			transform: createTransform(assembledConfig),
			communityTags: undefined,
			communityPackages: undefined,
			icons,
			pluginFileRoots: {},
		};
	}

	const { loadPlugin, mergePlugins, runes: coreRunes } = await import('@refrakt-md/runes');
	const loaded = await Promise.all(
		pluginNames.map((name: string) => loadPlugin(name))
	);
	const coreRuneNames = new Set(Object.keys(coreRunes));
	const merged = mergePlugins(loaded, coreRuneNames, site.runes?.prefer);

	const { config: assembledConfig } = assembleThemeConfig({
		coreConfig: themeConfig,
		themeOverrides: hasSiteOverrides ? siteOverrides : undefined,
		pluginRunes: merged.themeRunes,
		pluginIcons: merged.themeIcons,
		pluginBackgrounds: merged.themeBackgrounds,
		extensions: merged.extensions as any,
		provenance: merged.provenance,
		presetMap,
	});

	return {
		transform: createTransform(assembledConfig),
		communityTags: Object.keys(merged.tags).length > 0 ? merged.tags : undefined,
		communityPackages: merged.plugins,
		icons,
		pluginFileRoots: merged.fileRoots,
	};
}

export function createRefraktLoader(options?: RefraktLoaderOptions): RefraktLoader {
	const configPath = resolve(options?.configPath ?? './refrakt.config.json');
	const configDir = dirname(configPath);
	const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as RefraktConfig;
	// Pass the config file's directory so nested-shape paths absolutize
	// file-relative (matches the SvelteKit plugin's behavior).
	const normalized = normalizeRefraktConfig(rawConfig, { configDir });
	const { site }: { site: SiteConfig } = resolveSite(normalized, options?.site);
	const contentDir = resolve(site.contentDir);
	// Compile xref patterns once at loader construction. Diagnostics
	// (invalid regex, unknown placeholders, etc.) are surfaced via
	// stderr — adapters can intercept via their own pipeline-warnings
	// formatter once SPEC-058 wiring is fully in place.
	const xrefPatterns = compileConfiguredXrefPatterns(rawConfig.xrefs);

	// Resolve user-config file roots against the config-file directory.
	// Plugin-contributed roots are merged in at init time (after plugins
	// load); user roots win any namespace collision (warning surfaced).
	const userFileRoots = resolveUserFileRoots(rawConfig.fileRoots, configDir);

	let _initPromise: Promise<void> | null = null;
	let _transform: ((tree: any) => any) | null = null;
	let _loader: SiteLoader | null = null;
	let _hl: { (tree: any): any; css: string } | null = null;

	async function init(): Promise<void> {
		if (_initPromise) return _initPromise;
		_initPromise = (async () => {
			const ctx = await assembleSiteContext(site, { configDir });
			_transform = ctx.transform;

			const { roots: fileRoots, warnings: fileRootWarnings } = mergeFileRoots(
				userFileRoots,
				ctx.pluginFileRoots,
			);
			for (const warning of fileRootWarnings) {
				process.stderr.write(`refrakt: ${warning}\n`);
			}

			_loader = createSiteLoader({
				dirPath: contentDir,
				basePath: '/',
				icons: ctx.icons,
				additionalTags: ctx.communityTags,
				plugins: ctx.communityPackages,
				variables: options?.variables,
				securityPolicy: options?.security,
				projectRoot: configDir,
				xrefPatterns,
				fileRoots: Object.keys(fileRoots).length > 0 ? fileRoots : undefined,
				dev: options?.dev ?? false,
			});
		})();
		return _initPromise;
	}

	return {
		async getSite(): Promise<Site> {
			await init();
			return _loader!.load();
		},

		async getTransform(): Promise<(tree: any) => any> {
			await init();
			return _transform!;
		},

		async getHighlightTransform(): Promise<{ (tree: any): any; css: string }> {
			if (_hl) return _hl;
			const { createHighlightTransform } = await import('@refrakt-md/highlight');
			_hl = await createHighlightTransform(buildHighlightOptions(site));
			return _hl;
		},

		invalidateSite(): void {
			_loader?.invalidate();
		},
	};
}

export interface VirtualRefraktLoaderOptions {
	/** Pre-resolved per-site configuration. The caller is responsible for
	 *  selecting the site (e.g., via `resolveSite()`) and normalizing any
	 *  config-relative paths. Filesystem paths inside this config (`theme`,
	 *  `contentDir`, plugin specifiers) are still resolved through the Node
	 *  module loader where applicable; only authoring content is virtualized. */
	site: SiteConfig;
	/** Pre-built content tree. Required — the page corpus, layouts, and
	 *  partials all come from here. */
	tree: ContentTree;
	/** Optional async reader for ad-hoc lookups. Reserved; see
	 *  {@link VirtualReader}. */
	reader?: VirtualReader;
	/** Markdoc variables available in content via {% $name %} syntax. */
	variables?: Record<string, unknown>;
	/** Security policy for untrusted author content. Defaults to `'trusted'`. */
	security?: SecurityPolicy;
	/** URL base path for the Router. Default: `'/'`. */
	basePath?: string;
	/** Absolute path to the project root (where `refrakt.config.json` lives, or
	 *  the conceptual root in a virtual environment). Used to compute
	 *  `$file.path`. When omitted, `$file.path` falls back to the page's
	 *  content-root-relative path. */
	projectRoot?: string;
	/** Xref patterns to compile and use as URL-resolution fallback. */
	xrefs?: XrefPattern[];
	/** File roots — namespace → absolute directory path. Hosts that have a
	 *  conceptual project root should resolve their fileRoots config against
	 *  it before passing the result here (the virtual loader doesn't read a
	 *  config file). Plugin-declared roots merge in automatically. */
	fileRoots?: FileRoots;
	/** Skip caching — re-run the pipeline on every load(). Default: false. */
	dev?: boolean;
}

/**
 * Refrakt loader for hosted (non-filesystem) environments. Sibling to
 * {@link createRefraktLoader}.
 *
 * Differences:
 * - Accepts a pre-resolved {@link SiteConfig} instead of reading
 *   `refrakt.config.json` from disk. The caller is expected to source and
 *   normalize the config however suits their host (env, DB, GitHub, etc.).
 * - Drives content from a pre-built {@link ContentTree} rather than walking
 *   the filesystem. Combine with a `reader` for forward-compatibility with
 *   future async lookup paths.
 *
 * Theme module and plugin specifiers are still resolved through Node's module
 * loader, so the theme package and any plugins must be reachable as installed
 * dependencies in the host environment.
 */
export function createVirtualRefraktLoader(options: VirtualRefraktLoaderOptions): RefraktLoader {
	const { site, tree, reader, variables, security, basePath, projectRoot, xrefs, fileRoots: userFileRootsOption, dev } = options;
	const xrefPatterns = compileConfiguredXrefPatterns(xrefs);
	const userFileRoots = userFileRootsOption ?? {};

	let _initPromise: Promise<void> | null = null;
	let _transform: ((tree: any) => any) | null = null;
	let _loader: SiteLoader | null = null;
	let _hl: { (tree: any): any; css: string } | null = null;

	async function init(): Promise<void> {
		if (_initPromise) return _initPromise;
		_initPromise = (async () => {
			const ctx = await assembleSiteContext(site);
			_transform = ctx.transform;

			const { roots: fileRoots, warnings: fileRootWarnings } = mergeFileRoots(
				userFileRoots,
				ctx.pluginFileRoots,
			);
			for (const warning of fileRootWarnings) {
				process.stderr.write(`refrakt: ${warning}\n`);
			}

			_loader = createVirtualSiteLoader({
				tree,
				basePath: basePath ?? '/',
				icons: ctx.icons,
				additionalTags: ctx.communityTags,
				plugins: ctx.communityPackages,
				variables,
				securityPolicy: security,
				reader,
				projectRoot,
				xrefPatterns,
				fileRoots: Object.keys(fileRoots).length > 0 ? fileRoots : undefined,
				dev: dev ?? false,
			});
		})();
		return _initPromise;
	}

	return {
		async getSite(): Promise<Site> {
			await init();
			return _loader!.load();
		},

		async getTransform(): Promise<(tree: any) => any> {
			await init();
			return _transform!;
		},

		async getHighlightTransform(): Promise<{ (tree: any): any; css: string }> {
			if (_hl) return _hl;
			const { createHighlightTransform } = await import('@refrakt-md/highlight');
			_hl = await createHighlightTransform(buildHighlightOptions(site));
			return _hl;
		},

		invalidateSite(): void {
			_loader?.invalidate();
		},
	};
}
