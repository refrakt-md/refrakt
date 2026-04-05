import { extractSeoData } from '@refrakt-md/transform';
import type { SeoInput } from '@refrakt-md/transform';

export type RefraktMetadataInput = SeoInput;

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
	const data = extractSeoData(input);
	const metadata: Record<string, unknown> = {};

	if (data.title) metadata.title = data.title;
	if (data.description) metadata.description = data.description;

	const openGraph: Record<string, unknown> = {};
	if (data.title) openGraph.title = data.title;
	if (data.description) openGraph.description = data.description;
	if (data.ogImage) openGraph.images = [data.ogImage];
	if (data.ogUrl) openGraph.url = data.ogUrl;
	if (data.ogType) openGraph.type = data.ogType;
	if (Object.keys(openGraph).length > 0) metadata.openGraph = openGraph;

	if (data.ogImage) {
		metadata.twitter = { card: 'summary_large_image' };
	}

	return metadata;
}

/**
 * Build JSON-LD structured data objects for inclusion in the page head.
 */
export function buildJsonLd(input?: SeoInput): object[] {
	if (!input) return [];
	return extractSeoData(input).jsonLd;
}
