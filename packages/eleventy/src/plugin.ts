import { existsSync } from 'node:fs';
import type { RefraktEleventyOptions } from './types.js';

/**
 * Eleventy plugin for refrakt.
 *
 * Configures passthrough file copy for theme CSS and (optionally) the
 * behaviors JS bundle from `node_modules`, and registers Eleventy watch
 * targets for the content + sandbox-examples directories so `--serve`
 * triggers a rebuild on every `.md` (and example-source) edit.
 *
 * Eleventy's rebuild latency is higher than Vite HMR — the full cross-page
 * pipeline runs each time. That's by design (Eleventy re-imports the data
 * file and discards prior state); content edits are visible after the
 * rebuild completes (~1–2s on a typical site).
 */
export function refraktPlugin(eleventyConfig: any, options: RefraktEleventyOptions = {}): void {
	const {
		cssPrefix = '/css',
		jsPrefix = '/js',
		contentDir,
		examplesDir,
	} = options;

	// Passthrough copy theme CSS from node_modules
	if (options.cssFiles) {
		for (const cssFile of options.cssFiles) {
			if (existsSync(cssFile)) {
				eleventyConfig.addPassthroughCopy({ [cssFile]: cssPrefix });
			}
		}
	}

	// Passthrough copy behaviors JS bundle
	if (options.behaviorFile) {
		if (existsSync(options.behaviorFile)) {
			eleventyConfig.addPassthroughCopy({ [options.behaviorFile]: jsPrefix });
		}
	}

	// Register watch targets for `eleventy --serve`. Eleventy already
	// invalidates the data layer on every rebuild, so the data file's
	// `createRefraktLoader` is re-instantiated from scratch — no manual
	// cache-invalidation hook needed.
	if (contentDir) {
		eleventyConfig.addWatchTarget(contentDir);
	}
	if (examplesDir) {
		eleventyConfig.addWatchTarget(examplesDir);
	}
}
