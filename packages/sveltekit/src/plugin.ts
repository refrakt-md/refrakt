import type { Plugin, UserConfig } from 'vite';
import type { RefractConfig } from '@refract-md/types';
import type { RefractPluginOptions } from './types.js';
import { loadRefractConfig } from './config.js';
import { resolveVirtualId, loadVirtualModule } from './virtual-modules.js';
import { setupContentHmr } from './content-hmr.js';

const CORE_NO_EXTERNAL = [
	'@markdoc/markdoc',
	'@refract-md/runes',
	'@refract-md/content',
	'@refract-md/types',
	'@refract-md/svelte',
];

export function refract(options: RefractPluginOptions = {}): Plugin {
	const configPath = options.configPath ?? './refract.config.json';
	let refractConfig: RefractConfig;

	return {
		name: 'refract-md',

		config(): Partial<UserConfig> {
			refractConfig = loadRefractConfig(configPath);

			const noExternal = [
				...CORE_NO_EXTERNAL,
				refractConfig.theme,
				...(options.noExternal ?? []),
			];

			return {
				ssr: {
					noExternal,
				},
			};
		},

		resolveId(id: string) {
			return resolveVirtualId(id);
		},

		load(id: string) {
			return loadVirtualModule(id, refractConfig);
		},

		configureServer(server) {
			setupContentHmr(server, refractConfig.contentDir);
		},
	};
}
