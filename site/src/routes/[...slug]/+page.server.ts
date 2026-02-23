import { loadContent } from '@refrakt-md/content';
import { serialize, serializeTree } from '@refrakt-md/svelte';
import { identityTransform, luminaConfig } from '@refrakt-md/lumina/transform';
import { createHighlightTransform } from '@refrakt-md/highlight';
import type { HighlightTransform } from '@refrakt-md/highlight';
import { error } from '@sveltejs/kit';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type { PageServerLoad } from './$types';
import type { RefraktConfig } from '@refrakt-md/types';
import { siteIcons } from '$lib/icons.js';

const config: RefraktConfig = JSON.parse(readFileSync(path.resolve('refrakt.config.json'), 'utf-8'));
const contentDir = path.resolve(config.contentDir);
const icons = {
	...luminaConfig.icons,
	global: { ...luminaConfig.icons.global, ...siteIcons },
};

let _hl: HighlightTransform | null = null;

async function getHighlightTransform(): Promise<HighlightTransform> {
	const cached = _hl;
	if (cached) return cached;
	const hl = await createHighlightTransform(config.highlight);
	_hl = hl;
	return hl;
}

export const prerender = true;

export const load: PageServerLoad = async ({ params }) => {
	const site = await loadContent(contentDir, '/', icons);
	const hl = await getHighlightTransform();
	const slug = params.slug || '';
	const url = '/' + slug;

	const page = site.pages.find(p => p.route.url === url);

	if (!page || page.route.draft) {
		error(404, 'Page not found');
	}

	const serialized = serializeTree(page.renderable);
	const renderable = hl(identityTransform(serialized));

	return {
		title: page.frontmatter.title ?? '',
		description: page.frontmatter.description ?? '',
		frontmatter: page.frontmatter,
		renderable,
		regions: Object.fromEntries(
			[...page.layout.regions.entries()].map(([name, region]) => [
				name,
				{ name: region.name, mode: region.mode, content: region.content.map(c => hl(identityTransform(serialize(c)))) }
			])
		),
		seo: page.seo,
		url,
		highlightCss: hl.css,
	};
};

export async function entries() {
	const site = await loadContent(contentDir, '/', icons);
	return site.pages
		.filter(p => !p.route.draft)
		.map(p => ({ slug: p.route.url === '/' ? '' : p.route.url.slice(1) }));
}
