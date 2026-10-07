import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { corePipelineHooks, resolveCoreSentinels } from '../src/config.js';
import { parse, findTag, findAllTags } from './helpers.js';
import { matchesFilterExpr } from '../src/field-match.js';
import { EntityRegistryImpl } from '../../content/src/registry.js';
import type { TransformedPage } from '@refrakt-md/types';

function makePage(
	url: string,
	title: string,
	headings: Array<{ level: number; text: string; id: string }> = [],
): TransformedPage {
	return {
		url,
		title,
		headings,
		frontmatter: { title },
		renderable: null,
	};
}

function makeCtx() {
	const warnings: Array<{ severity: string; message: string; url?: string }> = [];
	return {
		ctx: {
			info(message: string, url?: string) {
				warnings.push({ severity: 'info', message, url });
			},
			warn(message: string, url?: string) {
				warnings.push({ severity: 'warning', message, url });
			},
			error(message: string, url?: string) {
				warnings.push({ severity: 'error', message, url });
			},
		},
		warnings,
	};
}

describe('corePipelineHooks.register', () => {
	it('registers page entities for all pages', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		// Router-shaped URLs: no trailing slash except the root (BUG-018).
		const pages = [
			makePage('/', 'Home'),
			makePage('/docs', 'Docs'),
			makePage('/docs/guide', 'Guide'),
		];

		corePipelineHooks.register!(pages, registry, ctx);

		const pageEntities = registry.getAll('page');
		expect(pageEntities).toHaveLength(3);

		const docsEntity = registry.getById('page', '/docs');
		expect(docsEntity?.data.title).toBe('Docs');
		expect(docsEntity?.data.parentUrl).toBe('/');

		// `parentUrl` is spelled as the parent page's `url` is — `/docs`, not the
		// `/docs/` that missed every lookup.
		const guideEntity = registry.getById('page', '/docs/guide');
		expect(guideEntity?.data.parentUrl).toBe('/docs');
	});

	it('spells parentUrl as the parent is registered, slash or not (BUG-018)', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		// A base path makes the router spell its root `/en/`; a `slug` override
		// can carry a trailing slash too. The parent's own key wins either way.
		const pages = [
			makePage('/en/', 'Home'),
			makePage('/en/docs', 'Docs'),
			makePage('/legacy/', 'Legacy'),
			makePage('/legacy/page', 'Page'),
			makePage('/orphan/child', 'Child'),
		];
		corePipelineHooks.register!(pages, registry, ctx);

		expect(registry.getById('page', '/en/docs')?.data.parentUrl).toBe('/en/');
		expect(registry.getById('page', '/legacy/page')?.data.parentUrl).toBe('/legacy/');
		// No page at the parent path: the router's shape.
		expect(registry.getById('page', '/orphan/child')?.data.parentUrl).toBe('/orphan');
	});

	it('registers heading entities for each heading', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		const pages = [
			makePage('/docs/', 'Docs', [
				{ level: 1, text: 'Introduction', id: 'introduction' },
				{ level: 2, text: 'Setup', id: 'setup' },
			]),
		];

		corePipelineHooks.register!(pages, registry, ctx);

		const headings = registry.getAll('heading');
		expect(headings).toHaveLength(2);
		expect(registry.getById('heading', '/docs/#introduction')).toBeDefined();
		expect(registry.getById('heading', '/docs/#setup')).toBeDefined();
	});

	it('passes page frontmatter through to entity data, minus reserved keys (SPEC-092 L1)', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		const page = {
			url: '/guides/intro/',
			title: 'Intro', // the normalised/curated title
			headings: [],
			renderable: null,
			frontmatter: {
				title: 'Raw Title', // must NOT win — curated page.title does
				tags: ['guide', 'beginner'],
				author: 'Ada',
				image: '/og.png',
				category: 'Guides', // custom field
				status: 'beta', // custom field
				// reserved routing/render-control keys — must be excluded:
				layout: 'docs',
				tint: 'warm',
				'tint-mode': 'dark',
				'tint-lock': true,
				slug: 'intro-override',
				redirect: '/elsewhere/',
			},
		} as unknown as TransformedPage;

		corePipelineHooks.register!([page], registry, ctx);
		const data = registry.getById('page', '/guides/intro/')!.data;

		// passthrough — queryable by collection/aggregate
		expect(data.tags).toEqual(['guide', 'beginner']); // arrays pass through
		expect(data.author).toBe('Ada');
		expect(data.image).toBe('/og.png');
		expect(data.category).toBe('Guides');
		expect(data.status).toBe('beta');

		// curated fields win over raw frontmatter
		expect(data.title).toBe('Intro');

		// reserved keys are excluded from queryable data
		for (const k of ['layout', 'tint', 'tint-mode', 'tint-lock', 'slug', 'redirect']) {
			expect(data[k]).toBeUndefined();
		}

		// the entity is filterable by the shared field-match grammar — the same
		// path collection/aggregate use, with no resolver change
		const entity = registry.getById('page', '/guides/intro/')!;
		expect(matchesFilterExpr(entity, 'tags:guide')).toBe(true); // array member
		expect(matchesFilterExpr(entity, 'category:Guides status:beta')).toBe(true); // AND
		expect(matchesFilterExpr(entity, 'tags:missing')).toBe(false);
		expect(matchesFilterExpr(entity, 'layout:docs')).toBe(false); // reserved → not indexed
	});
});

describe('corePipelineHooks.aggregate', () => {
	it('builds breadcrumb paths for nested pages', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		// Router-shaped URLs. These fixtures used to read `/docs/`, `/docs/guide/`
		// — a shape the router never produces, and the one shape under which
		// BUG-018's trailing-slash `parentUrl` happened to match.
		const pages = [
			makePage('/', 'Home'),
			makePage('/docs', 'Docs'),
			makePage('/docs/guide', 'Guide'),
			makePage('/docs/guide/advanced', 'Advanced'),
		];

		corePipelineHooks.register!(pages, registry, ctx);
		const result = corePipelineHooks.aggregate!(registry, ctx) as any;

		expect(result.breadcrumbPaths).toBeDefined();
		expect(result.breadcrumbPaths.get('/')).toEqual([]);
		expect(result.breadcrumbPaths.get('/docs')).toEqual(['/']);
		expect(result.breadcrumbPaths.get('/docs/guide')).toEqual(['/', '/docs']);
		expect(result.breadcrumbPaths.get('/docs/guide/advanced')).toEqual([
			'/',
			'/docs',
			'/docs/guide',
		]);
	});

	it('steps over a directory with no index page in breadcrumb paths', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		const pages = [makePage('/', 'Home'), makePage('/docs/guide/advanced', 'Advanced')];
		corePipelineHooks.register!(pages, registry, ctx);
		const result = corePipelineHooks.aggregate!(registry, ctx) as any;

		// Neither `/docs` nor `/docs/guide` is a page: the path names only real
		// pages, and still reaches the root.
		expect(result.breadcrumbPaths.get('/docs/guide/advanced')).toEqual(['/']);
	});

	it('builds a page tree', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		const pages = [
			makePage('/', 'Home'),
			makePage('/docs', 'Docs'),
			makePage('/docs/guide', 'Guide'),
			makePage('/about', 'About'),
		];

		corePipelineHooks.register!(pages, registry, ctx);
		const result = corePipelineHooks.aggregate!(registry, ctx) as any;

		expect(result.pageTree).toBeDefined();
		expect(result.pageTree.url).toBe('/');
		expect(result.pageTree.children).toHaveLength(2);

		const childUrls = result.pageTree.children.map((c: any) => c.url).sort();
		expect(childUrls).toEqual(['/about', '/docs']);

		// Depth 2 nests under its section rather than flattening onto the root.
		const docs = result.pageTree.children.find((c: any) => c.url === '/docs');
		expect(docs.children.map((c: any) => c.url)).toEqual(['/docs/guide']);
	});

	it('builds a pagesByUrl map', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		const pages = [makePage('/', 'Home'), makePage('/docs/', 'Docs')];

		corePipelineHooks.register!(pages, registry, ctx);
		const result = corePipelineHooks.aggregate!(registry, ctx) as any;

		expect(result.pagesByUrl.get('/')).toEqual({ url: '/', title: 'Home', parentUrl: '/' });
		expect(result.pagesByUrl.get('/docs/')).toEqual({
			url: '/docs/',
			title: 'Docs',
			parentUrl: '/',
		});
	});

	it('builds a heading index', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		const pages = [
			makePage('/docs/', 'Docs', [{ level: 2, text: 'API Reference', id: 'api-reference' }]),
		];

		corePipelineHooks.register!(pages, registry, ctx);
		const result = corePipelineHooks.aggregate!(registry, ctx) as any;

		expect(result.headingIndex.get('/docs/#api-reference')).toMatchObject({
			level: 2,
			text: 'API Reference',
			headingId: 'api-reference',
		});
	});
});

describe('corePipelineHooks validations', () => {
	it('warns when the same page URL is registered by multiple sources', () => {
		const registry = new EntityRegistryImpl();
		const { ctx, warnings } = makeCtx();

		// Register a page first from a "shadow" source
		registry.register({
			type: 'page',
			id: '/docs/',
			sourceUrl: '/other/',
			data: { url: '/docs/', title: 'Shadow', parentUrl: '/' },
		});

		// Now run the register hook — it should detect the collision
		corePipelineHooks.register!([makePage('/docs/', 'Docs')], registry, ctx);

		expect(warnings).toHaveLength(1);
		expect(warnings[0].severity).toBe('warning');
		expect(warnings[0].message).toContain('/docs/');
	});

	it('does not warn for normal (unique) page registration', () => {
		const registry = new EntityRegistryImpl();
		const { ctx, warnings } = makeCtx();

		corePipelineHooks.register!([makePage('/', 'Home'), makePage('/docs/', 'Docs')], registry, ctx);

		expect(warnings).toHaveLength(0);
	});

	it('warns when a breadcrumb ancestor has no page entry, instead of dropping it silently (BUG-018)', () => {
		const registry = new EntityRegistryImpl();
		const { ctx, warnings } = makeCtx();
		const pagesByUrl = new Map([
			['/', { url: '/', title: 'Home', parentUrl: '/' }],
			['/docs/guide', { url: '/docs/guide', title: 'Guide', parentUrl: '/docs' }],
		]);
		// The path names `/docs/` — the old trailing-slash key — which no page
		// entry answers to. That is exactly how BUG-018 lost its ancestors.
		const breadcrumbPaths = new Map([['/docs/guide', ['/', '/docs/']]]);

		const resolved = resolveCoreSentinels(
			parse('{% breadcrumb auto=true /%}'),
			'/docs/guide',
			{ breadcrumbPaths, pagesByUrl, allPosts: [], registry },
			ctx,
		);

		const items = findAllTags(
			findTag(resolved as any, (t) => t.attributes['data-rune'] === 'breadcrumb')!,
			(t) => t.attributes['data-rune'] === 'breadcrumb-item',
		);
		expect(items).toHaveLength(2); // Home + Guide; the unresolvable level is left out
		expect(warnings).toHaveLength(1);
		expect(warnings[0].severity).toBe('warning');
		expect(warnings[0].message).toContain('"/docs/"');
		expect(warnings[0].url).toBe('/docs/guide');
	});
});
