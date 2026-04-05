import { resolve } from 'node:path';
import type { LayoutPageData } from '@refrakt-md/transform';
import { renderPage, extractSeoData, seoToHtml } from '@refrakt-md/transform';
import type { EleventyTheme } from './types.js';

export interface EleventyPageData {
	url: string;
	title: string;
	html: string;
	seo: {
		title: string;
		description: string;
		metaTags: string;
		jsonLd: string;
	};
	frontmatter: Record<string, unknown>;
}

/**
 * Create a global data function for Eleventy.
 *
 * Call this in your `_data/refrakt.js` file:
 *
 *   import { createDataFile } from '@refrakt-md/eleventy';
 *   import { theme } from '@refrakt-md/lumina/eleventy';
 *   export default createDataFile({ theme });
 *
 * Returns an async function that loads content, applies transforms,
 * and produces an array of page objects with pre-rendered HTML.
 */
export function createDataFile(config: {
	theme: EleventyTheme;
	contentDir?: string;
	basePath?: string;
	configPath?: string;
}): () => Promise<EleventyPageData[]> {
	const {
		theme,
		contentDir = './content',
		basePath = '/',
	} = config;

	return async function loadRefrakt(): Promise<EleventyPageData[]> {
		const { loadContent } = await import('@refrakt-md/content');

		const absContentDir = resolve(contentDir);
		const site = await loadContent(absContentDir, basePath);

		return site.pages.map((page: any) => {
			const pageData: LayoutPageData = {
				renderable: page.renderable,
				regions: page.regions ?? {},
				title: page.title,
				url: page.url,
				pages: site.pages.map((p: any) => ({
					url: p.url,
					title: p.title,
					draft: p.draft ?? false,
					description: p.frontmatter?.description,
					date: p.frontmatter?.date,
					author: p.frontmatter?.author,
					tags: p.frontmatter?.tags,
					image: p.frontmatter?.image,
				})),
				frontmatter: page.frontmatter ?? {},
				headings: page.headings,
			};

			const html = renderPage({ theme, page: pageData });

			const seoData = extractSeoData({
				title: page.title,
				frontmatter: page.frontmatter ?? {},
				seo: page.seo,
			});
			const seoHtml = seoToHtml(seoData);
			const seo = { ...seoHtml, description: seoData.description };

			return {
				url: page.url,
				title: page.title,
				html,
				seo,
				frontmatter: page.frontmatter ?? {},
			};
		});
	};
}
