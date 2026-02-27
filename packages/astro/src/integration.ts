import type { AstroPluginOptions } from './types.js';
import { createVitePlugin } from './vite-plugin.js';

/**
 * Astro integration for refrakt.md.
 *
 * Injects the refrakt Vite plugin (virtual modules, CSS injection, content HMR)
 * into Astro's Vite configuration.
 *
 * Usage in astro.config.mjs:
 * ```js
 * import { defineConfig } from 'astro/config';
 * import { refrakt } from '@refrakt-md/astro';
 *
 * export default defineConfig({
 *   integrations: [refrakt()],
 * });
 * ```
 */
export function refrakt(options: AstroPluginOptions = {}) {
	return {
		name: '@refrakt-md/astro' as const,
		hooks: {
			'astro:config:setup': ({ updateConfig }: { updateConfig: (config: any) => void }) => {
				updateConfig({
					vite: {
						plugins: [createVitePlugin(options)],
					},
				});
			},
		},
	};
}
