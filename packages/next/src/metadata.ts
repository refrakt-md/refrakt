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

export interface RefraktMetadataInput {
	title?: string;
	frontmatter?: Record<string, unknown>;
	seo?: PageSeo;
}

/**
 * Transform refrakt page SEO data into a Next.js Metadata object.
 *
 * Use with Next.js App Router's generateMetadata() export:
 *
 *   export async function generateMetadata({ params }) {
 *     const page = await loadPage(params.slug);
 *     return buildMetadata({ title: page.title, seo: page.seo });
 *   }
 */
export function buildMetadata(input: RefraktMetadataInput): Record<string, unknown> {
	const metadata: Record<string, unknown> = {};

	const title = input.seo?.og?.title ?? input.title;
	if (title) metadata.title = title;

	const description = input.seo?.og?.description ?? (input.frontmatter?.description as string | undefined);
	if (description) metadata.description = description;

	const openGraph: Record<string, unknown> = {};
	if (title) openGraph.title = title;
	if (description) openGraph.description = description;
	if (input.seo?.og?.image) {
		openGraph.images = [input.seo.og.image];
	}
	if (input.seo?.og?.url) openGraph.url = input.seo.og.url;
	if (input.seo?.og?.type) openGraph.type = input.seo.og.type;
	if (Object.keys(openGraph).length > 0) metadata.openGraph = openGraph;

	if (input.seo?.og?.image) {
		metadata.twitter = { card: 'summary_large_image' };
	}

	return metadata;
}

/**
 * Build JSON-LD structured data objects for inclusion in the page head.
 */
export function buildJsonLd(seo?: PageSeo): object[] {
	return seo?.jsonLd ?? [];
}
