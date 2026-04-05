import { resolve } from 'node:path';
import type { AstroIntegration } from 'astro';
import { CORE_PACKAGES } from '@refrakt-md/transform';
import { loadRefraktConfig } from '@refrakt-md/transform/node';
import type { RefraktAstroOptions } from './types.js';

/**
 * Astro integration for refrakt.
 *
 * Reads `refrakt.config.json`, configures SSR noExternal,
 * and sets up content HMR in dev mode.
 */
export function refrakt(options: RefraktAstroOptions = {}): AstroIntegration {
	const configPath = options.configPath ?? './refrakt.config.json';

	return {
		name: '@refrakt-md/astro',
		hooks: {
			'astro:config:setup'({ config, updateConfig, addWatchFile }) {
				const refraktConfig = loadRefraktConfig(configPath);

				const themeAdapter = `${refraktConfig.theme}/astro`;
				const noExternal = [
					...CORE_PACKAGES,
					'@refrakt-md/astro',
					refraktConfig.theme,
					themeAdapter,
					...(refraktConfig.packages ?? []),
				];

				updateConfig({
					vite: {
						ssr: {
							noExternal,
							optimizeDeps: {
								include: ['@markdoc/markdoc'],
							},
						},
					},
				});

				// Watch content directory for changes in dev mode
				const contentDir = resolve(config.root.pathname, refraktConfig.contentDir);
				addWatchFile(contentDir);
			},
		},
	};
}
