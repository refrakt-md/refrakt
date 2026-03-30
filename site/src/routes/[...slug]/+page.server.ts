import { serialize, serializeTree } from '@refrakt-md/svelte';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSite, getTransform, getHighlightTransform } from '$lib/content';

export const prerender = true;

export const load: PageServerLoad = async ({ params }) => {
	const [site, transform, hl] = await Promise.all([
		getSite(),
		getTransform(),
		getHighlightTransform(),
	]);

	const slug = params.slug || '';
	const url = '/' + slug;

	const page = site.pages.find(p => p.route.url === url);

	if (!page || page.route.draft) {
		error(404, 'Page not found');
	}

	const serialized = serializeTree(page.renderable);
	const renderable = hl(transform(serialized));

	return {
		title: page.frontmatter.title ?? '',
		description: page.frontmatter.description ?? '',
		frontmatter: page.frontmatter,
		renderable,
		regions: Object.fromEntries(
			[...page.layout.regions.entries()].map(([name, region]) => [
				name,
				{ name: region.name, mode: region.mode, content: region.content.map(c => hl(transform(serialize(c)))) }
			])
		),
		seo: page.seo,
		url,
		headings: page.headings,
		highlightCss: hl.css,
	};
};

export async function entries() {
	const site = await getSite();
	return site.pages
		.filter(p => !p.route.draft)
		.map(p => ({ slug: p.route.url === '/' ? '' : p.route.url.slice(1) }));
}
