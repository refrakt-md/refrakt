import { describe, it, expect } from 'vitest';
import { buildBreadcrumb, buildToc, buildPrevNext } from '../src/computed.js';
import { makeTag } from '../src/helpers.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

// ─── Helper: build a minimal nav tree ─────────────────────────────────

function makeNavTree() {
	return [
		makeTag('section', { typeof: 'NavGroup' }, [
			makeTag('h2', {}, ['Getting Started']),
			makeTag('div', { typeof: 'NavItem' }, [
				makeTag('span', { property: 'slug' }, ['introduction']),
			]),
			makeTag('div', { typeof: 'NavItem' }, [
				makeTag('span', { property: 'slug' }, ['installation']),
			]),
		]),
		makeTag('section', { typeof: 'NavGroup' }, [
			makeTag('h2', {}, ['Guides']),
			makeTag('div', { typeof: 'NavItem' }, [
				makeTag('span', { property: 'slug' }, ['quickstart']),
			]),
			makeTag('div', { typeof: 'NavItem' }, [
				makeTag('span', { property: 'slug' }, ['advanced']),
			]),
		]),
	];
}

// ─── buildBreadcrumb ──────────────────────────────────────────────────

describe('buildBreadcrumb', () => {
	it('returns null when nav content is empty', () => {
		expect(buildBreadcrumb([], '/docs/intro', 'Intro', 'rf')).toBeNull();
	});

	it('returns null when current URL slug is not in nav tree', () => {
		const nav = makeNavTree();
		expect(buildBreadcrumb(nav, '/docs/unknown-page', 'Unknown', 'rf')).toBeNull();
	});

	it('produces breadcrumb with category and page title', () => {
		const nav = makeNavTree();
		const result = buildBreadcrumb(nav, '/docs/installation', 'Installation', 'rf');
		expect(result).not.toBeNull();

		const tag = asTag(result!);
		expect(tag.name).toBe('div');
		expect(tag.attributes.class).toBe('rf-docs-toolbar__breadcrumb');
		expect(tag.children).toHaveLength(3);

		const category = asTag(tag.children[0]);
		expect(category.attributes.class).toBe('rf-docs-breadcrumb-category');
		expect(category.children[0]).toBe('Getting Started');

		const sep = asTag(tag.children[1]);
		expect(sep.attributes.class).toBe('rf-docs-breadcrumb-sep');

		const page = asTag(tag.children[2]);
		expect(page.attributes.class).toBe('rf-docs-breadcrumb-page');
		expect(page.children[0]).toBe('Installation');
	});

	it('finds page in second nav group', () => {
		const nav = makeNavTree();
		const result = buildBreadcrumb(nav, '/docs/advanced', 'Advanced', 'rf');
		expect(result).not.toBeNull();

		const category = asTag(asTag(result!).children[0]);
		expect(category.children[0]).toBe('Guides');
	});
});

// ─── buildToc ─────────────────────────────────────────────────────────

describe('buildToc', () => {
	it('returns null when no headings provided', () => {
		expect(buildToc([], 'rf')).toBeNull();
	});

	it('returns null when no headings match level range', () => {
		const headings = [
			{ level: 1, text: 'Title', id: 'title' },
			{ level: 4, text: 'Detail', id: 'detail' },
		];
		expect(buildToc(headings, 'rf')).toBeNull();
	});

	it('produces nav with data-scrollspy attribute', () => {
		const headings = [
			{ level: 2, text: 'Overview', id: 'overview' },
			{ level: 2, text: 'Usage', id: 'usage' },
		];
		const result = buildToc(headings, 'rf');
		expect(result).not.toBeNull();

		const tag = asTag(result!);
		expect(tag.name).toBe('nav');
		expect(tag.attributes.class).toBe('rf-on-this-page');
		expect(tag.attributes['data-scrollspy']).toBe('');
	});

	it('produces title and list with correct structure', () => {
		const headings = [
			{ level: 2, text: 'Overview', id: 'overview' },
			{ level: 3, text: 'Sub Topic', id: 'sub-topic' },
		];
		const result = buildToc(headings, 'rf')!;
		const title = asTag(result.children[0]);
		expect(title.name).toBe('p');
		expect(title.attributes.class).toBe('rf-on-this-page__title');
		expect(title.children[0]).toBe('On this page');

		const list = asTag(result.children[1]);
		expect(list.name).toBe('ul');
		expect(list.children).toHaveLength(2);
	});

	it('sets data-level on each item', () => {
		const headings = [
			{ level: 2, text: 'H2', id: 'h2' },
			{ level: 3, text: 'H3', id: 'h3' },
		];
		const result = buildToc(headings, 'rf')!;
		const list = asTag(result.children[1]);

		const item1 = asTag(list.children[0]);
		expect(item1.attributes['data-level']).toBe('2');

		const item2 = asTag(list.children[1]);
		expect(item2.attributes['data-level']).toBe('3');
	});

	it('creates anchor links with correct href', () => {
		const headings = [
			{ level: 2, text: 'My Section', id: 'my-section' },
		];
		const result = buildToc(headings, 'rf')!;
		const list = asTag(result.children[1]);
		const item = asTag(list.children[0]);
		const link = asTag(item.children[0]);
		expect(link.name).toBe('a');
		expect(link.attributes.href).toBe('#my-section');
		expect(link.children[0]).toBe('My Section');
	});

	it('filters to h2-h3 by default', () => {
		const headings = [
			{ level: 1, text: 'H1', id: 'h1' },
			{ level: 2, text: 'H2', id: 'h2' },
			{ level: 3, text: 'H3', id: 'h3' },
			{ level: 4, text: 'H4', id: 'h4' },
		];
		const result = buildToc(headings, 'rf')!;
		const list = asTag(result.children[1]);
		expect(list.children).toHaveLength(2);
	});

	it('respects custom minLevel/maxLevel options', () => {
		const headings = [
			{ level: 1, text: 'H1', id: 'h1' },
			{ level: 2, text: 'H2', id: 'h2' },
			{ level: 3, text: 'H3', id: 'h3' },
			{ level: 4, text: 'H4', id: 'h4' },
		];
		const result = buildToc(headings, 'rf', { minLevel: 1, maxLevel: 4 })!;
		const list = asTag(result.children[1]);
		expect(list.children).toHaveLength(4);
	});

	it('uses custom prefix', () => {
		const headings = [{ level: 2, text: 'Test', id: 'test' }];
		const result = buildToc(headings, 'custom')!;
		expect(result.attributes.class).toBe('custom-on-this-page');
	});
});

// ─── buildPrevNext ────────────────────────────────────────────────────

describe('buildPrevNext', () => {
	const pages = [
		{ url: '/docs/introduction', title: 'Introduction', draft: false },
		{ url: '/docs/installation', title: 'Installation', draft: false },
		{ url: '/docs/quickstart', title: 'Quick Start', draft: false },
		{ url: '/docs/advanced', title: 'Advanced', draft: false },
	];

	it('returns null when nav content is empty', () => {
		expect(buildPrevNext([], '/docs/intro', pages, 'rf')).toBeNull();
	});

	it('returns null when current page not found in nav', () => {
		const nav = makeNavTree();
		expect(buildPrevNext(nav, '/docs/unknown', pages, 'rf')).toBeNull();
	});

	it('produces prev and next links for middle page', () => {
		const nav = makeNavTree();
		const result = buildPrevNext(nav, '/docs/installation', pages, 'rf');
		expect(result).not.toBeNull();

		const tag = asTag(result!);
		expect(tag.name).toBe('nav');
		expect(tag.attributes.class).toBe('rf-prev-next');
		expect(tag.children).toHaveLength(2);

		const prev = asTag(tag.children[0]);
		expect(prev.attributes.class).toBe('rf-prev-next__prev');
		expect(prev.attributes.href).toBe('/docs/introduction');

		const next = asTag(tag.children[1]);
		expect(next.attributes.class).toBe('rf-prev-next__next');
		expect(next.attributes.href).toBe('/docs/quickstart');
	});

	it('omits prev link for first page', () => {
		const nav = makeNavTree();
		const result = buildPrevNext(nav, '/docs/introduction', pages, 'rf');
		expect(result).not.toBeNull();

		const tag = asTag(result!);
		// Only next link
		expect(tag.children).toHaveLength(1);
		const next = asTag(tag.children[0]);
		expect(next.attributes.class).toBe('rf-prev-next__next');
	});

	it('omits next link for last page', () => {
		const nav = makeNavTree();
		const result = buildPrevNext(nav, '/docs/advanced', pages, 'rf');
		expect(result).not.toBeNull();

		const tag = asTag(result!);
		expect(tag.children).toHaveLength(1);
		const prev = asTag(tag.children[0]);
		expect(prev.attributes.class).toBe('rf-prev-next__prev');
	});

	it('includes title in prev/next links', () => {
		const nav = makeNavTree();
		const result = buildPrevNext(nav, '/docs/installation', pages, 'rf')!;
		const prev = asTag(result.children[0]);
		const prevTitle = asTag(prev.children[1]);
		expect(prevTitle.children[0]).toBe('Introduction');
	});
});
