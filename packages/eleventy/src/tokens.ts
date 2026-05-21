import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import {
	composeSiteTokensCss,
	computeUsedCssBlocks,
	loadRefraktConfig,
	resolveSite,
} from '@refrakt-md/transform/node';
import { getThemePackage } from '@refrakt-md/types';

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

/**
 * Compute the per-rune CSS files actually used by the site, returning a
 * `Record<string, string>` shaped for Eleventy's `addPassthroughCopy` —
 * keys are source paths (relative to the project root) and values are the
 * `/css/styles/runes/<block>.css` target paths.
 *
 * Use in `eleventy.config.js` to ship only the rune blocks the corpus uses,
 * instead of the theme's entire `styles/` directory:
 *
 * ```js
 * import { getUsedCssCopyMap } from '@refrakt-md/eleventy';
 * import { resolve } from 'node:path';
 *
 * const usedCss = await getUsedCssCopyMap(resolve('refrakt.config.json'));
 *
 * export default function (eleventyConfig) {
 *   eleventyConfig.addPlugin(refraktPlugin, { ... });
 *   eleventyConfig.addPassthroughCopy(usedCss);
 *   // ...
 * }
 * ```
 *
 * Pair with `<link>` tags in your base template — one per used block —
 * generated from `getUsedCssImports` (also exported from this module).
 *
 * @param configPath Path to `refrakt.config.json`.
 * @param siteName   Which site to use from a multi-site config.
 * @param projectRoot Directory the source paths should be relative to.
 *                    Default: directory of `configPath`.
 */
export async function getUsedCssCopyMap(
	configPath: string,
	siteName?: string,
	projectRoot?: string,
): Promise<Record<string, string>> {
	const blocks = await getUsedCssBlocksInternal(configPath, siteName);
	if (!blocks) return {};
	const root = projectRoot ?? dirname(configPath);
	const map: Record<string, string> = {};
	for (const block of blocks.usedBlocks) {
		const src = join(blocks.stylesDir, `${block}.css`);
		map[relative(root, src) || src] = `/css/styles/runes/${block}.css`;
	}
	// Also copy the theme's base.css — every page needs it.
	const baseCss = resolve(blocks.themeDir, 'base.css');
	map[relative(root, baseCss) || baseCss] = `/css/base.css`;
	return map;
}

/**
 * Return the ordered list of href values to emit as `<link rel="stylesheet">`
 * in the base template — `/css/base.css` first, then one entry per used
 * rune block. Pairs with {@link getUsedCssCopyMap}.
 */
export async function getUsedCssImports(
	configPath: string,
	siteName?: string,
): Promise<string[]> {
	const blocks = await getUsedCssBlocksInternal(configPath, siteName);
	if (!blocks) return ['/css/index.css'];
	const hrefs = ['/css/base.css'];
	for (const block of [...blocks.usedBlocks].sort()) {
		hrefs.push(`/css/styles/runes/${block}.css`);
	}
	return hrefs;
}

async function getUsedCssBlocksInternal(
	configPath: string,
	siteName?: string,
): Promise<{ usedBlocks: Set<string>; stylesDir: string; themeDir: string } | undefined> {
	try {
		const config = loadRefraktConfig(configPath);
		const { site } = resolveSite(config, siteName);
		const themePackage = getThemePackage(site.theme);
		const { createRefraktLoader, analyzeRuneUsage } = await import('@refrakt-md/content');
		const themeModule = await import(themePackage + '/transform');
		const themeConfig =
			themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;
		const loader = createRefraktLoader({ configPath, site: siteName });
		const loadedSite = await loader.getSite();
		const report = analyzeRuneUsage(loadedSite.pages);
		const { usedBlocks, stylesDir } = await computeUsedCssBlocks(
			report.allTypes,
			themeConfig,
			themePackage,
		);
		const themeEntryUrl = import.meta.resolve(themePackage);
		const themeDir = dirname(fileURLToPath(themeEntryUrl));
		return { usedBlocks, stylesDir, themeDir };
	} catch {
		return undefined;
	}
}
