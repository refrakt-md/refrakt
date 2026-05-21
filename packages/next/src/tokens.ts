import { dirname, resolve } from 'node:path';
import {
	composeSiteTokensCss,
	loadRefraktConfig,
	resolveSite,
	computeUsedCssBlocks,
	buildUsedCssImports,
} from '@refrakt-md/transform/node';
import { getThemePackage } from '@refrakt-md/types';
import type { Site } from '@refrakt-md/content';

/**
 * Resolve the per-site config from `refrakt.config.json` and compose the
 * site-level token overrides CSS (SPEC-048 presets + tokens + modes, SPEC-056
 * scoped tint projections).
 *
 * Designed to be called at module-scope in a Next.js `app/layout.tsx` Server
 * Component, with the result inlined as a `<style dangerouslySetInnerHTML />`
 * block in `<head>`:
 *
 * ```tsx
 * const siteTokensCss = await getSiteTokensCss();
 * // ...
 * <head>
 *   <style dangerouslySetInnerHTML={{ __html: siteTokensCss }} />
 * </head>
 * ```
 *
 * Returns an empty string when the site uses the legacy string-theme form or
 * declares no overrides — safe to inline either way.
 *
 * For consumers who prefer a linked stylesheet over an inline `<style>`,
 * write the result to `public/site-tokens.css` via a build-time script and
 * reference it with `<link rel="stylesheet" href="/site-tokens.css">`.
 *
 * @param configPath Path to `refrakt.config.json`. Default: `./refrakt.config.json`.
 * @param siteName   Which site to use from a multi-site config. Required when
 *                   the config declares multiple `sites.*`.
 */
export async function getSiteTokensCss(
	configPath = './refrakt.config.json',
	siteName?: string,
): Promise<string> {
	const absConfigPath = resolve(configPath);
	const config = loadRefraktConfig(absConfigPath);
	const { site } = resolveSite(config, siteName);
	return composeSiteTokensCss(site, dirname(absConfigPath));
}

/**
 * Compute the tree-shaken list of CSS module specifiers the site should
 * import — `base.css` first, then one entry per used rune block. Designed
 * for use in a Next.js pre-build script that generates `import` statements
 * for `app/layout.tsx`, or in `next.config.mjs`'s webpack hook.
 *
 * Falls back to the theme package's barrel specifier (`@refrakt-md/lumina`)
 * when rune-usage analysis fails — same graceful-degradation behaviour as
 * the SvelteKit + Astro plugins.
 *
 * ```ts
 * // scripts/generate-css-imports.mjs
 * import { getUsedCssImports } from '@refrakt-md/next';
 * import { writeFileSync } from 'node:fs';
 *
 * const imports = await getUsedCssImports();
 * const code = imports.map(spec => `import '${spec}';`).join('\n');
 * writeFileSync('./app/generated-css-imports.ts', code);
 * ```
 *
 * @param configPath Path to `refrakt.config.json`.
 * @param siteName   Which site to use from a multi-site config.
 */
/**
 * Print the cross-page pipeline's Phase 1/2/3/4 + warnings summary to stderr.
 *
 * Call once from `app/[...slug]/page.tsx` or a setup module so Next.js builds
 * get the same visibility into the content pipeline that the SvelteKit
 * reference adapter prints.
 *
 * Memoise the call site (e.g. via a module-scope flag) — Next will re-evaluate
 * the page module per static-param entry, and you only want one summary.
 */
export function printPipelineSummary(site: Site): void {
	// Resolved lazily so the import surface stays Server-Component-safe.
	void import('@refrakt-md/content').then(({ formatPipelineSummary }) => {
		process.stderr.write(formatPipelineSummary(site.pipelineStats, site.pipelineWarnings));
	});
}

export async function getUsedCssImports(
	configPath = './refrakt.config.json',
	siteName?: string,
): Promise<string[]> {
	const absConfigPath = resolve(configPath);
	const config = loadRefraktConfig(absConfigPath);
	const { site } = resolveSite(config, siteName);
	const themePackage = getThemePackage(site.theme);

	try {
		const { createRefraktLoader, analyzeRuneUsage } = await import('@refrakt-md/content');
		const themeModule = await import(themePackage + '/transform');
		const themeConfig =
			themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;
		const loader = createRefraktLoader({ configPath: absConfigPath, site: siteName });
		const loadedSite = await loader.getSite();
		const report = analyzeRuneUsage(loadedSite.pages);
		const { usedBlocks } = await computeUsedCssBlocks(
			report.allTypes,
			themeConfig,
			themePackage,
		);
		return buildUsedCssImports(themePackage, usedBlocks);
	} catch {
		// Fall back to the theme package barrel — pulls in every rune's CSS,
		// matching the pre-tree-shake behaviour.
		return [themePackage];
	}
}
