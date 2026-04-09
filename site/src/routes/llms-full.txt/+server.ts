import { loadContent } from '@refrakt-md/content';
import * as path from 'node:path';

const contentDir = path.resolve('content');

export const prerender = true;

export async function GET() {
	const site = await loadContent(contentDir);
	const baseUrl = process.env.SITE_URL || 'https://refrakt.md';

	const pages = site.pages
		.filter(p => !p.route.draft)
		.sort((a, b) => a.route.url.localeCompare(b.route.url));

	const sections: string[] = [
		'# refrakt.md — Full Documentation',
		'',
		'> A content framework built on Markdoc. Extend Markdown with 100+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.',
		'',
		`Source: ${baseUrl}`,
		'',
	];

	for (const page of pages) {
		const title = page.frontmatter.title ?? page.route.url;
		const url = `${baseUrl}${page.route.url}`;

		sections.push('---');
		sections.push('');
		sections.push(`## ${title}`);
		sections.push('');
		sections.push(`URL: ${url}`);
		if (page.frontmatter.description) {
			sections.push(`Description: ${page.frontmatter.description}`);
		}
		sections.push('');
		sections.push(page.content.trim());
		sections.push('');
	}

	return new Response(sections.join('\n'), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
}
