import { extractSeoData, seoToHtml } from '@refrakt-md/transform';
import type { SeoInput, SeoToHtmlOptions } from '@refrakt-md/transform';

/**
 * Props for {@link buildSeoHead}. Combines page-level SEO input (title,
 * frontmatter, per-page seo block) with site-level options (siteName,
 * baseUrl, defaultImage, logo) — exactly the surface `seoToHtml` accepts.
 */
export type SeoHeadProps = SeoInput & SeoToHtmlOptions;

/**
 * Build HTML strings for SEO meta tags suitable for injection into `<head>`.
 *
 * Returns an object with `title`, `metaTags` (OG + description), and
 * `jsonLd` (structured data script tags).
 *
 * When `siteName`, `baseUrl`, `defaultImage`, or `logo` are passed, the
 * output gains `og:site_name`, absolute canonical URLs, image fallback, and
 * WebSite + Organization JSON-LD entries — matching the SvelteKit reference
 * adapter's output.
 */
export function buildSeoHead(props: SeoHeadProps): {
	title: string;
	metaTags: string;
	jsonLd: string;
} {
	const { title, frontmatter, seo, siteName, baseUrl, defaultImage, logo } = props;
	return seoToHtml(extractSeoData({ title, frontmatter, seo }), {
		...(siteName && { siteName }),
		...(baseUrl && { baseUrl }),
		...(defaultImage && { defaultImage }),
		...(logo && { logo }),
	});
}
