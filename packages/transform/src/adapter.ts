import type { RendererNode, SerializedTag, ThemeManifest } from '@refrakt-md/types';
import type { LayoutConfig, LayoutPageData } from './types.js';
import { layoutTransform } from './layout.js';
import { renderToHtml } from './html.js';
import { matchRouteRule } from './route-rules.js';

// ─── Theme type ──────────────────────────────────────────────────────

/**
 * Base theme definition shared by all non-Svelte adapters.
 *
 * Adapters that render via `renderToHtml()` (Astro, Nuxt, Next.js, Eleventy)
 * all use this same shape — a manifest plus a map of layout configs.
 */
export interface AdapterTheme {
	manifest: ThemeManifest;
	layouts: Record<string, LayoutConfig>;
}

// ─── Page rendering ──────────────────────────────────────────────────

export interface RenderPageInput {
	theme: AdapterTheme;
	page: LayoutPageData;
}

/**
 * Render a page to an HTML string using the layout transform.
 *
 * Resolves layout from route rules, applies the layout transform,
 * and produces the final HTML string.
 */
export function renderPage(input: RenderPageInput): string {
	const { theme, page } = input;
	const layoutName = matchRouteRule(page.url, theme.manifest.routeRules ?? []);
	const layoutConfig = theme.layouts[layoutName] ?? theme.layouts['default'];

	if (!layoutConfig) {
		return renderToHtml(page.renderable as RendererNode);
	}

	const tree = layoutTransform(layoutConfig, page, 'rf');
	return renderToHtml(tree);
}

// ─── Behavior detection ──────────────────────────────────────────────

/**
 * Check whether a rendered tree contains runes matching the given set.
 *
 * Walks the tree looking for `data-rune` attributes whose value is in
 * `runeNames`, or for `data-layout-behaviors` attributes.
 *
 * Adapters call this with `getBehaviorNames()` from `@refrakt-md/behaviors`
 * to detect interactive runes without creating a dependency from transform
 * to behaviors.
 */
export function hasMatchingRunes(node: RendererNode, runeNames: Set<string>): boolean {
	if (node === null || node === undefined || typeof node === 'string' || typeof node === 'number') {
		return false;
	}
	if (Array.isArray(node)) {
		return node.some(child => hasMatchingRunes(child as RendererNode, runeNames));
	}
	const tag = node as SerializedTag;
	if (tag.attributes) {
		const runeType = tag.attributes['data-rune'] as string | undefined;
		if (runeType && runeNames.has(runeType)) {
			return true;
		}
		if (tag.attributes['data-layout-behaviors']) {
			return true;
		}
	}
	if (tag.children) {
		return tag.children.some(child => hasMatchingRunes(child as RendererNode, runeNames));
	}
	return false;
}

// ─── SEO extraction ──────────────────────────────────────────────────

export interface OgMeta {
	title?: string;
	description?: string;
	image?: string;
	type?: string;
	url?: string;
}

export interface PageSeo {
	jsonLd: object[];
	og: OgMeta;
}

export interface SeoInput {
	title?: string;
	frontmatter?: Record<string, unknown>;
	seo?: PageSeo;
}

/** Framework-agnostic SEO data extracted from a page. */
export interface SeoData {
	title: string;
	description: string;
	ogImage?: string;
	ogUrl?: string;
	ogType?: string;
	jsonLd: object[];
}

/**
 * Extract SEO data from a page into a framework-agnostic intermediate.
 *
 * Each adapter formats this into its native head API:
 * - Astro/Eleventy: HTML meta tag strings via `seoToHtml()`
 * - Nuxt: `useHead()` objects
 * - Next.js: Metadata objects
 */
export function extractSeoData(input: SeoInput): SeoData {
	const title = input.seo?.og?.title ?? input.title ?? '';
	const description = input.seo?.og?.description ?? (input.frontmatter?.description as string | undefined) ?? '';

	return {
		title,
		description,
		ogImage: input.seo?.og?.image,
		ogUrl: input.seo?.og?.url,
		ogType: input.seo?.og?.type,
		jsonLd: input.seo?.jsonLd ?? [],
	};
}

export interface SeoToHtmlOptions {
	/** Site name for og:site_name (falls back to empty string if omitted) */
	siteName?: string;
	/** Base URL for canonical links and og:url (e.g. "https://refrakt.md") */
	baseUrl?: string;
	/** Default og:image for pages without their own image (path relative to site root, e.g. "/favicon-192.png") */
	defaultImage?: string;
}

/**
 * Format extracted SEO data as HTML meta tag strings.
 *
 * Used by Astro and Eleventy adapters that inject raw HTML into `<head>`.
 */
export function seoToHtml(data: SeoData, options?: SeoToHtmlOptions): { title: string; metaTags: string; jsonLd: string } {
	const parts: string[] = [];

	if (data.description) {
		parts.push(`<meta name="description" content="${escapeAttr(data.description)}">`);
		parts.push(`<meta property="og:description" content="${escapeAttr(data.description)}">`);
		parts.push(`<meta name="twitter:description" content="${escapeAttr(data.description)}">`);
	}

	if (data.title) {
		parts.push(`<meta property="og:title" content="${escapeAttr(data.title)}">`);
		parts.push(`<meta name="twitter:title" content="${escapeAttr(data.title)}">`);
	}

	const resolvedImage = data.ogImage ?? (options?.defaultImage ? (options.baseUrl ?? '') + options.defaultImage : undefined);
	if (resolvedImage) {
		parts.push(`<meta property="og:image" content="${escapeAttr(resolvedImage)}">`);
		parts.push(`<meta name="twitter:card" content="summary_large_image">`);
		parts.push(`<meta name="twitter:image" content="${escapeAttr(resolvedImage)}">`);
	} else {
		parts.push(`<meta name="twitter:card" content="summary">`);
	}

	if (data.ogUrl) {
		const absoluteUrl = (options?.baseUrl ?? '') + data.ogUrl;
		parts.push(`<link rel="canonical" href="${escapeAttr(absoluteUrl)}">`);
		parts.push(`<meta property="og:url" content="${escapeAttr(absoluteUrl)}">`);
	}

	if (data.ogType) {
		parts.push(`<meta property="og:type" content="${escapeAttr(data.ogType)}">`);
	}

	if (options?.siteName) {
		parts.push(`<meta property="og:site_name" content="${escapeAttr(options.siteName)}">`);
	}

	const jsonLdParts: string[] = [];
	for (const schema of data.jsonLd) {
		jsonLdParts.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
	}

	if (options?.baseUrl) {
		const siteName = options.siteName ?? '';
		jsonLdParts.push(`<script type="application/ld+json">${JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: siteName,
			url: options.baseUrl,
		})}</script>`);
		const org: Record<string, string> = {
			'@context': 'https://schema.org',
			'@type': 'Organization',
			name: siteName,
			url: options.baseUrl,
		};
		if (options.defaultImage) {
			org.logo = options.baseUrl + options.defaultImage;
		}
		jsonLdParts.push(`<script type="application/ld+json">${JSON.stringify(org)}</script>`);
	}

	return {
		title: data.title,
		metaTags: parts.join('\n'),
		jsonLd: jsonLdParts.join('\n'),
	};
}

// ─── Utilities ───────────────────────────────────────────────────────

/** Escape a string for use in an HTML attribute value. */
export function escapeAttr(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** List of core @refrakt-md packages that bundlers typically need to transpile/mark as noExternal. */
export const CORE_PACKAGES = [
	'@markdoc/markdoc',
	'@refrakt-md/runes',
	'@refrakt-md/content',
	'@refrakt-md/types',
	'@refrakt-md/transform',
] as const;
