import { defineNuxtModule } from 'nuxt/kit';
import { dirname, resolve } from 'node:path';
import { CORE_PACKAGES } from '@refrakt-md/transform';
import {
	loadRefraktConfig,
	resolveSite,
	createSiteTokensVitePlugin,
	createRunesCssVitePlugin,
	computeUsedCssBlocks,
	SITE_TOKENS_VIRTUAL_ID,
	RUNES_VIRTUAL_ID,
} from '@refrakt-md/transform/node';
import { getThemePackage } from '@refrakt-md/types';
import type { RefraktNuxtOptions } from './types.js';

export default defineNuxtModule<RefraktNuxtOptions>({
	meta: {
		name: '@refrakt-md/nuxt',
		configKey: 'refrakt',
	},
	defaults: {
		configPath: './refrakt.config.json',
	},
	setup(options: RefraktNuxtOptions, nuxt: any) {
		const configPath = options.configPath!;
		const refraktConfig = loadRefraktConfig(configPath);
		const { site } = resolveSite(refraktConfig, options.site);
		const themePackage = getThemePackage(site.theme);
		const configDir = dirname(resolve(configPath));

		// Add packages to transpile list
		const transpile = [
			...CORE_PACKAGES,
			'@refrakt-md/nuxt',
			themePackage,
			`${themePackage}/nuxt`,
			...(site.plugins ?? []),
		];
		nuxt.options.build.transpile.push(...transpile);

		// Inject tree-shaken runes CSS + site-tokens overrides. Order matters:
		// per-rune CSS first (includes base.css), site-tokens CSS second so the
		// `--rf-*` cascade resolves to the override value last.
		nuxt.options.css = nuxt.options.css ?? [];
		nuxt.options.css.push(RUNES_VIRTUAL_ID, SITE_TOKENS_VIRTUAL_ID);

		// Callback the runes Vite plugin invokes in `buildStart` to compute
		// the tree-shaken rune set + print the standard Phase 1/2/3/4 + warnings
		// summary to stderr (matches SvelteKit reference output). Same shape
		// as the Astro integration.
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
				console.warn('[refrakt] CSS tree-shaking skipped:', (err as Error).message);
				return { themePackage, fallbackToBarrel: true as const };
			}
		};

		// Register the Vite plugins serving virtual:refrakt/site-tokens.css and
		// virtual:refrakt/runes.css. Shared factories from
		// @refrakt-md/transform/node — same plugins the Astro integration uses.
		nuxt.options.vite = nuxt.options.vite ?? {};
		nuxt.options.vite.plugins = nuxt.options.vite.plugins ?? [];
		nuxt.options.vite.plugins.push(
			createSiteTokensVitePlugin(site, configDir),
			createRunesCssVitePlugin(getUsedBlocks),
		);

		// Configure Vue to treat rf-* as custom elements (compose with existing)
		const prevIsCustomElement = nuxt.options.vue.compilerOptions.isCustomElement;
		nuxt.options.vue.compilerOptions.isCustomElement = (tag: string) =>
			tag.startsWith('rf-') || (prevIsCustomElement ? prevIsCustomElement(tag) : false);

		// Watch content directory for HMR
		const contentDir = resolve(nuxt.options.rootDir, site.contentDir);
		nuxt.hook('builder:watch', async (_event: string, relativePath: string) => {
			if (relativePath.endsWith('.md')) {
				const absPath = resolve(nuxt.options.rootDir, relativePath);
				if (absPath.startsWith(contentDir)) {
					await nuxt.callHook('builder:generateApp');
				}
			}
		});
	},
});
