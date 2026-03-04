import { describe, it, expect, vi } from 'vitest';
import { runPipeline } from '../src/pipeline.js';
import type { HookSet } from '../src/pipeline.js';
import type { TransformedPage } from '@refrakt-md/types';

// Minimal SitePage stub for testing
function makePage(url: string, title: string): any {
	return {
		route: { url, filePath: `${url}index.md`, draft: false },
		frontmatter: { title },
		content: '',
		renderable: null,
		headings: [],
		layout: { chain: [], regions: new Map() },
		seo: {},
	};
}

describe('runPipeline', () => {
	it('runs all three phases in order and returns enriched pages', async () => {
		const events: string[] = [];

		const hooks: HookSet = {
			packageName: 'test',
			hooks: {
				register(pages, registry, ctx) {
					events.push('register');
					for (const p of pages) {
						registry.register({ type: 'page', id: p.url, sourceUrl: p.url, data: { title: p.title } });
					}
				},
				aggregate(registry, ctx) {
					events.push('aggregate');
					return { pageCount: registry.getAll('page').length };
				},
				postProcess(page, aggregated, ctx) {
					events.push(`postProcess:${page.url}`);
					return page; // no changes
				},
			},
		};

		const pages = [makePage('/a/', 'A'), makePage('/b/', 'B')];
		const result = await runPipeline(pages, [hooks]);

		expect(events).toEqual(['register', 'aggregate', 'postProcess:/a/', 'postProcess:/b/']);
		expect(result.pages).toHaveLength(2);
		expect((result.aggregated['test'] as any).pageCount).toBe(2);
		expect(result.warnings).toHaveLength(0);
	});

	it('catches register hook errors and continues', async () => {
		const hooks: HookSet = {
			packageName: 'bad-register',
			hooks: {
				register() {
					throw new Error('register failed');
				},
			},
		};

		const pages = [makePage('/a/', 'A')];
		const result = await runPipeline(pages, [hooks]);

		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].severity).toBe('error');
		expect(result.warnings[0].phase).toBe('register');
		expect(result.warnings[0].message).toBe('register failed');
		expect(result.pages).toHaveLength(1); // pipeline continues
	});

	it('catches aggregate hook errors and continues', async () => {
		const hooks: HookSet = {
			packageName: 'bad-agg',
			hooks: {
				aggregate() {
					throw new Error('aggregate failed');
				},
			},
		};

		const pages = [makePage('/a/', 'A')];
		const result = await runPipeline(pages, [hooks]);

		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].phase).toBe('aggregate');
		expect(result.pages).toHaveLength(1);
	});

	it('catches postProcess hook errors per-page and continues', async () => {
		const hooks: HookSet = {
			packageName: 'bad-post',
			hooks: {
				postProcess(page) {
					if (page.url === '/b/') throw new Error('post failed');
					return page;
				},
			},
		};

		const pages = [makePage('/a/', 'A'), makePage('/b/', 'B'), makePage('/c/', 'C')];
		const result = await runPipeline(pages, [hooks]);

		// One warning for /b/, but /a/ and /c/ are unaffected
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].url).toBe('/b/');
		expect(result.pages).toHaveLength(3);
	});

	it('packages can emit warnings via ctx', async () => {
		const hooks: HookSet = {
			packageName: 'warning-pkg',
			hooks: {
				register(pages, registry, ctx) {
					ctx.warn('something suspicious');
					ctx.error('something wrong');
				},
			},
		};

		const result = await runPipeline([makePage('/a/', 'A')], [hooks]);

		expect(result.warnings).toHaveLength(2);
		expect(result.warnings[0].severity).toBe('warning');
		expect(result.warnings[1].severity).toBe('error');
	});

	it('multiple hookSets run in order', async () => {
		const order: string[] = [];

		const makeHookSet = (name: string): HookSet => ({
			packageName: name,
			hooks: {
				register() { order.push(`register:${name}`); },
				aggregate() { order.push(`aggregate:${name}`); return {}; },
				postProcess(p) { order.push(`post:${name}`); return p; },
			},
		});

		await runPipeline([makePage('/a/', 'A')], [makeHookSet('first'), makeHookSet('second')]);

		expect(order).toEqual([
			'register:first', 'register:second',
			'aggregate:first', 'aggregate:second',
			'post:first', 'post:second',
		]);
	});

	it('postProcess receives aggregated data from all packages', async () => {
		let receivedAggregated: any = null;

		const hookSets: HookSet[] = [
			{
				packageName: 'producer',
				hooks: {
					aggregate() { return { value: 42 }; },
				},
			},
			{
				packageName: 'consumer',
				hooks: {
					postProcess(page, aggregated) {
						receivedAggregated = aggregated;
						return page;
					},
				},
			},
		];

		await runPipeline([makePage('/a/', 'A')], hookSets);
		expect(receivedAggregated?.['producer']?.value).toBe(42);
	});
});
