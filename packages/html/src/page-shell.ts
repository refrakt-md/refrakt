import type { RenderPageInput } from './render.js';
import { renderPage } from './render.js';

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
		lang = 'en',
		stylesheets = [],
		scripts = [],
		headExtra = '',
		bodyExtra = '',
		baseUrl,
		siteName,
		defaultImage,
		logo,
		seo,
	} = options;

	const headParts: string[] = [];
	headParts.push('<meta charset="utf-8">');
	headParts.push('<meta name="viewport" content="width=device-width, initial-scale=1">');

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

	// Context data for client-side behaviors
	const contextData = JSON.stringify({
		pages: page.pages,
		currentUrl: page.url,
	});

	// Body
	const bodyContent = renderPage(input);

	// Scripts
	const scriptTags = scripts.map(src => `<script src="${escapeHtml(src)}"></script>`).join('\n');

	return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
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
