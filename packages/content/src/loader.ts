import type { Schema } from '@markdoc/markdoc';
import type { Plugin, SecurityPolicy } from '@refrakt-md/types';
import type { CompiledXrefPattern } from '@refrakt-md/runes';
import { loadContent, loadContentFromTree, type Site, type VirtualReader } from './site.js';
import type { ContentTree } from './content-tree.js';

export interface SiteLoaderOptions {
	dirPath: string;
	basePath?: string;
	icons?: Record<string, Record<string, string>>;
	additionalTags?: Record<string, Schema>;
	plugins?: Plugin[];
	sandboxExamplesDir?: string;
	/** Site-wide Markdoc variables available in content via {% $name %} syntax. */
	variables?: Record<string, unknown>;
	/** Security policy for untrusted author content. Default: `'trusted'`. */
	securityPolicy?: SecurityPolicy;
	/** Absolute path to the project root (where `refrakt.config.json` lives).
	 *  Used to compute `$file.path` as a project-root-relative POSIX path.
	 *  When omitted, defaults to `dirPath`'s parent — adapters that resolve a
	 *  config file should pass `dirname(configPath)` explicitly. */
	projectRoot?: string;
	/** Compiled xref patterns from `refrakt.config.json#/xrefs`. Adapters
	 *  that read the config should compile via `compileXrefPatterns` and
	 *  pass the result here. */
	xrefPatterns?: CompiledXrefPattern[];
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
				options.plugins,
				options.sandboxExamplesDir,
				options.variables,
				options.securityPolicy,
				options.projectRoot,
				options.xrefPatterns,
			);
			if (!options.dev) cached = promise;
			return promise;
		},
		invalidate() {
			cached = null;
		},
	};
}

export interface VirtualSiteLoaderOptions {
	/** Pre-built content tree. The page corpus, layouts, and partials are read
	 *  from here — there is no filesystem fallback. */
	tree: ContentTree;
	basePath?: string;
	icons?: Record<string, Record<string, string>>;
	additionalTags?: Record<string, Schema>;
	plugins?: Plugin[];
	/** Site-wide Markdoc variables available in content via {% $name %} syntax. */
	variables?: Record<string, unknown>;
	/** Security policy for sandbox runes. Default: `'trusted'`. */
	securityPolicy?: SecurityPolicy;
	/** Optional async reader for ad-hoc lookups. Forward-compatibility hook —
	 *  see `LoadContentFromTreeOptions.reader` for details. */
	reader?: VirtualReader;
	/** Absolute path to the project root (where `refrakt.config.json` lives).
	 *  Used to compute `$file.path` as a project-root-relative POSIX path. */
	projectRoot?: string;
	/** Compiled xref patterns from `refrakt.config.json#/xrefs`. */
	xrefPatterns?: CompiledXrefPattern[];
	/** When true, every load() call re-runs the pipeline against the current
	 *  tree (no caching). Use when the host swaps the tree's contents in place. */
	dev?: boolean;
}

/**
 * Site loader for hosted (non-filesystem) environments. Wraps
 * {@link loadContentFromTree} with the same caching semantics as
 * {@link createSiteLoader}: the result is memoized until `invalidate()` is
 * called, unless `dev: true`.
 */
export function createVirtualSiteLoader(options: VirtualSiteLoaderOptions): SiteLoader {
	let cached: Promise<Site> | null = null;

	return {
		load() {
			if (!options.dev && cached) return cached;
			const promise = loadContentFromTree(options.tree, {
				basePath: options.basePath,
				icons: options.icons,
				additionalTags: options.additionalTags,
				plugins: options.plugins,
				variables: options.variables,
				securityPolicy: options.securityPolicy,
				reader: options.reader,
				projectRoot: options.projectRoot,
				xrefPatterns: options.xrefPatterns,
			});
			if (!options.dev) cached = promise;
			return promise;
		},
		invalidate() {
			cached = null;
		},
	};
}
