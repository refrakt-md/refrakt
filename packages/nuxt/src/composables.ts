import { extractSeoData } from '@refrakt-md/transform';
import type { SeoInput, SeoToHtmlOptions } from '@refrakt-md/transform';

/**
 * Input shape for {@link buildRefraktHead}. Combines page-level SEO input
 * (title, frontmatter, per-page seo block) with site-level options
 * (siteName, baseUrl, defaultImage, logo) — matching the surface every
 * other adapter accepts.
 */
export type RefraktMetaInput = SeoInput & SeoToHtmlOptions;

/**
 * Build head meta configuration for use with Nuxt's useHead().
 *
 * Returns an object suitable for passing to useHead() containing
 * title, meta tags (OG, description, og:site_name), link tags
 * (canonical), and script tags (JSON-LD — including WebSite and
 * Organization entries when `baseUrl` + `siteName` are supplied).
 *
 * When site-level options are passed, the output mirrors what the
 * `seoToHtml` helper emits for the other adapters, so SEO is consistent
 * across the refrakt stack.
 */
export function buildRefraktHead(input: RefraktMetaInput): {
	title: string;
	meta: Array<{ name?: string; property?: string; content: string }>;
	link: Array<{ rel: string; href: string }>;
	script: Array<{ type: string; children: string }>;
} {
	const { siteName, baseUrl, defaultImage, logo } = input;
	const data = extractSeoData(input);
	const meta: Array<{ name?: string; property?: string; content: string }> = [];
	const link: Array<{ rel: string; href: string }> = [];
	const script: Array<{ type: string; children: string }> = [];

	if (data.description) {
		meta.push({ name: 'description', content: data.description });
		meta.push({ property: 'og:description', content: data.description });
		meta.push({ name: 'twitter:description', content: data.description });
	}

	if (data.title) {
		meta.push({ property: 'og:title', content: data.title });
		meta.push({ name: 'twitter:title', content: data.title });
	}

	// OG image — per-page wins; fall back to site-level defaultImage (prefixed
	// with baseUrl if defaultImage isn't already absolute).
	const resolvedImage =
		data.ogImage ?? (defaultImage ? (baseUrl ?? '') + defaultImage : undefined);
	if (resolvedImage) {
		meta.push({ property: 'og:image', content: resolvedImage });
		meta.push({ name: 'twitter:card', content: 'summary_large_image' });
		meta.push({ name: 'twitter:image', content: resolvedImage });
	} else {
		meta.push({ name: 'twitter:card', content: 'summary' });
	}

	// OG url + canonical link — absolutize against baseUrl when supplied.
	if (data.ogUrl) {
		const absoluteUrl = (baseUrl ?? '') + data.ogUrl;
		meta.push({ property: 'og:url', content: absoluteUrl });
		link.push({ rel: 'canonical', href: absoluteUrl });
	}

	if (data.ogType) {
		meta.push({ property: 'og:type', content: data.ogType });
	}

	if (siteName) {
		meta.push({ property: 'og:site_name', content: siteName });
	}

	for (const schema of data.jsonLd) {
		script.push({ type: 'application/ld+json', children: JSON.stringify(schema) });
	}

	// WebSite + Organization JSON-LD when baseUrl is supplied — matches
	// seoToHtml's emission for the other adapters.
	if (baseUrl) {
		const name = siteName ?? '';
		script.push({
			type: 'application/ld+json',
			children: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'WebSite',
				name,
				url: baseUrl,
			}),
		});
		const org: Record<string, string> = {
			'@context': 'https://schema.org',
			'@type': 'Organization',
			name,
			url: baseUrl,
		};
		if (logo) {
			org.logo = baseUrl + logo;
		}
		script.push({ type: 'application/ld+json', children: JSON.stringify(org) });
	}

	return { title: data.title, meta, link, script };
}
