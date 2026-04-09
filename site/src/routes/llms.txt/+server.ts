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

	const lines: string[] = [
		'# refrakt.md',
		'',
		'> A content framework built on Markdoc. Extend Markdown with 100+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.',
		'',
		`Full documentation: ${baseUrl}/docs/getting-started`,
		'',
		'## Docs',
		'',
	];

	// Group pages by section
	const sections: Record<string, typeof pages> = {};
	for (const page of pages) {
		const url = page.route.url;
		if (url === '/') {
			continue; // skip home page
		}
		const section = url.split('/').filter(Boolean)[0] ?? 'other';
		if (!sections[section]) sections[section] = [];
		sections[section].push(page);
	}

	for (const [section, sectionPages] of Object.entries(sections)) {
		lines.push(`### ${section.charAt(0).toUpperCase() + section.slice(1)}`);
		lines.push('');
		for (const page of sectionPages) {
			const title = page.frontmatter.title ?? page.route.url;
			const desc = page.frontmatter.description;
			const url = `${baseUrl}${page.route.url}`;
			lines.push(desc ? `- [${title}](${url}): ${desc}` : `- [${title}](${url})`);
		}
		lines.push('');
	}

	lines.push('## Optional');
	lines.push('');
	lines.push(`- [llms-full.txt](${baseUrl}/llms-full.txt): Full documentation content for comprehensive context`);
	lines.push('');

	return new Response(lines.join('\n'), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
}
