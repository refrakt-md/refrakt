import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { resolveCoreSentinels } from '../src/config.js';

interface PageMeta {
	url: string;
	title: string;
	parentUrl: string;
	description?: string;
	icon?: string;
}

function makeCtx() {
	const warnings: Array<{ severity: string; message: string; url?: string }> = [];
	return {
		ctx: {
			info(message: string, url?: string) { warnings.push({ severity: 'info', message, url }); },
			warn(message: string, url?: string) { warnings.push({ severity: 'warning', message, url }); },
			error(message: string, url?: string) { warnings.push({ severity: 'error', message, url }); },
		},
		warnings,
	};
}

function makeCoreData(pages: PageMeta[]) {
	const pagesByUrl = new Map(pages.map(p => [p.url, p]));
	return {
		breadcrumbPaths: new Map<string, string[]>(),
		pagesByUrl: pagesByUrl as Map<string, { url: string; title: string; parentUrl: string }>,
		allPosts: [],
		registry: { getAll: () => [], getById: () => undefined, getByUrl: () => [], getTypes: () => [], register: () => {} } as any,
	};
}

function makeNavItem(slug: string): any {
	return new Tag('li', { 'data-rune': 'nav-item', 'data-slug': slug }, [slug]);
}

function makeNav(layout: string | undefined, attrs: Record<string, string>, items: any[]): any {
	const baseAttrs: Record<string, string> = { 'data-rune': 'nav', 'data-source-path': 'docs/_layout.md', ...attrs };
	if (layout) baseAttrs.layout = layout;
	return new Tag('rf-nav', baseAttrs, items);
}

function findLink(tree: unknown): any | null {
	if (!Tag.isTag(tree as any)) return null;
	const t = tree as any;
	if (t.name === 'a') return t;
	for (const c of t.children ?? []) {
		const found = findLink(c);
		if (found) return found;
	}
	return null;
}

function findChildByDataName(tree: unknown, name: string): any | null {
	if (!Tag.isTag(tree as any)) return null;
	const t = tree as any;
	if (t.attributes?.['data-name'] === name) return t;
	for (const c of t.children ?? []) {
		const found = findChildByDataName(c, name);
		if (found) return found;
	}
	return null;
}

describe('SPEC-054 auto=true nav enrichment', () => {
	it('augments a menubar nav item with description from frontmatter', () => {
		const pages: PageMeta[] = [
			{
				url: '/docs/getting-started',
				title: 'Getting started',
				parentUrl: '/docs/',
				description: 'Install refrakt and build your first site',
				icon: 'rocket',
			},
		];
		const nav = makeNav('menubar', { 'data-auto': 'true' }, [makeNavItem('getting-started')]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		const link = findLink(out);
		expect(link).toBeTruthy();
		expect(link.attributes.href).toBe('/docs/getting-started');

		const desc = findChildByDataName(out, 'description');
		expect(desc).toBeTruthy();
		expect(desc.children).toContain('Install refrakt and build your first site');

		const icon = findChildByDataName(out, 'icon');
		expect(icon).toBeTruthy();
		expect(icon.attributes.name).toBe('rocket');
	});

	it('does NOT enrich a menubar nav without data-auto', () => {
		const pages: PageMeta[] = [
			{
				url: '/docs/getting-started',
				title: 'Getting started',
				parentUrl: '/docs/',
				description: 'Should not appear',
				icon: 'rocket',
			},
		];
		const nav = makeNav('menubar', {}, [makeNavItem('getting-started')]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		const link = findLink(out);
		expect(link).toBeTruthy();
		expect(findChildByDataName(out, 'description')).toBeNull();
		expect(findChildByDataName(out, 'icon')).toBeNull();
	});

	it('does NOT enrich a vertical nav without data-auto', () => {
		const pages: PageMeta[] = [
			{
				url: '/docs/getting-started',
				title: 'Getting started',
				parentUrl: '/docs/',
				description: 'Should not appear',
			},
		];
		const nav = makeNav(undefined, {}, [makeNavItem('getting-started')]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		expect(findChildByDataName(out, 'description')).toBeNull();
	});

	it('cards layout continues to fully replace item children (backwards compat)', () => {
		const pages: PageMeta[] = [
			{
				url: '/docs/getting-started',
				title: 'Getting started',
				parentUrl: '/docs/',
				description: 'Install refrakt and build your first site',
				icon: 'rocket',
			},
		];
		const nav = makeNav('cards', {}, [makeNavItem('getting-started')]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		// Cards produces an <a> wrapping icon + title + description spans
		const link = findLink(out);
		expect(link).toBeTruthy();

		const title = findChildByDataName(out, 'title');
		expect(title).toBeTruthy();
		expect(title.children).toContain('Getting started');

		const desc = findChildByDataName(out, 'description');
		expect(desc).toBeTruthy();
		expect(desc.children).toContain('Install refrakt and build your first site');

		const icon = findChildByDataName(out, 'icon');
		expect(icon).toBeTruthy();
	});

	it('does not attach description when frontmatter has none', () => {
		const pages: PageMeta[] = [
			{
				url: '/docs/getting-started',
				title: 'Getting started',
				parentUrl: '/docs/',
				// no description
			},
		];
		const nav = makeNav('menubar', { 'data-auto': 'true' }, [makeNavItem('getting-started')]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		expect(findChildByDataName(out, 'description')).toBeNull();
		expect(findChildByDataName(out, 'icon')).toBeNull();
	});

	it('skips external link items in auto enrichment', () => {
		const externalItem = new Tag('li', { 'data-rune': 'nav-item' }, [
			new Tag('a', { href: 'https://example.com' }, ['External']),
		]);
		const nav = makeNav('menubar', { 'data-auto': 'true' }, [externalItem]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/', makeCoreData([]), ctx);

		expect(findChildByDataName(out, 'description')).toBeNull();
	});

	it('is idempotent — second pass adds nothing', () => {
		const pages: PageMeta[] = [
			{
				url: '/docs/getting-started',
				title: 'Getting started',
				parentUrl: '/docs/',
				description: 'Some description',
				icon: 'rocket',
			},
		];
		const nav = makeNav('menubar', { 'data-auto': 'true' }, [makeNavItem('getting-started')]);
		const { ctx } = makeCtx();

		const first = resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);
		const second = resolveCoreSentinels(first, '/', makeCoreData(pages), ctx);

		// Count description elements — should still be 1, not 2
		let count = 0;
		const walk = (n: unknown): void => {
			if (!Tag.isTag(n as any)) {
				if (Array.isArray(n)) n.forEach(walk);
				return;
			}
			const t = n as any;
			if (t.attributes?.['data-name'] === 'description') count++;
			(t.children ?? []).forEach(walk);
		};
		walk(second);
		expect(count).toBe(1);
	});
});
