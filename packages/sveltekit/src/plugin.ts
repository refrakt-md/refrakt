import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, UserConfig } from 'vite';
import type { RefraktConfig } from '@refrakt-md/types';
import type { RefractPluginOptions } from './types.js';
import { loadRefraktConfig } from './config.js';
import { resolveVirtualId, loadVirtualModule, type BuildContext } from './virtual-modules.js';
import { setupContentHmr } from './content-hmr.js';

const CORE_NO_EXTERNAL = [
	'@markdoc/markdoc',
	'@refrakt-md/runes',
	'@refrakt-md/content',
	'@refrakt-md/types',
	'@refrakt-md/svelte',
	'@refrakt-md/transform',
	'@refrakt-md/theme-base',
];

export function refrakt(options: RefractPluginOptions = {}): Plugin {
	const configPath = options.configPath ?? './refrakt.config.json';
	let refraktConfig: RefraktConfig;
	let isBuild = false;
	let resolvedRoot = '';
	let usedCssBlocks: Set<string> | undefined;

	return {
		name: 'refrakt-md',

		config(_, env): Partial<UserConfig> {
			isBuild = env.command === 'build';
			refraktConfig = loadRefraktConfig(configPath);

			const themeAdapter = `${refraktConfig.theme}/${refraktConfig.target}`;
			const noExternal = [
				...CORE_NO_EXTERNAL,
				refraktConfig.theme,
				themeAdapter,
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

		configResolved(resolved) {
			resolvedRoot = resolved.root;
		},

		async buildStart() {
			if (!isBuild) return;

			try {
				const contentPkg = '@refrakt-md/content';
				const { loadContent, analyzeRuneUsage } = await import(contentPkg);
				const site = await loadContent(resolve(resolvedRoot, refraktConfig.contentDir));
				const report = analyzeRuneUsage(site.pages);

				const themeTransform = await import(`${refraktConfig.theme}/transform`);
				const themeConfig = themeTransform.themeConfig ?? themeTransform.luminaConfig ?? themeTransform.default;

				usedCssBlocks = new Set<string>();

				// Resolve the theme's root export (index.css) to find the package directory
				const themeEntryUrl = import.meta.resolve(refraktConfig.theme);
				const themeDir = dirname(fileURLToPath(themeEntryUrl));
				const stylesDir = join(themeDir, 'styles', 'runes');

				for (const typeName of report.allTypes) {
					const runeConfig = themeConfig.runes[typeName];
					if (runeConfig && existsSync(join(stylesDir, `${runeConfig.block}.css`))) {
						usedCssBlocks.add(runeConfig.block);
					}
				}
			} catch (err) {
				// Graceful fallback — if analysis fails, all CSS is included
				usedCssBlocks = undefined;
				console.warn('[refrakt] CSS tree-shaking skipped:', (err as Error).message);
			}
		},

		resolveId(id: string) {
			return resolveVirtualId(id);
		},

		load(id: string) {
			const buildCtx: BuildContext = { isBuild, usedCssBlocks };
			return loadVirtualModule(id, refraktConfig, buildCtx);
		},

		configureServer(server) {
			setupContentHmr(server, refraktConfig.contentDir);
		},
	};
}
