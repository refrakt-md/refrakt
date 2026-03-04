import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { corePipelineHooks } from '../src/config.js';
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

	it('warns when a page has an orphaned parent URL', () => {
		const registry = new EntityRegistryImpl();
		const { ctx, warnings } = makeCtx();

		// Register a page that has a parent that doesn't exist
		corePipelineHooks.register!([makePage('/docs/guide/', 'Guide')], registry, ctx);
		corePipelineHooks.aggregate!(registry, ctx);

		// /docs/guide/ → parentUrl = /docs/ → not registered → warning
		expect(warnings.some(w => w.message.includes('/docs/guide/') && w.message.includes('/docs/'))).toBe(true);
	});

	it('does not warn about orphaned parent for root page', () => {
		const registry = new EntityRegistryImpl();
		const { ctx, warnings } = makeCtx();

		corePipelineHooks.register!([makePage('/', 'Home')], registry, ctx);
		corePipelineHooks.aggregate!(registry, ctx);

		// Root points to itself as parent — no orphan warning
		expect(warnings).toHaveLength(0);
	});
});
