import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin as VitePlugin, UserConfig } from 'vite';
import type { Plugin, SiteConfig, PipelineWarning } from '@refrakt-md/types';
import { getThemePackage } from '@refrakt-md/types';
import type { Schema } from '@markdoc/markdoc';
import type { RefractPluginOptions } from './types.js';
import { loadRefraktConfig } from './config.js';
import {
	normalizeRefraktConfig,
	resolveSite,
	composeSiteTokensCss,
} from '@refrakt-md/transform/node';
import { resolveVirtualId, loadVirtualModule, type BuildContext } from './virtual-modules.js';
import { setupContentHmr } from './content-hmr.js';

const CORE_NO_EXTERNAL = [
	'@markdoc/markdoc',
	'@refrakt-md/runes',
	'@refrakt-md/content',
	'@refrakt-md/types',
	'@refrakt-md/svelte',
	'@refrakt-md/transform',
	'@refrakt-md/highlight',
];

export function refrakt(options: RefractPluginOptions = {}): VitePlugin {
	const configPath = options.configPath ?? './refrakt.config.json';
	let activeSite: SiteConfig;
	let activeSiteName: string;
	let isBuild = false;
	let resolvedRoot = '';
	let usedCssBlocks: Set<string> | undefined;
	let communityTags: Record<string, Schema> | undefined;
	let assembledResult: { config: Record<string, any>; provenance: Record<string, any> } | undefined;
	let mergedPackages: Plugin[] | undefined;
	let contentLoaded = false;
	let activeConfigDir = '';
	/** Generated CSS for site-level token overrides (presets + theme.tokens +
	 *  theme.modes), or empty string if no overrides are configured. Computed
	 *  asynchronously in `buildStart` and consumed by the
	 *  `virtual:refrakt/site-tokens.css` virtual module. */
	let siteTokensCss = '';

	return {
		name: 'refrakt-md',

		config(_, env): Partial<UserConfig> {
			isBuild = env.command === 'build';
			const rawConfig = loadRefraktConfig(configPath);
			// configDir is the directory containing refrakt.config.json — used by
			// the normalizer to absolutize nested-shape relative paths so adapters
			// see file-relative semantics rather than cwd-relative.
			const configDir = dirname(resolve(configPath));
			const normalizedConfig = normalizeRefraktConfig(rawConfig, { configDir });
			const resolved = resolveSite(normalizedConfig, options.site);
			activeSite = resolved.site;
			activeSiteName = resolved.name;
			// Stash configDir for `buildStart` — that's where we run the async
			// preset loading so this hook stays synchronous (avoids cascading
			// `await` changes through the rest of the plugin lifecycle / tests).
			activeConfigDir = configDir;

			const noExternal = [
				...CORE_NO_EXTERNAL,
				getThemePackage(activeSite.theme),
				...(activeSite.plugins ?? []),
				...(options.noExternal ?? []),
			];

			return {
				ssr: {
					noExternal,
					optimizeDeps: {
						include: ['@markdoc/markdoc'],
					},
				},
			};
		},

		configResolved(resolved) {
			resolvedRoot = resolved.root;
		},

		async buildStart() {
			// Compute site-level token overrides per SPEC-048 / SPEC-051.
			// When `site.theme` is the object form with presets / tokens / modes,
			// load presets, merge with site overrides, validate, and generate
			// CSS. Empty string if `theme` is the legacy string shorthand or
			// declares no overrides.
			siteTokensCss = await composeSiteTokensCss(activeSite, activeConfigDir);

			// Load community/official packages and local runes if configured
			const hasPackages = activeSite.plugins && activeSite.plugins.length > 0;
			const hasLocal = activeSite.runes?.local && Object.keys(activeSite.runes.local).length > 0;
			const hasAliases = activeSite.runes?.aliases && Object.keys(activeSite.runes.aliases).length > 0;

			if (hasPackages || hasLocal || hasAliases) {
				try {
					const runesPkg = '@refrakt-md/runes';
					const { loadPlugin, mergePlugins, applyAliases, loadLocalRunes, runes: coreRunes, runeTagMap } = await import(runesPkg);
					const coreRuneNames = new Set(Object.keys(coreRunes));

					let mergedRunes = { ...coreRunes };
					let mergedTags: Record<string, Schema> = {};
					let merged;

					// Load installed packages
					if (hasPackages) {
						const loaded = await Promise.all(
							activeSite.plugins!.map((name: string) => loadPlugin(name))
						);
						merged = mergePlugins(loaded, coreRuneNames, activeSite.runes?.prefer);
						mergedRunes = { ...coreRunes, ...merged.runes };
						mergedTags = merged.tags;
						mergedPackages = merged.plugins;
					}

					// Load local runes (highest priority)
					if (hasLocal) {
						const local = await loadLocalRunes(activeSite.runes!.local!, resolvedRoot);
						mergedRunes = { ...mergedRunes, ...local.runes };
						mergedTags = { ...mergedTags, ...runeTagMap(local.runes) };
					}

					// Apply config-level aliases
					if (hasAliases && merged) {
						const aliased = applyAliases(
							mergedRunes,
							mergedTags,
							activeSite.runes!.aliases!,
							merged.provenance,
						);
						mergedTags = aliased.tags;
					}

					communityTags = Object.keys(mergedTags).length > 0 ? mergedTags : undefined;

					// Assemble theme config for CSS tree-shaking
					if (merged && (Object.keys(merged.themeRunes).length > 0 || Object.keys(merged.themeIcons).length > 0 || Object.keys(merged.themeBackgrounds).length > 0)) {
						const { assembleThemeConfig } = await import('@refrakt-md/transform');
						const { baseConfig } = await import(runesPkg);
						assembledResult = assembleThemeConfig({
							coreConfig: baseConfig,
							pluginRunes: merged.themeRunes,
							pluginIcons: merged.themeIcons,
							pluginBackgrounds: merged.themeBackgrounds,
							provenance: merged.provenance,
						});
					}
				} catch (err) {
					console.warn('[refrakt] Package loading failed:', (err as Error).message);
				}
			}

			if (!isBuild) return;
			if (contentLoaded) return;
			contentLoaded = true;

			try {
				const contentPkg = '@refrakt-md/content';
				const { loadContent, analyzeRuneUsage } = await import(contentPkg);
				const sandboxExamplesDir = activeSite.sandbox?.examplesDir
					? resolve(resolvedRoot, activeSite.sandbox.examplesDir)
					: undefined;
				const site = await loadContent(
					resolve(resolvedRoot, activeSite.contentDir),
					'/',
					undefined,
					communityTags,
					mergedPackages,
					sandboxExamplesDir,
					undefined,
					options.security,
				);

				const { pipelineStats: stats } = site;
				const warnings: PipelineWarning[] = site.pipelineWarnings;
				const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));
				process.stderr.write(`  ${pad('Phase 1: Parse', 30)} ${stats.pageCount} pages\n`);
				process.stderr.write(`  ${pad('Phase 2: Register', 30)} ${stats.entityCount} entities\n`);
				process.stderr.write(`  ${pad('Phase 3: Aggregate', 30)} ${stats.packageCount} packages\n`);
				process.stderr.write(`  ${pad('Phase 4: Post-process', 30)} ${stats.pageCount} pages\n`);
				const errorCount = warnings.filter(w => w.severity === 'error').length;
				const warnCount = warnings.filter(w => w.severity === 'warning').length;
				for (const w of warnings) {
					const icon = w.severity === 'error' ? '✗  error' : w.severity === 'info' ? 'ℹ  info ' : '⚠  warn ';
					const location = w.url ? `  ${w.url}` : '';
					process.stderr.write(`\n  ${icon}  ${w.message}${location}\n`);
				}
				const status = errorCount > 0 ? '✗' : '✓';
				process.stderr.write(`\n  ${status}  Build complete (${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warnCount} warning${warnCount !== 1 ? 's' : ''})\n\n`);

				const report = analyzeRuneUsage(site.pages);

				const themePackage = getThemePackage(activeSite.theme);
				const themeTransform = await import(`${themePackage}/transform`);
				const themeConfig = themeTransform.themeConfig ?? themeTransform.luminaConfig ?? themeTransform.default;
				const effectiveConfig = assembledResult?.config ?? themeConfig;

				usedCssBlocks = new Set<string>();

				// Resolve the theme's root export (index.css) to find the package directory
				const themeEntryUrl = import.meta.resolve(themePackage);
				const themeDir = dirname(fileURLToPath(themeEntryUrl));
				const stylesDir = join(themeDir, 'styles', 'runes');

				// Build kebab → config key map (data-rune uses kebab-case, config keys are PascalCase)
				const { toKebabCase } = await import('@refrakt-md/transform');
				const runeKeyMap = new Map(
					Object.keys(effectiveConfig.runes).map(k => [toKebabCase(k), k])
				);

				for (const typeName of report.allTypes) {
					const configKey = runeKeyMap.get(typeName);
					const runeConfig = configKey ? effectiveConfig.runes[configKey] : undefined;
					if (runeConfig && existsSync(join(stylesDir, `${runeConfig.block}.css`))) {
						usedCssBlocks.add(runeConfig.block);
					}
				}

				// Tint is a universal attribute (not a rune), so it never appears
				// in data-rune analysis. Always include its CSS when present.
				if (existsSync(join(stylesDir, 'tint.css'))) {
					usedCssBlocks.add('tint');
				}
			} catch (err) {
				// Graceful fallback — if analysis fails, all CSS is included
				usedCssBlocks = undefined;
				console.warn('[refrakt] CSS tree-shaking skipped:', (err as Error).message);
			}
		},

		resolveId(id: string) {
			if (id === 'virtual:refrakt/site-tokens.css') {
				return '\0virtual:refrakt/site-tokens.css';
			}
			return resolveVirtualId(id);
		},

		load(id: string) {
			if (id === '\0virtual:refrakt/site-tokens.css') {
				return siteTokensCss;
			}
			const buildCtx: BuildContext = {
				isBuild,
				usedCssBlocks,
				resolvedRoot,
				variables: options.variables,
				configPath,
				siteName: activeSiteName,
			};
			return loadVirtualModule(id, activeSite, buildCtx);
		},

		configureServer(server) {
			const examplesDir = activeSite.sandbox?.examplesDir
				? resolve(resolvedRoot, activeSite.sandbox.examplesDir)
				: undefined;

			// On .md changes, drop the cached Site so the next SSR pass rebuilds
			// it. The virtual content module memoizes the loader's `getSite()`
			// result (see `dev: false` in virtual-modules.ts); without this hook
			// the cache would survive edits and serve stale content. Skipping
			// the call when the module hasn't been loaded yet avoids paying for
			// a fresh evaluation just to invalidate nothing.
			const invalidate = async () => {
				const resolvedId = '\0virtual:refrakt/content';
				if (!server.moduleGraph.getModuleById(resolvedId)) return;
				try {
					const mod = await server.ssrLoadModule('virtual:refrakt/content');
					(mod as { invalidateSite?: () => void }).invalidateSite?.();
				} catch {
					// Module failed to load (e.g. transient error during HMR);
					// the next request will surface the real error.
				}
			};

			setupContentHmr(server, activeSite.contentDir, examplesDir, invalidate);
		},
	};
}
