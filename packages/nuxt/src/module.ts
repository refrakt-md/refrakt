import { defineNuxtModule } from 'nuxt/kit';
import { resolve } from 'node:path';
import { CORE_PACKAGES } from '@refrakt-md/transform';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
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
		const refraktConfig = loadRefraktConfig(options.configPath!);
		const { site } = resolveSite(refraktConfig, options.site);

		// Add packages to transpile list
		const transpile = [
			...CORE_PACKAGES,
			'@refrakt-md/nuxt',
			site.theme,
			`${site.theme}/nuxt`,
			...(site.packages ?? []),
		];
		nuxt.options.build.transpile.push(...transpile);

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
