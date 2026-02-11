import { loadContent } from '@refract-md/content';
import * as path from 'node:path';

const contentDir = path.resolve('content');

export async function load() {
	const site = await loadContent(contentDir);

	return {
		pages: site.pages.map(p => ({
			url: p.route.url,
			title: p.frontmatter.title ?? '',
			draft: p.route.draft,
		})),
	};
}
