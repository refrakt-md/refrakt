import type { Schema } from '@markdoc/markdoc';
import type { RunePackage } from '@refrakt-md/types';
import { loadContent, type Site } from './site.js';

export interface SiteLoaderOptions {
	dirPath: string;
	basePath?: string;
	icons?: Record<string, Record<string, string>>;
	additionalTags?: Record<string, Schema>;
	packages?: RunePackage[];
	sandboxExamplesDir?: string;
	/** When true, every load() call re-reads from disk (no caching). Default: false. */
	dev?: boolean;
}

export interface SiteLoader {
	/** Returns the Site, using cached result if available. */
	load(): Promise<Site>;
	/** Clears the cached result so the next load() re-reads from disk. */
	invalidate(): void;
}

export function createSiteLoader(options: SiteLoaderOptions): SiteLoader {
	let cached: Promise<Site> | null = null;

	return {
		load() {
			if (!options.dev && cached) return cached;
			const promise = loadContent(
				options.dirPath,
				options.basePath,
				options.icons,
				options.additionalTags,
				options.packages,
				options.sandboxExamplesDir,
			);
			if (!options.dev) cached = promise;
			return promise;
		},
		invalidate() {
			cached = null;
		},
	};
}
