import { getSite } from '$lib/content';

export async function load() {
	const site = await getSite();
	return {
		pages: site.pages.map((p) => ({
			url: p.route.url,
			title: p.frontmatter.title ?? '',
			draft: p.route.draft,
			description: p.frontmatter.description,
			tags: p.frontmatter.tags,
		})),
	};
}
