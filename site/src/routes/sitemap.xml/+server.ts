import { loadContent, generateSitemap } from '@refrakt-md/content';
import * as path from 'node:path';

const contentDir = path.resolve('content');

export const prerender = true;

export async function GET() {
	const site = await loadContent(contentDir);
	const baseUrl = process.env.SITE_URL || 'https://example.com';

	const entries = site.pages.map(p => ({
		url: p.route.url,
		draft: p.route.draft,
	}));

	const xml = generateSitemap(entries, baseUrl);

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
		},
	});
}
