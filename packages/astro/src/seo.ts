import { extractSeoData, seoToHtml } from '@refrakt-md/transform';
import type { SeoInput } from '@refrakt-md/transform';

export type SeoHeadProps = SeoInput;

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
	return seoToHtml(extractSeoData(props));
}
