import { loadContent } from '@refrakt-md/content';
import { serialize, serializeTree } from '@refrakt-md/svelte';
import { identityTransform } from '@refrakt-md/lumina/transform';
import { error } from '@sveltejs/kit';
import * as path from 'node:path';
import type { PageServerLoad } from './$types';

const contentDir = path.resolve('content');

export const prerender = true;

export const load: PageServerLoad = async ({ params }) => {
	const site = await loadContent(contentDir);
	const slug = params.slug || '';
	const url = '/' + slug;

	const page = site.pages.find(p => p.route.url === url);

	if (!page || page.route.draft) {
		error(404, 'Page not found');
	}

	const serialized = serializeTree(page.renderable);
	const renderable = identityTransform(serialized);

	return {
		title: page.frontmatter.title ?? '',
		description: page.frontmatter.description ?? '',
		renderable,
		regions: Object.fromEntries(
			[...page.layout.regions.entries()].map(([name, region]) => [
				name,
				{ name: region.name, mode: region.mode, content: region.content.map(c => identityTransform(serialize(c))) }
			])
		),
		seo: page.seo,
		url,
	};
};

export async function entries() {
	const site = await loadContent(contentDir);
	return site.pages
		.filter(p => !p.route.draft)
		.map(p => ({ slug: p.route.url === '/' ? '' : p.route.url.slice(1) }));
}
