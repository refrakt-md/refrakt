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

export interface RefraktMetaInput {
	title?: string;
	description?: string;
	frontmatter?: Record<string, unknown>;
	seo?: PageSeo;
}

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
	const meta: Array<{ name?: string; property?: string; content: string }> = [];
	const script: Array<{ type: string; children: string }> = [];

	const title = input.seo?.og?.title ?? input.title ?? '';

	const description = input.seo?.og?.description ?? (input.frontmatter?.description as string | undefined);
	if (description) {
		meta.push({ name: 'description', content: description });
		meta.push({ property: 'og:description', content: description });
	}

	if (title) {
		meta.push({ property: 'og:title', content: title });
	}

	if (input.seo?.og?.image) {
		meta.push({ property: 'og:image', content: input.seo.og.image });
		meta.push({ name: 'twitter:card', content: 'summary_large_image' });
	}

	if (input.seo?.og?.url) {
		meta.push({ property: 'og:url', content: input.seo.og.url });
	}

	if (input.seo?.og?.type) {
		meta.push({ property: 'og:type', content: input.seo.og.type });
	}

	if (input.seo?.jsonLd) {
		for (const schema of input.seo.jsonLd) {
			script.push({ type: 'application/ld+json', children: JSON.stringify(schema) });
		}
	}

	return { title, meta, script };
}
