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
	// Mirror the post-engine-transform shape: data-rune="nav-item", data-slug,
	// fallback text child.
	return new Tag('li', { 'data-rune': 'nav-item', 'data-slug': slug }, [slug]);
}

function makeExplicitNavItem(href: string, label: string): any {
	return new Tag('li', { 'data-rune': 'nav-item' }, [
		new Tag('a', { href }, [label]),
	]);
}

function makeNav(sourcePath: string, items: any[]): any {
	return new Tag('rf-nav', { 'data-rune': 'nav', 'data-source-path': sourcePath }, items);
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

function findAllLinks(tree: unknown): any[] {
	const result: any[] = [];
	const walk = (n: unknown) => {
		if (!Tag.isTag(n as any)) {
			if (Array.isArray(n)) n.forEach(walk);
			return;
		}
		const t = n as any;
		if (t.name === 'a') result.push(t);
		(t.children ?? []).forEach(walk);
	};
	walk(tree);
	return result;
}

describe('SPEC-055 nav slug resolution', () => {
	it('resolves a bare slug against the nav source dir', () => {
		const pages: PageMeta[] = [
			{ url: '/docs/getting-started', title: 'Getting started', parentUrl: '/docs/' },
		];
		const nav = makeNav('docs/_layout.md', [makeNavItem('getting-started')]);
		const { ctx, warnings } = makeCtx();

		const out = resolveCoreSentinels(nav, '/docs/getting-started', makeCoreData(pages), ctx);

		const link = findLink(out);
		expect(link).toBeTruthy();
		expect(link.attributes.href).toBe('/docs/getting-started');
		expect(warnings.filter(w => w.severity === 'error')).toHaveLength(0);
	});

	it('resolves a multi-segment slug relative to the nav source dir', () => {
		const pages: PageMeta[] = [
			{ url: '/docs/themes/configuration', title: 'Configuration', parentUrl: '/docs/themes/' },
		];
		const nav = makeNav('docs/_layout.md', [makeNavItem('themes/configuration')]);
		const { ctx, warnings } = makeCtx();

		const out = resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		const link = findLink(out);
		expect(link.attributes.href).toBe('/docs/themes/configuration');
		expect(warnings.filter(w => w.severity === 'error')).toHaveLength(0);
	});

	it('passes through slugs starting with /', () => {
		const pages: PageMeta[] = [
			{ url: '/some-other/page', title: 'Other', parentUrl: '/some-other/' },
		];
		const nav = makeNav('docs/_layout.md', [makeNavItem('/some-other/page')]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		const link = findLink(out);
		expect(link.attributes.href).toBe('/some-other/page');
	});

	it('leaves explicit-link items unchanged', () => {
		const pages: PageMeta[] = [];
		const nav = makeNav('docs/_layout.md', [
			makeExplicitNavItem('/docs/getting-started', 'Get started'),
		]);
		const { ctx, warnings } = makeCtx();

		const out = resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		const link = findLink(out);
		expect(link.attributes.href).toBe('/docs/getting-started');
		expect(warnings.filter(w => w.severity === 'error')).toHaveLength(0);
	});

	it('emits an error with closest-match suggestions when a bare slug is unresolvable', () => {
		const pages: PageMeta[] = [
			{ url: '/docs/themes/configuration', title: 'Theme Config', parentUrl: '/docs/themes/' },
			{ url: '/docs/plugins/configuration', title: 'Plugin Config', parentUrl: '/docs/plugins/' },
		];
		const nav = makeNav('docs/_layout.md', [makeNavItem('configuration')]);
		const { ctx, warnings } = makeCtx();

		resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		const errors = warnings.filter(w => w.severity === 'error');
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toContain('configuration');
		expect(errors[0].message).toContain('docs/_layout.md');
		expect(errors[0].message).toContain('/docs/themes/configuration');
		expect(errors[0].message).toContain('/docs/plugins/configuration');
	});

	it('emits an error when a multi-segment slug does not match any page', () => {
		const pages: PageMeta[] = [
			{ url: '/docs/getting-started', title: 'Getting started', parentUrl: '/docs/' },
		];
		const nav = makeNav('docs/_layout.md', [makeNavItem('themes/missing')]);
		const { ctx, warnings } = makeCtx();

		resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		const errors = warnings.filter(w => w.severity === 'error');
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toContain('themes/missing');
		expect(errors[0].message).toContain('/docs/themes/missing');
	});

	it('normalises trailing slashes', () => {
		const pages: PageMeta[] = [
			{ url: '/docs/themes/', title: 'Themes', parentUrl: '/docs/' },
		];
		const nav = makeNav('docs/_layout.md', [makeNavItem('themes')]);
		const { ctx, warnings } = makeCtx();

		const out = resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		expect(warnings.filter(w => w.severity === 'error')).toHaveLength(0);
		const link = findLink(out);
		expect(link.attributes.href).toBe('/docs/themes/');
	});
});

describe('SPEC-055 nav active state', () => {
	it('marks the current page with aria-current="page" (exact match)', () => {
		const pages: PageMeta[] = [
			{ url: '/docs/themes/overview', title: 'Themes Overview', parentUrl: '/docs/themes/' },
			{ url: '/docs/themes/config', title: 'Themes Config', parentUrl: '/docs/themes/' },
		];
		const nav = makeNav('docs/_layout.md', [
			makeNavItem('themes/overview'),
			makeNavItem('themes/config'),
		]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/docs/themes/overview', makeCoreData(pages), ctx);

		const links = findAllLinks(out);
		const overview = links.find(l => l.attributes.href === '/docs/themes/overview');
		const cfg = links.find(l => l.attributes.href === '/docs/themes/config');
		expect(overview.attributes['aria-current']).toBe('page');
		expect(cfg.attributes['aria-current']).toBeUndefined();
	});

	it('marks longest-prefix ancestor with data-active="ancestor"', () => {
		const pages: PageMeta[] = [
			{ url: '/docs/themes', title: 'Themes', parentUrl: '/docs/' },
			{ url: '/docs/themes/configuration', title: 'Themes Config', parentUrl: '/docs/themes/' },
			{ url: '/docs', title: 'Docs', parentUrl: '/' },
		];
		// Current page: /docs/themes/configuration/sites (deeper than any nav item)
		const nav = makeNav('docs/_layout.md', [
			makeNavItem('themes'),
			makeNavItem('themes/configuration'),
		]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/docs/themes/configuration/sites', makeCoreData(pages), ctx);

		const links = findAllLinks(out);
		const themes = links.find(l => l.attributes.href === '/docs/themes');
		const themesCfg = links.find(l => l.attributes.href === '/docs/themes/configuration');

		// Both are prefixes; longest (themes/configuration) wins as ancestor.
		expect(themesCfg.attributes['data-active']).toBe('ancestor');
		// Shorter prefix does NOT get the marker.
		expect(themes.attributes['data-active']).toBeUndefined();
	});

	it('exact match takes precedence over ancestor', () => {
		const pages: PageMeta[] = [
			{ url: '/docs/themes', title: 'Themes', parentUrl: '/docs/' },
			{ url: '/docs/themes/configuration', title: 'Themes Config', parentUrl: '/docs/themes/' },
		];
		const nav = makeNav('docs/_layout.md', [
			makeNavItem('themes'),
			makeNavItem('themes/configuration'),
		]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/docs/themes/configuration', makeCoreData(pages), ctx);

		const links = findAllLinks(out);
		const themes = links.find(l => l.attributes.href === '/docs/themes');
		const themesCfg = links.find(l => l.attributes.href === '/docs/themes/configuration');

		expect(themesCfg.attributes['aria-current']).toBe('page');
		expect(themesCfg.attributes['data-active']).toBeUndefined();
		// Ancestor goes to the next longest prefix.
		expect(themes.attributes['data-active']).toBe('ancestor');
	});

	it('does not mark anything when no item matches', () => {
		const pages: PageMeta[] = [
			{ url: '/docs/themes/overview', title: 'Themes Overview', parentUrl: '/docs/themes/' },
		];
		const nav = makeNav('docs/_layout.md', [makeNavItem('themes/overview')]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/blog/some-post', makeCoreData(pages), ctx);

		const links = findAllLinks(out);
		expect(links[0].attributes['aria-current']).toBeUndefined();
		expect(links[0].attributes['data-active']).toBeUndefined();
	});

	it('does not mark external links', () => {
		const pages: PageMeta[] = [];
		const nav = makeNav('_layout.md', [
			makeExplicitNavItem('https://github.com/example', 'GitHub'),
		]);
		const { ctx } = makeCtx();

		const out = resolveCoreSentinels(nav, '/', makeCoreData(pages), ctx);

		const link = findLink(out);
		expect(link.attributes['aria-current']).toBeUndefined();
		expect(link.attributes['data-active']).toBeUndefined();
	});
});
