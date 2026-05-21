import { resolve, dirname } from 'node:path';
import type { AstroIntegration } from 'astro';
import { CORE_PACKAGES } from '@refrakt-md/transform';
import {
	loadRefraktConfig,
	resolveSite,
	createSiteTokensVitePlugin,
	createRunesCssVitePlugin,
	computeUsedCssBlocks,
	setupContentHmr,
	SITE_TOKENS_VIRTUAL_ID,
	RUNES_VIRTUAL_ID,
} from '@refrakt-md/transform/node';
import { getThemePackage } from '@refrakt-md/types';
import type { RefraktAstroOptions } from './types.js';

/**
 * Astro integration for refrakt.
 *
 * Reads `refrakt.config.json`, resolves the requested site (or the lone site
 * for single-site projects), configures SSR noExternal, sets up content HMR
 * in dev mode, serves `virtual:refrakt/site-tokens.css` carrying any
 * site-level token / preset / mode / tint overrides (SPEC-048 + SPEC-056),
 * and serves `virtual:refrakt/runes.css` carrying only the per-rune CSS
 * blocks actually used by the content corpus (tree-shaken).
 */
export function refrakt(options: RefraktAstroOptions = {}): AstroIntegration {
	const configPath = options.configPath ?? './refrakt.config.json';

	return {
		name: '@refrakt-md/astro',
		hooks: {
			'astro:config:setup'({ config, updateConfig, addWatchFile, injectScript }) {
				const refraktConfig = loadRefraktConfig(configPath);
				const { site } = resolveSite(refraktConfig, options.site);

				const themePackage = getThemePackage(site.theme);
				const noExternal = [
					...CORE_PACKAGES,
					'@refrakt-md/astro',
					themePackage,
					...(site.plugins ?? []),
				];

				// Capture configDir for the site-tokens Vite plugin — paths in
				// `refrakt.config.json` resolve relative to the config file's
				// directory, not Astro's project root.
				const configDir = dirname(resolve(configPath));

				// Callback the runes Vite plugin invokes in its `buildStart` hook
				// to compute the tree-shaken rune set. Loads content via
				// `createRefraktLoader` (cached internally) and runs the shared
				// `computeUsedCssBlocks` helper. Also prints the standard Phase
				// 1/2/3/4 + warnings summary to stderr (matches SvelteKit
				// reference output). Falls back to the theme barrel when
				// analysis fails.
				let summaryPrinted = false;
				const getUsedBlocks = async () => {
					try {
						const { createRefraktLoader, analyzeRuneUsage, formatPipelineSummary } =
							await import('@refrakt-md/content');
						const themeModule = await import(themePackage + '/transform');
						const themeConfig =
							themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;
						const loader = createRefraktLoader({
							configPath,
							site: options.site,
							variables: options.variables,
							security: options.security,
						});
						const loadedSite = await loader.getSite();
						if (!summaryPrinted) {
							process.stderr.write(
								formatPipelineSummary(
									loadedSite.pipelineStats,
									loadedSite.pipelineWarnings,
								),
							);
							summaryPrinted = true;
						}
						const report = analyzeRuneUsage(loadedSite.pages);
						const { usedBlocks } = await computeUsedCssBlocks(
							report.allTypes,
							themeConfig,
							themePackage,
						);
						return { usedBlocks, themePackage, themeConfig };
					} catch (err) {
						// eslint-disable-next-line no-console
						console.warn(
							'[refrakt] CSS tree-shaking skipped:',
							(err as Error).message,
						);
						return { themePackage, fallbackToBarrel: true as const };
					}
				};

				// Resolve content + sandbox paths for the HMR watcher. The
				// watcher is wired via the content-hmr Vite plugin below.
				const contentDir = resolve(config.root.pathname, site.contentDir);
				const examplesDir = site.sandbox?.examplesDir
					? resolve(config.root.pathname, site.sandbox.examplesDir)
					: undefined;

				// Content-HMR Vite plugin — registers the watcher in
				// `configureServer` so `.md` edits trigger a full browser reload
				// during `astro dev`. Mirrors the SvelteKit reference behaviour.
				const contentHmrPlugin = {
					name: 'refrakt-md:content-hmr',
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					configureServer(server: any) {
						setupContentHmr(server, contentDir, examplesDir);
					},
				};

				updateConfig({
					vite: {
						ssr: {
							noExternal,
							optimizeDeps: {
								include: ['@markdoc/markdoc'],
							},
						},
						// Astro 5 ships its own copy of Vite's types; the
						// version-pinned Plugin from our peer dep isn't
						// assignable to Astro's PluginOption. The plugins are
						// duck-typed and run identically at runtime — cast
						// through `never` to satisfy both type universes.
						plugins: [
							createSiteTokensVitePlugin(site, configDir) as never,
							createRunesCssVitePlugin(getUsedBlocks) as never,
							contentHmrPlugin as never,
						],
					},
				});

				// Inject the runes CSS *and* the site-tokens overrides. Order
				// matters: per-rune CSS first (which includes base.css), site
				// overrides second so the `--rf-*` cascade resolves to the
				// override value last.
				injectScript(
					'page-ssr',
					`import '${RUNES_VIRTUAL_ID}';\nimport '${SITE_TOKENS_VIRTUAL_ID}';`,
				);

				// Tell Astro to restart the dev server if `refrakt.config.json`
				// itself changes (content edits are handled by the HMR watcher above).
				addWatchFile(contentDir);
			},
		},
	};
}
