import { resolve, dirname } from 'node:path';
import type { AstroIntegration } from 'astro';
import { CORE_PACKAGES } from '@refrakt-md/transform';
import {
	loadRefraktConfig,
	resolveSite,
	createSiteTokensVitePlugin,
	SITE_TOKENS_VIRTUAL_ID,
} from '@refrakt-md/transform/node';
import { getThemePackage } from '@refrakt-md/types';
import type { RefraktAstroOptions } from './types.js';

/**
 * Astro integration for refrakt.
 *
 * Reads `refrakt.config.json`, resolves the requested site (or the lone site
 * for single-site projects), configures SSR noExternal, sets up content HMR
 * in dev mode, and serves `virtual:refrakt/site-tokens.css` carrying any
 * site-level token / preset / mode / tint overrides (SPEC-048 + SPEC-056).
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
						// assignable to Astro's PluginOption. The plugin is
						// duck-typed and runs identically at runtime — cast
						// through `never` to satisfy both type universes.
						plugins: [createSiteTokensVitePlugin(site, configDir) as never],
					},
				});

				// Inject the theme CSS *and* the site-tokens overrides. Order
				// matters: theme defaults first, site overrides second so the
				// `--rf-*` cascade resolves to the override value last.
				injectScript(
					'page-ssr',
					`import '${themePackage}';\nimport '${SITE_TOKENS_VIRTUAL_ID}';`,
				);

				// Watch content directory for changes in dev mode
				const contentDir = resolve(config.root.pathname, site.contentDir);
				addWatchFile(contentDir);
			},
		},
	};
}
