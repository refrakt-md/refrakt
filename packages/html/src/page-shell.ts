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
	/** Base URL for OpenGraph canonical URLs */
	baseUrl?: string;
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
 */
export function renderFullPage(input: RenderPageInput, options: PageShellOptions = {}): string {
	const { page } = input;
	const { lang = 'en', stylesheets = [], scripts = [], headExtra = '', bodyExtra = '', seo } = options;

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

	// OG image
	if (seo?.og?.image) {
		headParts.push(renderOgTag('og:image', seo.og.image));
		headParts.push(renderMetaTag('twitter:card', 'summary_large_image'));
	}

	// OG URL
	if (seo?.og?.url) {
		headParts.push(renderOgTag('og:url', seo.og.url));
	}

	// OG type
	if (seo?.og?.type) {
		headParts.push(renderOgTag('og:type', seo.og.type));
	}

	// JSON-LD
	if (seo?.jsonLd) {
		for (const schema of seo.jsonLd) {
			headParts.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
		}
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
