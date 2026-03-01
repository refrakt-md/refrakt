import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, UserConfig } from 'vite';
import type { RefraktConfig } from '@refrakt-md/types';
import type { Schema } from '@markdoc/markdoc';
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
	let communityTags: Record<string, Schema> | undefined;

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
				...(refraktConfig.packages ?? []),
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
			// Load community packages if configured
			if (refraktConfig.packages && refraktConfig.packages.length > 0) {
				try {
					const runesPkg = '@refrakt-md/runes';
					const { loadRunePackage, mergePackages, runes: coreRunes } = await import(runesPkg);
					const coreRuneNames = new Set(Object.keys(coreRunes));

					const loaded = await Promise.all(
						refraktConfig.packages.map((name: string) => loadRunePackage(name))
					);

					const merged = mergePackages(loaded, coreRuneNames, refraktConfig.runes?.prefer);
					communityTags = merged.tags;

					// Merge community theme config into base config for CSS tree-shaking
					if (Object.keys(merged.themeRunes).length > 0) {
						const themeBasePkg = '@refrakt-md/theme-base';
						const { mergeThemeConfig } = await import(themeBasePkg);
						// Theme config merging happens in buildStart for CSS analysis
					}
				} catch (err) {
					console.warn('[refrakt] Community package loading failed:', (err as Error).message);
				}
			}

			if (!isBuild) return;

			try {
				const contentPkg = '@refrakt-md/content';
				const { loadContent, analyzeRuneUsage } = await import(contentPkg);
				const site = await loadContent(
					resolve(resolvedRoot, refraktConfig.contentDir),
					'/',
					undefined,
					communityTags,
				);
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
