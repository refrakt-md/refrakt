import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
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
	const { cssPrefix = '/css', jsPrefix = '/js', contentDir, examplesDir } = options;

	// Passthrough copy theme CSS from node_modules
	if (options.cssFiles) {
		for (const cssFile of options.cssFiles) {
			if (existsSync(cssFile)) {
				eleventyConfig.addPassthroughCopy({
					[localizeCssImports(cssFile, cssPrefix, eleventyConfig)]: join(
						cssPrefix,
						basename(cssFile),
					),
				});
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

/**
 * A browser cannot resolve a bare package `@import` (Lumina's index.css opens
 * with `@import "@refrakt-md/skeleton"`), and a passthrough copy serves the file
 * as written. Copy each imported package's CSS beside the stylesheet, under the
 * package's own name, and point the import there. Returns the file to copy:
 * the original when it has no bare imports, else a rewritten copy.
 */
export function localizeCssImports(
	cssFile: string,
	cssPrefix: string,
	eleventyConfig: any,
): string {
	const css = readFileSync(cssFile, 'utf8');
	const require = createRequire(resolve(cssFile));
	const bare = /@import\s+(["'])([^"'./][^"']*)\1/g;
	let changed = false;
	const rewritten = css.replace(bare, (match, quote: string, pkg: string) => {
		let entry: string;
		try {
			entry = require.resolve(pkg);
		} catch {
			return match;
		}
		if (!entry.endsWith('.css')) return match;
		const dir = basename(pkg);
		const target = join(cssPrefix, dir);
		eleventyConfig.addPassthroughCopy({ [entry]: join(target, basename(entry)) });
		const styles = join(dirname(entry), 'styles');
		if (existsSync(styles)) eleventyConfig.addPassthroughCopy({ [styles]: join(target, 'styles') });
		changed = true;
		return `@import ${quote}./${dir}/${basename(entry)}${quote}`;
	});
	if (!changed) return cssFile;
	const out = resolve('node_modules/.cache/refrakt-eleventy', basename(cssFile));
	mkdirSync(dirname(out), { recursive: true });
	writeFileSync(out, rewritten);
	return out;
}
