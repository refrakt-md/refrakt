import { defineNuxtModule } from 'nuxt/kit';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import type { RefraktConfig } from '@refrakt-md/types';
import type { RefraktNuxtOptions } from './types.js';

const CORE_TRANSPILE = [
	'@markdoc/markdoc',
	'@refrakt-md/runes',
	'@refrakt-md/content',
	'@refrakt-md/types',
	'@refrakt-md/nuxt',
	'@refrakt-md/transform',
];

function loadRefraktConfig(configPath: string): RefraktConfig {
	const absPath = resolve(configPath);
	if (!existsSync(absPath)) {
		throw new Error(
			`refrakt.config.json not found at ${absPath}. ` +
			`Create one with at minimum: { "contentDir": "./content", "theme": "<package-name>", "target": "nuxt" }`
		);
	}
	return JSON.parse(readFileSync(absPath, 'utf-8'));
}

export default defineNuxtModule<RefraktNuxtOptions>({
	meta: {
		name: '@refrakt-md/nuxt',
		configKey: 'refrakt',
	},
	defaults: {
		configPath: './refrakt.config.json',
	},
	setup(options, nuxt) {
		const refraktConfig = loadRefraktConfig(options.configPath!);

		// Add packages to transpile list
		const transpile = [
			...CORE_TRANSPILE,
			refraktConfig.theme,
			`${refraktConfig.theme}/nuxt`,
			...(refraktConfig.packages ?? []),
		];
		nuxt.options.build.transpile.push(...transpile);

		// Configure Vue to treat rf-* as custom elements
		nuxt.options.vue.compilerOptions.isCustomElement = (tag: string) => tag.startsWith('rf-');

		// Watch content directory for HMR
		const contentDir = resolve(nuxt.options.rootDir, refraktConfig.contentDir);
		nuxt.hook('builder:watch', async (_event, relativePath) => {
			if (relativePath.endsWith('.md')) {
				const absPath = resolve(nuxt.options.rootDir, relativePath);
				if (absPath.startsWith(contentDir)) {
					await nuxt.callHook('builder:generateApp');
				}
			}
		});
	},
});
