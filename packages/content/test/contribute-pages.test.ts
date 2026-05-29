import { describe, it, expect } from 'vitest';
import { runPipeline, type HookSet } from '../src/pipeline.js';
import type { SitePage } from '../src/site.js';
import type { ContributedPage, PluginPipelineHooks } from '@refrakt-md/types';

function page(url: string, over: Partial<SitePage> = {}): SitePage {
	return {
		route: { url, filePath: '', draft: false },
		frontmatter: {},
		content: '',
		renderable: [],
		headings: [],
		layout: { chain: [], regions: {} } as never,
		seo: {} as never,
		tintCascade: {} as never,
		...over,
	};
}

const renderContributed = (cp: ContributedPage): SitePage =>
	page(cp.url, { content: cp.content, source: { type: 'contributed', plugin: cp.source?.plugin, ruleIndex: cp.source?.ruleIndex } });

describe('contribution phase (SPEC-069)', () => {
	it('renders contributed pages and runs them through aggregate + postProcess', async () => {
		let sawEntityCount = -1;
		const hooks: PluginPipelineHooks = {
			register(pages, registry) {
				registry.register({ type: 'thing', id: 'T-1', sourceUrl: '/f/1/', data: {} });
			},
			contributePages(ctx) {
				sawEntityCount = ctx.registry.getAll('thing').length;
				return [{ url: '/c/1/', content: 'hello', title: 'C1' }];
			},
			postProcess(p) {
				return { ...p, frontmatter: { ...p.frontmatter, processed: true } };
			},
		};
		const hookSets: HookSet[] = [{ pluginName: 'test', hooks }];
		const result = await runPipeline([page('/f/1/')], hookSets, { renderContributed });

		// contributePages saw the registry populated by phase-2 register
		expect(sawEntityCount).toBe(1);
		// contributed page is in the result, marked, and post-processed
		const c = result.pages.find((p) => p.route.url === '/c/1/');
		expect(c).toBeDefined();
		expect(c!.source).toEqual({ type: 'contributed', plugin: 'test', ruleIndex: 0 });
		expect(result.pages).toHaveLength(2);
		expect(result.stats.pageCount).toBe(2);
	});

	it('file-backed pages win over a colliding contributed URL (with warning)', async () => {
		const hooks: PluginPipelineHooks = {
			contributePages() {
				return [{ url: '/f/1/', content: 'dupe' }];
			},
		};
		const result = await runPipeline([page('/f/1/', { content: 'original' })], [{ pluginName: 'test', hooks }], { renderContributed });
		expect(result.pages).toHaveLength(1);
		expect(result.pages[0].content).toBe('original');
		expect(result.warnings.some((w) => w.phase === 'contribute' && w.severity === 'warning')).toBe(true);
	});

	it('two contributed pages at the same URL error and the second is skipped', async () => {
		const hooks: PluginPipelineHooks = {
			contributePages() {
				return [{ url: '/c/x/', content: 'a' }, { url: '/c/x/', content: 'b' }];
			},
		};
		const result = await runPipeline([], [{ pluginName: 'test', hooks }], { renderContributed });
		expect(result.pages).toHaveLength(1);
		expect(result.warnings.some((w) => w.phase === 'contribute' && w.severity === 'error')).toBe(true);
	});

	it('is a no-op when no plugin contributes', async () => {
		const result = await runPipeline([page('/f/1/')], [{ pluginName: 'none', hooks: {} }], { renderContributed });
		expect(result.pages).toHaveLength(1);
	});
});
