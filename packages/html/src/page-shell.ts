import type { RenderPageInput } from './render.js';
import { renderPage } from './render.js';
import {
	prePaintScript,
	htmlTintAttributes,
	colorSchemeMetaContent,
	type ResolvedTintCascade,
} from '@refrakt-md/content';
import { collectBehaviorStrings, resolveDocumentLang, type LocaleContext } from '@refrakt-md/transform';

const PRE_PAINT_SCRIPT = prePaintScript();
const DEFAULT_CASCADE: ResolvedTintCascade = { tint: null, tintMode: 'auto', locked: false };

interface OgMeta {
	title?: string;
	description?: string;
	image?: string;
	type?: string;
	url?: string;
}

interface PageSeo {
	jsonLd: object[];
	og: OgMeta;
}

export interface PageShellOptions {
	/** CSS stylesheet URLs to include in <head> */
	stylesheets?: string[];
	/** JavaScript URLs to include before </body> */
	scripts?: string[];
	/** Extra HTML to inject into <head> */
	headExtra?: string;
	/** Extra HTML to inject before </body> (inline scripts, etc.) */
	bodyExtra?: string;
	/** HTML lang attribute (default: "en") */
	lang?: string;
	/** SPEC-035 — render-scoped locale slice. Drives the inline `<meta
	 *  name="rf-locale">` + `<script id="rf-strings">` behavior-string block
	 *  (Zone 5) so client behaviors localize synchronously without a fetch.
	 *  Omit for English (nothing emitted; output unchanged). */
	locale?: LocaleContext;
	/** Base URL for OpenGraph canonical URLs (e.g. "https://refrakt.md") */
	baseUrl?: string;
	/** Human-readable site name for og:site_name and JSON-LD entries */
	siteName?: string;
	/** Default og:image for pages without their own image (path relative to site root) */
	defaultImage?: string;
	/** Site logo for Organization JSON-LD schema */
	logo?: string;
	/** SEO metadata extracted from the page */
	seo?: PageSeo;
	/** Per-page tint cascade (SPEC-073). Drives the no-flash `<html>` tint
	 *  attributes + `color-scheme` meta. Absent → unlocked/auto default. The
	 *  anti-FOIT pre-paint script is injected regardless. */
	tintCascade?: ResolvedTintCascade;
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMetaTag(name: string, content: string): string {
	return `<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">`;
}

function renderOgTag(property: string, content: string): string {
	return `<meta property="${escapeHtml(property)}" content="${escapeHtml(content)}">`;
}

/**
 * Render a complete HTML document from page data.
 *
 * Produces a full `<!DOCTYPE html>` page with:
 * - `<head>` containing title, meta description, OG tags, JSON-LD, stylesheets
 * - `<body>` containing the rendered page content
 * - Script tags for behaviors
 *
 * When site-level options (`siteName`, `baseUrl`, `defaultImage`, `logo`) are
 * supplied, the output gains `og:site_name`, absolute canonical URLs, image
 * fallback, and WebSite + Organization JSON-LD entries — matching the
 * SvelteKit reference adapter's output.
 */
export function renderFullPage(input: RenderPageInput, options: PageShellOptions = {}): string {
	const { page } = input;
	const {
		locale,
		stylesheets = [],
		scripts = [],
		headExtra = '',
		bodyExtra = '',
		baseUrl,
		siteName,
		defaultImage,
		logo,
		seo,
		tintCascade = DEFAULT_CASCADE,
	} = options;

	// SPEC-035 Zone 8 — the document lang follows the configured locale
	// (explicit `lang` option still wins for callers that set it directly).
	const lang = options.lang ?? resolveDocumentLang(locale?.locale);

	const headParts: string[] = [];
	headParts.push('<meta charset="utf-8">');
	headParts.push('<meta name="viewport" content="width=device-width, initial-scale=1">');

	// No-flash theme chrome (SPEC-073): the color-scheme meta + anti-FOIT
	// pre-paint script go early, before any stylesheet, so the saved theme is
	// applied before first paint. Tint attrs go on <html> below.
	headParts.push(`<meta name="color-scheme" content="${escapeHtml(colorSchemeMetaContent(tintCascade))}">`);
	headParts.push(`<script>${PRE_PAINT_SCRIPT}</script>`);

	// Title
	const title = seo?.og?.title ?? page.title;
	if (title) {
		headParts.push(`<title>${escapeHtml(title)}</title>`);
		headParts.push(renderOgTag('og:title', title));
	}

	// Description
	const description = seo?.og?.description ?? (page.frontmatter?.description as string | undefined);
	if (description) {
		headParts.push(renderMetaTag('description', description));
		headParts.push(renderOgTag('og:description', description));
	}

	// OG image — per-page wins; fall back to defaultImage (prefixed with
	// baseUrl when defaultImage isn't already absolute).
	const resolvedImage =
		seo?.og?.image ?? (defaultImage ? (baseUrl ?? '') + defaultImage : undefined);
	if (resolvedImage) {
		headParts.push(renderOgTag('og:image', resolvedImage));
		headParts.push(renderMetaTag('twitter:card', 'summary_large_image'));
		headParts.push(renderMetaTag('twitter:image', resolvedImage));
	} else {
		headParts.push(renderMetaTag('twitter:card', 'summary'));
	}

	// OG URL + canonical link — absolutize against baseUrl when supplied.
	if (seo?.og?.url) {
		const absoluteUrl = (baseUrl ?? '') + seo.og.url;
		headParts.push(`<link rel="canonical" href="${escapeHtml(absoluteUrl)}">`);
		headParts.push(renderOgTag('og:url', absoluteUrl));
	}

	// OG type
	if (seo?.og?.type) {
		headParts.push(renderOgTag('og:type', seo.og.type));
	}

	// og:site_name
	if (siteName) {
		headParts.push(renderOgTag('og:site_name', siteName));
	}

	// JSON-LD
	if (seo?.jsonLd) {
		for (const schema of seo.jsonLd) {
			headParts.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
		}
	}

	// WebSite + Organization JSON-LD when baseUrl is supplied — matches the
	// seoToHtml helper's emission for the other adapters.
	if (baseUrl) {
		const name = siteName ?? '';
		headParts.push(
			`<script type="application/ld+json">${JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'WebSite',
				name,
				url: baseUrl,
			})}</script>`,
		);
		const org: Record<string, string> = {
			'@context': 'https://schema.org',
			'@type': 'Organization',
			name,
			url: baseUrl,
		};
		if (logo) {
			org.logo = baseUrl + logo;
		}
		headParts.push(`<script type="application/ld+json">${JSON.stringify(org)}</script>`);
	}

	// Stylesheets
	for (const href of stylesheets) {
		headParts.push(`<link rel="stylesheet" href="${escapeHtml(href)}">`);
	}

	// Extra head content
	if (headExtra) {
		headParts.push(headExtra);
	}

	// SPEC-035 Zone 5 — inline behavior-string delivery (Decision D4). Emit the
	// active-locale marker + a JSON block of the `behavior.*` strings so client
	// behaviors localize synchronously with no fetch. Nothing is emitted for the
	// English default (empty block → client behaviors use their English floor).
	if (locale && locale.locale && locale.locale !== 'en') {
		headParts.push(renderMetaTag('rf-locale', locale.locale));
	}
	if (locale) {
		const behaviorStrings = collectBehaviorStrings(locale);
		if (Object.keys(behaviorStrings).length > 0) {
			// `</script>` in a value would break out of the block; escape the slash.
			const json = JSON.stringify(behaviorStrings).replace(/</g, '\\u003c');
			headParts.push(`<script type="application/json" id="rf-strings">${json}</script>`);
		}
	}

	// Context data for client-side behaviors
	const contextData = JSON.stringify({
		pages: page.pages,
		currentUrl: page.url,
	});

	// Body
	const bodyContent = renderPage(input);

	// Scripts
	const scriptTags = scripts.map(src => `<script src="${escapeHtml(src)}"></script>`).join('\n');

	// Tint attrs (data-theme / data-tint / data-tint-lock) on <html>, matching
	// the SvelteKit adapter's SSR output.
	const htmlAttrs = htmlTintAttributes(tintCascade);
	const htmlTag = htmlAttrs ? `<html lang="${escapeHtml(lang)}" ${htmlAttrs}>` : `<html lang="${escapeHtml(lang)}">`;

	return `<!DOCTYPE html>
${htmlTag}
<head>
${headParts.join('\n')}
</head>
<body>
${bodyContent}
<script type="application/json" id="rf-context">${contextData}</script>
${scriptTags}
${bodyExtra}
</body>
</html>`;
}
