import { resolve } from 'node:path';
import type { RendererNode } from '@refrakt-md/types';
import type { LayoutPageData } from '@refrakt-md/transform';
import { layoutTransform, renderToHtml, matchRouteRule } from '@refrakt-md/transform';
import type { EleventyTheme } from './types.js';

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

function escapeAttr(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildSeoHtml(title: string, frontmatter: Record<string, unknown>, seo?: PageSeo): { title: string; description: string; metaTags: string; jsonLd: string } {
	const parts: string[] = [];
	const resolvedTitle = seo?.og?.title ?? title;
	const description = seo?.og?.description ?? (frontmatter?.description as string | undefined) ?? '';

	if (description) {
		parts.push(`<meta name="description" content="${escapeAttr(description)}">`);
		parts.push(`<meta property="og:description" content="${escapeAttr(description)}">`);
	}
	if (resolvedTitle) {
		parts.push(`<meta property="og:title" content="${escapeAttr(resolvedTitle)}">`);
	}
	if (seo?.og?.image) {
		parts.push(`<meta property="og:image" content="${escapeAttr(seo.og.image)}">`);
		parts.push(`<meta name="twitter:card" content="summary_large_image">`);
	}
	if (seo?.og?.url) {
		parts.push(`<meta property="og:url" content="${escapeAttr(seo.og.url)}">`);
	}
	if (seo?.og?.type) {
		parts.push(`<meta property="og:type" content="${escapeAttr(seo.og.type)}">`);
	}

	const jsonLdParts: string[] = [];
	if (seo?.jsonLd) {
		for (const schema of seo.jsonLd) {
			jsonLdParts.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
		}
	}

	return {
		title: resolvedTitle,
		description,
		metaTags: parts.join('\n'),
		jsonLd: jsonLdParts.join('\n'),
	};
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

			// Apply layout transform
			const layoutName = matchRouteRule(page.url, theme.manifest.routeRules ?? []);
			const layoutConfig = theme.layouts[layoutName] ?? theme.layouts['default'];

			let html: string;
			if (layoutConfig) {
				const tree = layoutTransform(layoutConfig, pageData, 'rf');
				html = renderToHtml(tree);
			} else {
				html = renderToHtml(page.renderable as RendererNode);
			}

			const seo = buildSeoHtml(page.title, page.frontmatter ?? {}, page.seo);

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
