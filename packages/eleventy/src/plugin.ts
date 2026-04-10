import { existsSync } from 'node:fs';
import type { RefraktEleventyOptions } from './types.js';

/**
 * Eleventy plugin for refrakt.
 *
 * Configures passthrough file copy for theme CSS and optionally
 * behaviors JS from node_modules.
 */
export function refraktPlugin(eleventyConfig: any, options: RefraktEleventyOptions = {}): void {
	const {
		cssPrefix = '/css',
		jsPrefix = '/js',
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
}
