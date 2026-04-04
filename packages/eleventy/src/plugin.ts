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
	} = options;

	// Passthrough copy Lumina CSS from node_modules
	// Users should configure the specific paths for their theme
	if (options.cssFiles) {
		for (const cssFile of options.cssFiles) {
			if (existsSync(cssFile)) {
				eleventyConfig.addPassthroughCopy({ [cssFile]: cssPrefix });
			}
		}
	}
}
