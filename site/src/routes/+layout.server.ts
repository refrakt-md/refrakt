import { loadContent } from '@refrakt-md/content';
import * as path from 'node:path';

const contentDir = path.resolve('content');

export async function load() {
	const site = await loadContent(contentDir);

	return {
		pages: site.pages.map(p => ({
			url: p.route.url,
			title: p.frontmatter.title ?? '',
			draft: p.route.draft,
			description: p.frontmatter.description,
			date: p.frontmatter.date,
			author: p.frontmatter.author,
			tags: p.frontmatter.tags,
			image: p.frontmatter.image,
			version: p.frontmatter.version as string | undefined,
			versionGroup: p.frontmatter.versionGroup as string | undefined,
		})),
	};
}
