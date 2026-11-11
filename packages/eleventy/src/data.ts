import { resolve } from 'node:path';
import type { LayoutPageData, SeoToHtmlOptions } from '@refrakt-md/transform';
import { renderPage, extractSeoData, seoToHtml } from '@refrakt-md/transform';
import type { Plugin, SecurityPolicy } from '@refrakt-md/types';
import type { RefraktLoader } from '@refrakt-md/content';
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
	/** The syntax-highlight theme's CSS, for a `<style>` in the page head */
	highlightCss: string;
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
 * Returns an async function that loads the site named by `refrakt.config.json`
 * (its content directory, plugins and theme), applies the identity transform
 * and syntax highlighting, and produces an array of page objects with
 * pre-rendered HTML.
 */
export function createDataFile(config: {
	theme: EleventyTheme;
	/** Path to refrakt.config.json. Default: `./refrakt.config.json`. */
	configPath?: string;
	/** The site to load, when the config declares several. */
	site?: string;
	/** @deprecated Ignored: the content directory comes from `refrakt.config.json`. */
	contentDir?: string;
	/** @deprecated Ignored: plugins come from `refrakt.config.json`. */
	plugins?: Plugin[];
	/** Base URL path every page's route is under. Default: `'/'`. */
	basePath?: string;
	/** Site-level SEO fields surfaced into every page's emitted meta tags. */
	seo?: SeoToHtmlOptions;
	/** Security policy for untrusted author content. Defaults to `'trusted'`. */
	security?: SecurityPolicy;
	/** Markdoc variables available in content via `{% $name %}` syntax. */
	variables?: Record<string, unknown>;
	/** Whether to render the site-wide search UI (header button + Cmd/Ctrl+K). */
	search?: boolean;
}): () => Promise<EleventyPageData[]> {
	const { theme, seo: seoOptions, security, variables, search } = config;
	if (config.contentDir !== undefined || config.plugins !== undefined) {
		console.warn(
			'[refrakt] createDataFile: `contentDir` and `plugins` are ignored; the content directory and plugins come from refrakt.config.json.',
		);
	}

	// `--serve` and `--watch` re-run the data file on every change, so the
	// loader must re-read rather than return its cached site.
	const dev =
		process.env.ELEVENTY_RUN_MODE !== undefined && process.env.ELEVENTY_RUN_MODE !== 'build';
	let loader: Promise<RefraktLoader> | undefined;

	return async function loadRefrakt(): Promise<EleventyPageData[]> {
		loader ??= import('@refrakt-md/content').then(({ createRefraktLoader }) =>
			createRefraktLoader({
				configPath: resolve(config.configPath ?? 'refrakt.config.json'),
				site: config.site,
				basePath: config.basePath,
				variables,
				security,
				dev,
			}),
		);
		const l = await loader;
		const [site, transform, hl] = await Promise.all([
			l.getSite(),
			l.getTransform(),
			l.getHighlightTransform(),
		]);
		const render = (node: unknown) => hl(transform(node));

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

		return site.pages
			.filter((page: any) => !page.route.draft)
			.map((page: any) => {
				const url = page.route.url;
				const title = (page.frontmatter?.title as string) ?? '';
				const renderable = render(page.renderable);

				const regions: LayoutPageData['regions'] = {};
				if (page.layout?.regions instanceof Map) {
					for (const [name, region] of page.layout.regions) {
						regions[name] = { ...region, content: region.content.map(render) };
					}
				}

				const pageData: LayoutPageData = {
					renderable,
					regions,
					title,
					url,
					pages: pagesList,
					frontmatter: page.frontmatter ?? {},
					headings: page.headings,
				};

				const html = renderPage({ theme, page: pageData, search });
				const needsBehaviors = hasInteractiveRunes(renderable);

				const seoData = extractSeoData({
					title,
					frontmatter: page.frontmatter ?? {},
					seo: page.seo,
				});
				const seoHtml = seoToHtml(seoData, seoOptions);
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
					highlightCss: hl.css,
				};
			});
	};
}
