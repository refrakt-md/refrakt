import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, UserConfig } from 'vite';
import type { RefraktConfig, RunePackage, PipelineWarning } from '@refrakt-md/types';
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
	'@refrakt-md/highlight',
];

export function refrakt(options: RefractPluginOptions = {}): Plugin {
	const configPath = options.configPath ?? './refrakt.config.json';
	let refraktConfig: RefraktConfig;
	let isBuild = false;
	let resolvedRoot = '';
	let usedCssBlocks: Set<string> | undefined;
	let communityTags: Record<string, Schema> | undefined;
	let assembledResult: { config: Record<string, any>; provenance: Record<string, any> } | undefined;
	let mergedPackages: RunePackage[] | undefined;
	let contentLoaded = false;

	return {
		name: 'refrakt-md',

		config(_, env): Partial<UserConfig> {
			isBuild = env.command === 'build';
			refraktConfig = loadRefraktConfig(configPath);

			const noExternal = [
				...CORE_NO_EXTERNAL,
				refraktConfig.theme,
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
			// Load community/official packages and local runes if configured
			const hasPackages = refraktConfig.packages && refraktConfig.packages.length > 0;
			const hasLocal = refraktConfig.runes?.local && Object.keys(refraktConfig.runes.local).length > 0;
			const hasAliases = refraktConfig.runes?.aliases && Object.keys(refraktConfig.runes.aliases).length > 0;

			if (hasPackages || hasLocal || hasAliases) {
				try {
					const runesPkg = '@refrakt-md/runes';
					const { loadRunePackage, mergePackages, applyAliases, loadLocalRunes, runes: coreRunes, runeTagMap } = await import(runesPkg);
					const coreRuneNames = new Set(Object.keys(coreRunes));

					let mergedRunes = { ...coreRunes };
					let mergedTags: Record<string, Schema> = {};
					let merged;

					// Load installed packages
					if (hasPackages) {
						const loaded = await Promise.all(
							refraktConfig.packages!.map((name: string) => loadRunePackage(name))
						);
						merged = mergePackages(loaded, coreRuneNames, refraktConfig.runes?.prefer);
						mergedRunes = { ...coreRunes, ...merged.runes };
						mergedTags = merged.tags;
						mergedPackages = merged.packages;
					}

					// Load local runes (highest priority)
					if (hasLocal) {
						const local = await loadLocalRunes(refraktConfig.runes!.local!, resolvedRoot);
						mergedRunes = { ...mergedRunes, ...local.runes };
						mergedTags = { ...mergedTags, ...runeTagMap(local.runes) };
					}

					// Apply config-level aliases
					if (hasAliases && merged) {
						const aliased = applyAliases(
							mergedRunes,
							mergedTags,
							refraktConfig.runes!.aliases!,
							merged.provenance,
						);
						mergedTags = aliased.tags;
					}

					communityTags = Object.keys(mergedTags).length > 0 ? mergedTags : undefined;

					// Assemble theme config for CSS tree-shaking
					if (merged && (Object.keys(merged.themeRunes).length > 0 || Object.keys(merged.themeIcons).length > 0 || Object.keys(merged.themeBackgrounds).length > 0)) {
						const { assembleThemeConfig } = await import('@refrakt-md/transform');
						const { baseConfig } = await import(runesPkg);
						assembledResult = assembleThemeConfig({
							coreConfig: baseConfig,
							packageRunes: merged.themeRunes,
							packageIcons: merged.themeIcons,
							packageBackgrounds: merged.themeBackgrounds,
							provenance: merged.provenance,
						});
					}
				} catch (err) {
					console.warn('[refrakt] Package loading failed:', (err as Error).message);
				}
			}

			if (!isBuild) return;
			if (contentLoaded) return;
			contentLoaded = true;

			try {
				const contentPkg = '@refrakt-md/content';
				const { loadContent, analyzeRuneUsage } = await import(contentPkg);
				const sandboxExamplesDir = refraktConfig.sandbox?.examplesDir
					? resolve(resolvedRoot, refraktConfig.sandbox.examplesDir)
					: undefined;
				const site = await loadContent(
					resolve(resolvedRoot, refraktConfig.contentDir),
					'/',
					undefined,
					communityTags,
					mergedPackages,
					sandboxExamplesDir,
				);

				const { pipelineStats: stats } = site;
				const warnings: PipelineWarning[] = site.pipelineWarnings;
				const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));
				process.stderr.write(`  ${pad('Phase 1: Parse', 30)} ${stats.pageCount} pages\n`);
				process.stderr.write(`  ${pad('Phase 2: Register', 30)} ${stats.entityCount} entities\n`);
				process.stderr.write(`  ${pad('Phase 3: Aggregate', 30)} ${stats.packageCount} packages\n`);
				process.stderr.write(`  ${pad('Phase 4: Post-process', 30)} ${stats.pageCount} pages\n`);
				const errorCount = warnings.filter(w => w.severity === 'error').length;
				const warnCount = warnings.filter(w => w.severity === 'warning').length;
				for (const w of warnings) {
					const icon = w.severity === 'error' ? '✗  error' : w.severity === 'info' ? 'ℹ  info ' : '⚠  warn ';
					const location = w.url ? `  ${w.url}` : '';
					process.stderr.write(`\n  ${icon}  ${w.message}${location}\n`);
				}
				const status = errorCount > 0 ? '✗' : '✓';
				process.stderr.write(`\n  ${status}  Build complete (${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warnCount} warning${warnCount !== 1 ? 's' : ''})\n\n`);

				const report = analyzeRuneUsage(site.pages);

				const themeTransform = await import(`${refraktConfig.theme}/transform`);
				const themeConfig = themeTransform.themeConfig ?? themeTransform.luminaConfig ?? themeTransform.default;
				const effectiveConfig = assembledResult?.config ?? themeConfig;

				usedCssBlocks = new Set<string>();

				// Resolve the theme's root export (index.css) to find the package directory
				const themeEntryUrl = import.meta.resolve(refraktConfig.theme);
				const themeDir = dirname(fileURLToPath(themeEntryUrl));
				const stylesDir = join(themeDir, 'styles', 'runes');

				// Build kebab → config key map (data-rune uses kebab-case, config keys are PascalCase)
				const { toKebabCase } = await import('@refrakt-md/transform');
				const runeKeyMap = new Map(
					Object.keys(effectiveConfig.runes).map(k => [toKebabCase(k), k])
				);

				for (const typeName of report.allTypes) {
					const configKey = runeKeyMap.get(typeName);
					const runeConfig = configKey ? effectiveConfig.runes[configKey] : undefined;
					if (runeConfig && existsSync(join(stylesDir, `${runeConfig.block}.css`))) {
						usedCssBlocks.add(runeConfig.block);
					}
				}

				// Tint is a universal attribute (not a rune), so it never appears
				// in data-rune analysis. Always include its CSS when present.
				if (existsSync(join(stylesDir, 'tint.css'))) {
					usedCssBlocks.add('tint');
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
			const buildCtx: BuildContext = {
				isBuild,
				usedCssBlocks,
				resolvedRoot,
				variables: options.variables,
			};
			return loadVirtualModule(id, refraktConfig, buildCtx);
		},

		configureServer(server) {
			const examplesDir = refraktConfig.sandbox?.examplesDir
				? resolve(resolvedRoot, refraktConfig.sandbox.examplesDir)
				: undefined;
			setupContentHmr(server, refraktConfig.contentDir, examplesDir);
		},
	};
}
