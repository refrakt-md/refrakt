import { extractSeoData } from '@refrakt-md/transform';
import type { SeoInput, SeoToHtmlOptions } from '@refrakt-md/transform';

/**
 * Combined input shape: per-page SEO (title, frontmatter, seo block) plus
 * site-level options (siteName, baseUrl, defaultImage, logo). Matches the
 * surface every other adapter's SEO helper accepts.
 */
export type RefraktMetadataInput = SeoInput & SeoToHtmlOptions;

/**
 * Transform refrakt page SEO data into a Next.js Metadata object.
 *
 * Use with Next.js App Router's generateMetadata() export:
 *
 *   export async function generateMetadata({ params }) {
 *     const page = await loadPage(params.slug);
 *     return buildMetadata({
 *       title: page.title,
 *       seo: page.seo,
 *       siteName: site.siteName,
 *       baseUrl: site.baseUrl,
 *       defaultImage: site.defaultImage,
 *     });
 *   }
 *
 * When site-level options are supplied:
 * - `metadata.metadataBase` is set to `new URL(baseUrl)` so Next.js
 *   absolutizes relative URLs natively in og:url, canonical, etc.
 * - `metadata.openGraph.siteName` carries the site name
 * - `metadata.openGraph.images` falls back to `[defaultImage]` for pages
 *   without their own image
 */
export function buildMetadata(input: RefraktMetadataInput): Record<string, unknown> {
	const { siteName, baseUrl, defaultImage } = input;
	const data = extractSeoData(input);
	const metadata: Record<string, unknown> = {};

	if (baseUrl) {
		try {
			metadata.metadataBase = new URL(baseUrl);
		} catch {
			// Invalid baseUrl — skip metadataBase rather than throwing.
		}
	}

	if (data.title) metadata.title = data.title;
	if (data.description) metadata.description = data.description;

	const openGraph: Record<string, unknown> = {};
	if (data.title) openGraph.title = data.title;
	if (data.description) openGraph.description = data.description;
	if (siteName) openGraph.siteName = siteName;
	if (data.ogUrl) openGraph.url = data.ogUrl;
	if (data.ogType) openGraph.type = data.ogType;

	const ogImage = data.ogImage ?? defaultImage;
	if (ogImage) openGraph.images = [ogImage];

	if (Object.keys(openGraph).length > 0) metadata.openGraph = openGraph;

	const twitter: Record<string, unknown> = {};
	if (data.title) twitter.title = data.title;
	if (data.description) twitter.description = data.description;
	if (ogImage) {
		twitter.card = 'summary_large_image';
		twitter.images = [ogImage];
	} else {
		twitter.card = 'summary';
	}
	if (Object.keys(twitter).length > 0) metadata.twitter = twitter;

	return metadata;
}

/**
 * Build JSON-LD structured data objects for inclusion in the page head.
 *
 * Page-level JSON-LD entries (from `seo.jsonLd`) come first. When `baseUrl`
 * + `siteName` are supplied, synthetic WebSite and Organization entries are
 * appended — matching the SvelteKit reference's `seoToHtml` output.
 */
export function buildJsonLd(input?: RefraktMetadataInput): object[] {
	if (!input) return [];
	const { siteName, baseUrl, logo } = input;
	const data = extractSeoData(input);
	const entries: object[] = [...data.jsonLd];

	if (baseUrl) {
		const name = siteName ?? '';
		entries.push({
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name,
			url: baseUrl,
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
		entries.push(org);
	}

	return entries;
}
