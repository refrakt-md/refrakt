import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { RunePackage, SiteConfig } from '@refrakt-md/types';
import { normalizeRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import { createSiteLoader, type SiteLoader } from './loader.js';
import type { Site } from './site.js';

export interface RefraktLoaderOptions {
	/** Path to refrakt.config.json. Default: './refrakt.config.json' */
	configPath?: string;
	/** Site name to load from a multi-site config. Required when the config
	 *  declares multiple `sites.*`; optional otherwise. */
	site?: string;
	/** Markdoc variables available in content via {% $name %} syntax. */
	variables?: Record<string, unknown>;
	/** Skip caching — re-read on every load(). Default: false. */
	dev?: boolean;
}

export interface RefraktLoader {
	/** Returns the loaded Site (cached unless dev mode). */
	getSite(): Promise<Site>;
	/** Returns the assembled identity transform function. */
	getTransform(): Promise<(tree: any) => any>;
	/** Returns the syntax highlight transform. */
	getHighlightTransform(): Promise<{ (tree: any): any; css: string }>;
	/** Clears the cached site so the next getSite() re-reads from disk. */
	invalidateSite(): void;
}

export function createRefraktLoader(options?: RefraktLoaderOptions): RefraktLoader {
	const configPath = resolve(options?.configPath ?? './refrakt.config.json');
	const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
	// Pass the config file's directory so nested-shape paths absolutize
	// file-relative (matches the SvelteKit plugin's behavior).
	const normalized = normalizeRefraktConfig(rawConfig, { configDir: dirname(configPath) });
	const { site }: { site: SiteConfig } = resolveSite(normalized, options?.site);
	const contentDir = resolve(site.contentDir);

	let _initPromise: Promise<void> | null = null;
	let _transform: ((tree: any) => any) | null = null;
	let _communityTags: Record<string, any> | undefined;
	let _communityPackages: RunePackage[] | undefined;
	let _loader: SiteLoader | null = null;
	let _hl: { (tree: any): any; css: string } | null = null;

	async function init(): Promise<void> {
		if (_initPromise) return _initPromise;
		_initPromise = (async () => {
			// Dynamically import theme transform module
			const themeModule = await import(/* @vite-ignore */ site.theme + '/transform');
			const themeConfig = themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;

			const icons = {
				...themeConfig.icons,
				global: { ...(themeConfig.icons?.global ?? {}), ...(site.icons ?? {}) },
			};

			const { assembleThemeConfig, createTransform } = await import('@refrakt-md/transform');
			const packageNames = site.packages ?? [];

			if (packageNames.length === 0) {
				_transform = createTransform(themeConfig);
			} else {
				const { loadRunePackage, mergePackages, runes: coreRunes } = await import('@refrakt-md/runes');
				const loaded = await Promise.all(
					packageNames.map((name: string) => loadRunePackage(name))
				);
				const coreRuneNames = new Set(Object.keys(coreRunes));
				const merged = mergePackages(loaded, coreRuneNames, site.runes?.prefer);

				_communityTags = Object.keys(merged.tags).length > 0 ? merged.tags : undefined;
				_communityPackages = merged.packages;

				const { config: assembledConfig } = assembleThemeConfig({
					coreConfig: themeConfig,
					packageRunes: merged.themeRunes,
					packageIcons: merged.themeIcons,
					packageBackgrounds: merged.themeBackgrounds,
					extensions: merged.extensions as any,
					provenance: merged.provenance,
				});

				if (site.tints) {
					assembledConfig.tints = { ...assembledConfig.tints, ...site.tints } as any;
				}
				if (site.backgrounds) {
					assembledConfig.backgrounds = { ...assembledConfig.backgrounds, ...site.backgrounds } as any;
				}

				_transform = createTransform(assembledConfig);
			}

			_loader = createSiteLoader({
				dirPath: contentDir,
				basePath: '/',
				icons,
				additionalTags: _communityTags,
				packages: _communityPackages,
				variables: options?.variables,
				dev: options?.dev ?? false,
			});
		})();
		return _initPromise;
	}

	return {
		async getSite(): Promise<Site> {
			await init();
			return _loader!.load();
		},

		async getTransform(): Promise<(tree: any) => any> {
			await init();
			return _transform!;
		},

		async getHighlightTransform(): Promise<{ (tree: any): any; css: string }> {
			if (_hl) return _hl;
			const { createHighlightTransform } = await import('@refrakt-md/highlight');
			_hl = await createHighlightTransform(site.highlight);
			return _hl;
		},

		invalidateSite(): void {
			_loader?.invalidate();
		},
	};
}
