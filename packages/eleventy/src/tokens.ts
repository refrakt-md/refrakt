import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
	composeSiteTokensCss,
	loadRefraktConfig,
	resolveSite,
} from '@refrakt-md/transform/node';

/**
 * Compose the site-level token overrides CSS (SPEC-048 + SPEC-056) and write
 * it to disk at `outputPath`. Designed for Eleventy's build flow — call from
 * `eleventy.config.js` before the build pass starts so the file is on disk in
 * time for `addPassthroughCopy` to ship it into `_site/`.
 *
 * Returns the CSS string (useful if the caller also wants to inline it
 * somewhere). When the site has no overrides the function still creates an
 * empty file at `outputPath`; that way the `<link rel="stylesheet">` in the
 * base template never 404s.
 *
 * @param configPath Path to `refrakt.config.json`.
 * @param outputPath Absolute filesystem path where the CSS file should be
 *                   written.
 * @param siteName   Which site to use from a multi-site config. Required when
 *                   the config declares multiple `sites.*`.
 */
export async function writeSiteTokensCss(
	configPath: string,
	outputPath: string,
	siteName?: string,
): Promise<string> {
	const config = loadRefraktConfig(configPath);
	const { site } = resolveSite(config, siteName);
	const css = await composeSiteTokensCss(site, dirname(configPath));
	mkdirSync(dirname(outputPath), { recursive: true });
	writeFileSync(outputPath, css);
	return css;
}
