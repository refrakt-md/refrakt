import { serialize, serializeTree } from '@refrakt-md/svelte';
import { error, redirect } from '@sveltejs/kit';
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

	// entityRoutes URLs are trailing-slashed (`/specs/SPEC-071/`) but our
	// slug-strip removes them, so try both. File-backed dashboards use
	// trailing-slash-less URLs (`/work`, `/`).
	const page =
		site.pages.find((p) => p.route.url === url) ??
		site.pages.find((p) => p.route.url === url + '/') ??
		site.pages.find((p) => p.route.url === url.replace(/\/$/, ''));

	if (!page || page.route.draft) {
		error(404, 'Page not found');
	}

	if (page.route.redirect) {
		redirect(301, page.route.redirect);
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
				{
					name: region.name,
					mode: region.mode,
					content: region.content.map((c) => hl(transform(serialize(c)))),
				},
			]),
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
		.filter((p) => !p.route.draft)
		.map((p) => {
			// entityRoutes URLs include a trailing slash by convention (e.g.
			// `/specs/SPEC-071/`). SvelteKit rejects slugs that start or end
			// with `/`, so strip both edges.
			const stripped = p.route.url.replace(/^\/+|\/+$/g, '');
			return { slug: stripped };
		});
}
