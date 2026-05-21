import { dirname, resolve } from 'node:path';
import {
	composeSiteTokensCss,
	loadRefraktConfig,
	resolveSite,
} from '@refrakt-md/transform/node';

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
