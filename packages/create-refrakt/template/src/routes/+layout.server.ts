import { loadContent } from '@refrakt-md/content';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import * as path from 'node:path';

const config = loadRefraktConfig(path.resolve('refrakt.config.json'));
const { site } = resolveSite(config);
const contentDir = path.resolve(site.contentDir);

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
