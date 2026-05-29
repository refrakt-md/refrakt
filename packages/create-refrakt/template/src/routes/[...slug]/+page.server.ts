import { getSite, getTransform, getHighlightTransform } from 'virtual:refrakt/content';
import { serialize, serializeTree } from '@refrakt-md/svelte';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = async ({ params }) => {
	const [site, transform, hl] = await Promise.all([
		getSite(),
		getTransform(),
		getHighlightTransform(),
	]);

	const slug = params.slug || '';
	const url = '/' + slug;

	// Contributed pages from `entityRoutes` typically end with a trailing
	// slash (e.g. `/specs/SPEC-001/`); file-backed pages don't. Try both so
	// either convention resolves.
	const page =
		site.pages.find(p => p.route.url === url) ??
		site.pages.find(p => p.route.url === url + '/') ??
		site.pages.find(p => p.route.url === url.replace(/\/$/, ''));

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
		.map(p => {
			// Strip both leading and trailing slashes — SvelteKit rejects
			// slugs that start or end with `/`. entityRoutes URLs are
			// trailing-slashed by convention; file-backed URLs aren't.
			const stripped = p.route.url.replace(/^\/+|\/+$/g, '');
			return { slug: stripped };
		});
}
