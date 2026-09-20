import { loadContent } from '@refrakt-md/content';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import * as path from 'node:path';

const config = loadRefraktConfig(path.resolve('refrakt.config.json'));
const { site } = resolveSite(config);
const contentDir = path.resolve(site.contentDir);

export async function load() {
	// No `reporter` (SPEC-135 D5): this is a per-request server load with no
	// cache in front of it, so a build summary here would print on every
	// navigation. The Vite plugin already reports the same site once at build
	// and once per dev reload.
	const site = await loadContent(contentDir);

	return {
		pages: site.pages.map((p) => ({
			url: p.route.url,
			title: p.frontmatter.title ?? '',
			draft: p.route.draft,
		})),
	};
}
