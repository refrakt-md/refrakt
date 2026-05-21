import { createRefraktLoader } from '@refrakt-md/content';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import { getThemePackage } from '@refrakt-md/types';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const configPath = resolve('refrakt.config.json');
const config = loadRefraktConfig(configPath);
const { site } = resolveSite(config);

const loader = createRefraktLoader({ configPath });

export const getTransform = () => loader.getTransform();
export const getHighlightTransform = () => loader.getHighlightTransform();
export const getSite = () => loader.getSite();

/** Site-level SEO fields surfaced for `buildSeoHead`. Read once from refrakt.config.json. */
export const seoSiteFields = {
	siteName: site.siteName,
	baseUrl: site.baseUrl,
	defaultImage: site.defaultImage,
	logo: site.logo,
};

/**
 * Build the AstroTheme `{ manifest, layouts }` shape for `renderPage`.
 *
 * Loads the theme package's manifest + layouts and bakes site-level fields
 * (`routeRules`, `siteName`, `baseUrl`, `defaultImage`, `logo`) into the
 * manifest so the SEO and route-resolution paths have what they need.
 *
 * Memoised — the theme is resolved once per process.
 */
let _theme: { manifest: any; layouts: any } | null = null;
export async function getTheme() {
	if (_theme) return _theme;

	const themePackage = getThemePackage(site.theme);
	const layouts = (await import(themePackage + '/layouts')).layouts;

	const manifestPath = createRequire(import.meta.url).resolve(themePackage + '/manifest');
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

	_theme = {
		manifest: {
			...manifest,
			routeRules: site.routeRules ?? [{ pattern: '**', layout: 'default' }],
			...(site.siteName && { siteName: site.siteName }),
			...(site.baseUrl && { baseUrl: site.baseUrl }),
			...(site.defaultImage && { defaultImage: site.defaultImage }),
			...(site.logo && { logo: site.logo }),
		},
		layouts,
	};
	return _theme;
}
