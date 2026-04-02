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

export interface SeoHeadProps {
	title?: string;
	description?: string;
	frontmatter?: Record<string, unknown>;
	seo?: PageSeo;
	baseUrl?: string;
}

/**
 * Build HTML strings for SEO meta tags suitable for injection into `<head>`.
 *
 * Returns an object with `title`, `metaTags` (OG + description), and
 * `jsonLd` (structured data script tags).
 */
export function buildSeoHead(props: SeoHeadProps): {
	title: string;
	metaTags: string;
	jsonLd: string;
} {
	const parts: string[] = [];

	const title = props.seo?.og?.title ?? props.title ?? '';

	// Description
	const description = props.seo?.og?.description ?? (props.frontmatter?.description as string | undefined);
	if (description) {
		parts.push(`<meta name="description" content="${escapeAttr(description)}">`);
		parts.push(`<meta property="og:description" content="${escapeAttr(description)}">`);
	}

	// OG title
	if (title) {
		parts.push(`<meta property="og:title" content="${escapeAttr(title)}">`);
	}

	// OG image
	if (props.seo?.og?.image) {
		parts.push(`<meta property="og:image" content="${escapeAttr(props.seo.og.image)}">`);
		parts.push(`<meta name="twitter:card" content="summary_large_image">`);
	}

	// OG URL
	if (props.seo?.og?.url) {
		parts.push(`<meta property="og:url" content="${escapeAttr(props.seo.og.url)}">`);
	}

	// OG type
	if (props.seo?.og?.type) {
		parts.push(`<meta property="og:type" content="${escapeAttr(props.seo.og.type)}">`);
	}

	// JSON-LD
	const jsonLdParts: string[] = [];
	if (props.seo?.jsonLd) {
		for (const schema of props.seo.jsonLd) {
			jsonLdParts.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
		}
	}

	return {
		title,
		metaTags: parts.join('\n'),
		jsonLd: jsonLdParts.join('\n'),
	};
}

function escapeAttr(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
