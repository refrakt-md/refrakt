import { describe, it, expect } from 'vitest';
import type { ContentDirectory, ContentPage } from '../src/content-tree.js';
import { resolveTintCascade } from '../src/tint-cascade.js';

/** Build a content page from raw markdown with optional frontmatter. */
function page(relativePath: string, frontmatter: Record<string, unknown> = {}, body = ''): ContentPage {
	const keys = Object.keys(frontmatter);
	const yaml = keys.length > 0
		? '---\n' + keys.map(k => `${k}: ${JSON.stringify(frontmatter[k])}`).join('\n') + '\n---\n'
		: '';
	return {
		filePath: `/abs/${relativePath}`,
		relativePath,
		raw: yaml + body,
	};
}

/** Empty directory structure with optional layout + children. */
function dir(
	name: string,
	parts: { layout?: ContentPage; pages?: ContentPage[]; children?: ContentDirectory[] } = {},
): ContentDirectory {
	return {
		name,
		dirPath: `/abs/${name}`,
		pages: parts.pages ?? [],
		children: parts.children ?? [],
		layout: parts.layout,
	};
}

describe('resolveTintCascade', () => {
	it('returns defaults when no layouts and no page frontmatter', () => {
		const root = dir('', {});
		const p = page('index.md');
		expect(resolveTintCascade(p, root)).toEqual({
			tint: null,
			tintMode: 'auto',
			locked: false,
		});
	});

	it('seeds tintMode from root defaults (theme.colorScheme)', () => {
		const root = dir('', {});
		const p = page('index.md');
		expect(resolveTintCascade(p, root, { colorScheme: 'dark' })).toMatchObject({
			tintMode: 'dark',
		});
	});

	it('reads tint, tint-mode, tint-lock from page frontmatter', () => {
		const root = dir('', {});
		const p = page('index.md', {
			tint: 'warm',
			'tint-mode': 'dark',
			'tint-lock': true,
		});
		expect(resolveTintCascade(p, root)).toEqual({
			tint: 'warm',
			tintMode: 'dark',
			locked: true,
		});
	});

	it('inherits from a root layout', () => {
		const rootLayout = page('_layout.md', { 'tint-mode': 'dark', 'tint-lock': true });
		const root = dir('', { layout: rootLayout });
		const p = page('index.md');
		expect(resolveTintCascade(p, root)).toEqual({
			tint: null,
			tintMode: 'dark',
			locked: true,
		});
	});

	it('inherits down through a nested directory layout', () => {
		const rootLayout = page('_layout.md', { 'tint-mode': 'dark', 'tint-lock': true });
		const docsLayout = page('docs/_layout.md', { 'tint-mode': 'auto', 'tint-lock': false });
		const docsPage = page('docs/getting-started.md');
		const root = dir('', {
			layout: rootLayout,
			children: [dir('docs', { layout: docsLayout, pages: [docsPage] })],
		});
		// Docs layout unlocks and switches to auto — overrides root's locked dark.
		expect(resolveTintCascade(docsPage, root)).toEqual({
			tint: null,
			tintMode: 'auto',
			locked: false,
		});
	});

	it('page frontmatter overrides its containing layout', () => {
		const docsLayout = page('docs/_layout.md', { 'tint-mode': 'auto', 'tint-lock': false });
		const featurePage = page('docs/featured.md', { 'tint-mode': 'dark', 'tint-lock': true });
		const root = dir('', {
			children: [dir('docs', { layout: docsLayout, pages: [featurePage] })],
		});
		expect(resolveTintCascade(featurePage, root)).toEqual({
			tint: null,
			tintMode: 'dark',
			locked: true,
		});
	});

	it('preserves explicit null tint as a reset', () => {
		const rootLayout = page('_layout.md', { tint: 'warm' });
		const p = page('index.md', { tint: null });
		const root = dir('', { layout: rootLayout, pages: [p] });
		expect(resolveTintCascade(p, root)).toMatchObject({ tint: null });
	});

	it('rejects an invalid tint-mode value silently (keeps the inherited value)', () => {
		const root = dir('', {});
		const p = page('index.md', { 'tint-mode': 'sideways' });
		// Invalid value doesn't override the inherited default.
		expect(resolveTintCascade(p, root)).toMatchObject({ tintMode: 'auto' });
	});

	it('demonstrates the refrakt site adoption: root locked-dark, /docs/* auto', () => {
		const rootLayout = page('_layout.md', { 'tint-mode': 'dark', 'tint-lock': true });
		const docsLayout = page('docs/_layout.md', { 'tint-mode': 'auto', 'tint-lock': false });
		const runesLayout = page('runes/_layout.md', { 'tint-mode': 'auto', 'tint-lock': false });

		const homepage = page('index.md');
		const docsPage = page('docs/getting-started.md');
		const runePage = page('runes/hint.md');
		const blogPage = page('blog/announcement.md');

		const root = dir('', {
			layout: rootLayout,
			pages: [homepage],
			children: [
				dir('docs', { layout: docsLayout, pages: [docsPage] }),
				dir('runes', { layout: runesLayout, pages: [runePage] }),
				dir('blog', { pages: [blogPage] }),
			],
		});

		expect(resolveTintCascade(homepage, root)).toMatchObject({ tintMode: 'dark', locked: true });
		expect(resolveTintCascade(docsPage, root)).toMatchObject({ tintMode: 'auto', locked: false });
		expect(resolveTintCascade(runePage, root)).toMatchObject({ tintMode: 'auto', locked: false });
		expect(resolveTintCascade(blogPage, root)).toMatchObject({ tintMode: 'dark', locked: true });
	});

	it('is deterministic — same inputs produce same outputs', () => {
		const rootLayout = page('_layout.md', { tint: 'warm', 'tint-mode': 'dark' });
		const p = page('index.md', { 'tint-lock': true });
		const root = dir('', { layout: rootLayout, pages: [p] });
		const a = resolveTintCascade(p, root);
		const b = resolveTintCascade(p, root);
		expect(a).toEqual(b);
	});
});
