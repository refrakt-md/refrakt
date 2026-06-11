import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { corePipelineHooks } from '../src/config.js';
import { matchesFilterExpr } from '../src/field-match.js';
import { EntityRegistryImpl } from '../../content/src/registry.js';
import type { TransformedPage } from '@refrakt-md/types';

function makePage(url: string, title: string, headings: Array<{ level: number; text: string; id: string }> = []): TransformedPage {
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
			info(message: string, url?: string) { warnings.push({ severity: 'info', message, url }); },
			warn(message: string, url?: string) { warnings.push({ severity: 'warning', message, url }); },
			error(message: string, url?: string) { warnings.push({ severity: 'error', message, url }); },
		},
		warnings,
	};
}

describe('corePipelineHooks.register', () => {
	it('registers page entities for all pages', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		const pages = [
			makePage('/', 'Home'),
			makePage('/docs/', 'Docs'),
			makePage('/docs/guide/', 'Guide'),
		];

		corePipelineHooks.register!(pages, registry, ctx);

		const pageEntities = registry.getAll('page');
		expect(pageEntities).toHaveLength(3);

		const docsEntity = registry.getById('page', '/docs/');
		expect(docsEntity?.data.title).toBe('Docs');
		expect(docsEntity?.data.parentUrl).toBe('/');

		const guideEntity = registry.getById('page', '/docs/guide/');
		expect(guideEntity?.data.parentUrl).toBe('/docs/');
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
				status: 'beta',     // custom field
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
		expect(matchesFilterExpr(entity, 'tags:guide')).toBe(true);          // array member
		expect(matchesFilterExpr(entity, 'category:Guides status:beta')).toBe(true); // AND
		expect(matchesFilterExpr(entity, 'tags:missing')).toBe(false);
		expect(matchesFilterExpr(entity, 'layout:docs')).toBe(false);        // reserved → not indexed
	});
});

describe('corePipelineHooks.aggregate', () => {
	it('builds breadcrumb paths for nested pages', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		const pages = [
			makePage('/', 'Home'),
			makePage('/docs/', 'Docs'),
			makePage('/docs/guide/', 'Guide'),
			makePage('/docs/guide/advanced/', 'Advanced'),
		];

		corePipelineHooks.register!(pages, registry, ctx);
		const result = corePipelineHooks.aggregate!(registry, ctx) as any;

		expect(result.breadcrumbPaths).toBeDefined();

		// Root has no ancestors
		expect(result.breadcrumbPaths.get('/')).toEqual([]);

		// /docs/ has root as ancestor
		expect(result.breadcrumbPaths.get('/docs/')).toEqual(['/']);

		// /docs/guide/ has root and /docs/ as ancestors
		expect(result.breadcrumbPaths.get('/docs/guide/')).toEqual(['/', '/docs/']);

		// /docs/guide/advanced/ has full chain
		expect(result.breadcrumbPaths.get('/docs/guide/advanced/')).toEqual(['/', '/docs/', '/docs/guide/']);
	});

	it('builds a page tree', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		const pages = [
			makePage('/', 'Home'),
			makePage('/docs/', 'Docs'),
			makePage('/about/', 'About'),
		];

		corePipelineHooks.register!(pages, registry, ctx);
		const result = corePipelineHooks.aggregate!(registry, ctx) as any;

		expect(result.pageTree).toBeDefined();
		expect(result.pageTree.url).toBe('/');
		expect(result.pageTree.children).toHaveLength(2);

		const childUrls = result.pageTree.children.map((c: any) => c.url).sort();
		expect(childUrls).toEqual(['/about/', '/docs/']);
	});

	it('builds a pagesByUrl map', () => {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();

		const pages = [
			makePage('/', 'Home'),
			makePage('/docs/', 'Docs'),
		];

		corePipelineHooks.register!(pages, registry, ctx);
		const result = corePipelineHooks.aggregate!(registry, ctx) as any;

		expect(result.pagesByUrl.get('/')).toEqual({ url: '/', title: 'Home', parentUrl: '/' });
		expect(result.pagesByUrl.get('/docs/')).toEqual({ url: '/docs/', title: 'Docs', parentUrl: '/' });
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
		registry.register({ type: 'page', id: '/docs/', sourceUrl: '/other/', data: { url: '/docs/', title: 'Shadow', parentUrl: '/' } });

		// Now run the register hook — it should detect the collision
		corePipelineHooks.register!([makePage('/docs/', 'Docs')], registry, ctx);

		expect(warnings).toHaveLength(1);
		expect(warnings[0].severity).toBe('warning');
		expect(warnings[0].message).toContain('/docs/');
	});

	it('does not warn for normal (unique) page registration', () => {
		const registry = new EntityRegistryImpl();
		const { ctx, warnings } = makeCtx();

		corePipelineHooks.register!([
			makePage('/', 'Home'),
			makePage('/docs/', 'Docs'),
		], registry, ctx);

		expect(warnings).toHaveLength(0);
	});

});
