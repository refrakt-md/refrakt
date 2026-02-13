import type { Plugin, UserConfig } from 'vite';
import type { RefraktConfig } from '@refrakt-md/types';
import type { RefractPluginOptions } from './types.js';
import { loadRefraktConfig } from './config.js';
import { resolveVirtualId, loadVirtualModule } from './virtual-modules.js';
import { setupContentHmr } from './content-hmr.js';

const CORE_NO_EXTERNAL = [
	'@markdoc/markdoc',
	'@refrakt-md/runes',
	'@refrakt-md/content',
	'@refrakt-md/types',
	'@refrakt-md/svelte',
	'@refrakt-md/lumina',
];

export function refrakt(options: RefractPluginOptions = {}): Plugin {
	const configPath = options.configPath ?? './refrakt.config.json';
	let refraktConfig: RefraktConfig;

	return {
		name: 'refrakt-md',

		config(): Partial<UserConfig> {
			refraktConfig = loadRefraktConfig(configPath);

			const noExternal = [
				...CORE_NO_EXTERNAL,
				refraktConfig.theme,
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

		resolveId(id: string) {
			return resolveVirtualId(id);
		},

		load(id: string) {
			return loadVirtualModule(id, refraktConfig);
		},

		configureServer(server) {
			setupContentHmr(server, refraktConfig.contentDir);
		},
	};
}
