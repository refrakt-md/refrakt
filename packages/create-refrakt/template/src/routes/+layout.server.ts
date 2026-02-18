import { loadContent } from '@refrakt-md/content';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type { RefraktConfig } from '@refrakt-md/types';

const config: RefraktConfig = JSON.parse(readFileSync(path.resolve('refrakt.config.json'), 'utf-8'));
const contentDir = path.resolve(config.contentDir);

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
