import { defineNuxtModule } from 'nuxt/kit';
import { dirname, resolve } from 'node:path';
import { CORE_PACKAGES } from '@refrakt-md/transform';
import {
	loadRefraktConfig,
	resolveSite,
	createSiteTokensVitePlugin,
	SITE_TOKENS_VIRTUAL_ID,
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

		// Inject theme CSS + site-tokens overrides. Order matters: theme defaults
		// first, site overrides second so the `--rf-*` cascade resolves to the
		// override value last.
		nuxt.options.css = nuxt.options.css ?? [];
		nuxt.options.css.push(themePackage, SITE_TOKENS_VIRTUAL_ID);

		// Register the Vite plugin that serves virtual:refrakt/site-tokens.css.
		// Shared factory from @refrakt-md/transform/node; same plugin the Astro
		// integration uses.
		nuxt.options.vite = nuxt.options.vite ?? {};
		nuxt.options.vite.plugins = nuxt.options.vite.plugins ?? [];
		nuxt.options.vite.plugins.push(createSiteTokensVitePlugin(site, configDir));

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
