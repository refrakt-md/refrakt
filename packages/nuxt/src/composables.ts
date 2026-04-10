import { extractSeoData } from '@refrakt-md/transform';
import type { SeoInput } from '@refrakt-md/transform';

export type RefraktMetaInput = SeoInput;

/**
 * Build head meta configuration for use with Nuxt's useHead().
 *
 * Returns an object suitable for passing to useHead() containing
 * title, meta tags (OG, description), and script tags (JSON-LD).
 */
export function buildRefraktHead(input: RefraktMetaInput): {
	title: string;
	meta: Array<{ name?: string; property?: string; content: string }>;
	script: Array<{ type: string; children: string }>;
} {
	const data = extractSeoData(input);
	const meta: Array<{ name?: string; property?: string; content: string }> = [];
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

	if (data.ogImage) {
		meta.push({ property: 'og:image', content: data.ogImage });
		meta.push({ name: 'twitter:card', content: 'summary_large_image' });
		meta.push({ name: 'twitter:image', content: data.ogImage });
	} else {
		meta.push({ name: 'twitter:card', content: 'summary' });
	}

	if (data.ogUrl) {
		meta.push({ property: 'og:url', content: data.ogUrl });
	}

	if (data.ogType) {
		meta.push({ property: 'og:type', content: data.ogType });
	}

	for (const schema of data.jsonLd) {
		script.push({ type: 'application/ld+json', children: JSON.stringify(schema) });
	}

	return { title: data.title, meta, script };
}
