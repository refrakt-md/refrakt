import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin, SiteConfig } from '@refrakt-md/types';
import { getThemePackage } from '@refrakt-md/types';
import { normalizeRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
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

/** Resolve a site's theme module + plugin merges into a single context object.
 *  Shared between the FS loader and the virtual loader so both produce
 *  byte-identical transforms from the same SiteConfig. */
async function assembleSiteContext(site: SiteConfig): Promise<AssembledSiteContext> {
	const themePackage = getThemePackage(site.theme);
	const themeModule = await import(/* @vite-ignore */ themePackage + '/transform');
	const themeConfig = themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;

	const icons = {
		...themeConfig.icons,
		global: { ...(themeConfig.icons?.global ?? {}), ...(site.icons ?? {}) },
	};

	const { assembleThemeConfig, createTransform } = await import('@refrakt-md/transform');
	const pluginNames = site.plugins ?? [];

	if (pluginNames.length === 0) {
		return {
			transform: createTransform(themeConfig),
			communityTags: undefined,
			communityPackages: undefined,
			icons,
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
		pluginRunes: merged.themeRunes,
		pluginIcons: merged.themeIcons,
		pluginBackgrounds: merged.themeBackgrounds,
		extensions: merged.extensions as any,
		provenance: merged.provenance,
	});

	if (site.tints) {
		assembledConfig.tints = { ...assembledConfig.tints, ...site.tints } as any;
	}
	if (site.backgrounds) {
		assembledConfig.backgrounds = { ...assembledConfig.backgrounds, ...site.backgrounds } as any;
	}

	return {
		transform: createTransform(assembledConfig),
		communityTags: Object.keys(merged.tags).length > 0 ? merged.tags : undefined,
		communityPackages: merged.plugins,
		icons,
	};
}

export function createRefraktLoader(options?: RefraktLoaderOptions): RefraktLoader {
	const configPath = resolve(options?.configPath ?? './refrakt.config.json');
	const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
	// Pass the config file's directory so nested-shape paths absolutize
	// file-relative (matches the SvelteKit plugin's behavior).
	const normalized = normalizeRefraktConfig(rawConfig, { configDir: dirname(configPath) });
	const { site }: { site: SiteConfig } = resolveSite(normalized, options?.site);
	const contentDir = resolve(site.contentDir);

	let _initPromise: Promise<void> | null = null;
	let _transform: ((tree: any) => any) | null = null;
	let _loader: SiteLoader | null = null;
	let _hl: { (tree: any): any; css: string } | null = null;

	async function init(): Promise<void> {
		if (_initPromise) return _initPromise;
		_initPromise = (async () => {
			const ctx = await assembleSiteContext(site);
			_transform = ctx.transform;

			_loader = createSiteLoader({
				dirPath: contentDir,
				basePath: '/',
				icons: ctx.icons,
				additionalTags: ctx.communityTags,
				plugins: ctx.communityPackages,
				variables: options?.variables,
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
	/** URL base path for the Router. Default: `'/'`. */
	basePath?: string;
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
	const { site, tree, reader, variables, basePath, dev } = options;

	let _initPromise: Promise<void> | null = null;
	let _transform: ((tree: any) => any) | null = null;
	let _loader: SiteLoader | null = null;
	let _hl: { (tree: any): any; css: string } | null = null;

	async function init(): Promise<void> {
		if (_initPromise) return _initPromise;
		_initPromise = (async () => {
			const ctx = await assembleSiteContext(site);
			_transform = ctx.transform;

			_loader = createVirtualSiteLoader({
				tree,
				basePath: basePath ?? '/',
				icons: ctx.icons,
				additionalTags: ctx.communityTags,
				plugins: ctx.communityPackages,
				variables,
				reader,
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
