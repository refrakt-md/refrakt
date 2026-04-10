import { resolve } from 'node:path';
import type { LayoutPageData } from '@refrakt-md/transform';
import { renderPage, extractSeoData, seoToHtml } from '@refrakt-md/transform';
import type { RunePackage } from '@refrakt-md/types';
import type { EleventyTheme } from './types.js';
import { hasInteractiveRunes } from './behaviors.js';

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
	/** Pre-serialized JSON context for the #rf-context script element */
	contextJson: string;
	/** Whether this page contains interactive runes needing behavior JS */
	hasInteractiveRunes: boolean;
}

/**
 * Create a global data function for Eleventy.
 *
 * Call this in your `_data/refrakt.js` file:
 *
 *   import { createDataFile } from '@refrakt-md/eleventy';
 *   import manifest from '@refrakt-md/lumina/manifest';
 *   import { layouts } from '@refrakt-md/lumina/layouts';
 *   export default createDataFile({ theme: { manifest, layouts } });
 *
 * Returns an async function that loads content, applies transforms,
 * and produces an array of page objects with pre-rendered HTML.
 */
export function createDataFile(config: {
	theme: EleventyTheme;
	contentDir?: string;
	basePath?: string;
	/** Community rune packages to include in the content pipeline */
	packages?: RunePackage[];
}): () => Promise<EleventyPageData[]> {
	const {
		theme,
		contentDir = './content',
		basePath = '/',
	} = config;

	return async function loadRefrakt(): Promise<EleventyPageData[]> {
		const { loadContent } = await import('@refrakt-md/content');

		const absContentDir = resolve(contentDir);
		const site = await loadContent(
			absContentDir,
			basePath,
			undefined, // icons
			undefined, // additionalTags
			config.packages,
		);

		// Build the pages list for LayoutPageData and RfContext
		const pagesList = site.pages.map((p: any) => ({
			url: p.route.url,
			title: (p.frontmatter?.title as string) ?? '',
			draft: p.route.draft ?? false,
			description: p.frontmatter?.description as string | undefined,
			date: p.frontmatter?.date as string | undefined,
			author: p.frontmatter?.author as string | undefined,
			tags: p.frontmatter?.tags as string[] | undefined,
			image: p.frontmatter?.image as string | undefined,
			version: p.frontmatter?.version as string | undefined,
			versionGroup: p.frontmatter?.versionGroup as string | undefined,
		}));

		return site.pages.map((page: any) => {
			const url = page.route.url;
			const title = (page.frontmatter?.title as string) ?? '';

			// Convert layout regions from Map to Record
			const regions: LayoutPageData['regions'] = {};
			if (page.layout?.regions instanceof Map) {
				for (const [name, region] of page.layout.regions) {
					regions[name] = region;
				}
			}

			const pageData: LayoutPageData = {
				renderable: page.renderable,
				regions,
				title,
				url,
				pages: pagesList,
				frontmatter: page.frontmatter ?? {},
				headings: page.headings,
			};

			const html = renderPage({ theme, page: pageData });
			const needsBehaviors = hasInteractiveRunes(page.renderable);

			const seoData = extractSeoData({
				title,
				frontmatter: page.frontmatter ?? {},
				seo: page.seo,
			});
			const seoHtml = seoToHtml(seoData);
			const seo = { ...seoHtml, description: seoData.description };

			const contextJson = JSON.stringify({
				pages: pagesList,
				currentUrl: url,
			});

			return {
				url,
				title,
				html,
				seo,
				frontmatter: page.frontmatter ?? {},
				contextJson,
				hasInteractiveRunes: needsBehaviors,
			};
		});
	};
}
