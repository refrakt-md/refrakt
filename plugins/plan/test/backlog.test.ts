import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';
import { planPipelineHooks } from '../src/pipeline.js';
import type { TransformedPage, EntityRegistration, EntityRegistry, PipelineContext } from '@refrakt-md/types';

function makePage(url: string, content: string): TransformedPage {
	const renderable = parse(content);
	return { url, title: '', headings: [], frontmatter: {}, renderable } as TransformedPage;
}

function makeRegistry() {
	const entries: EntityRegistration[] = [];
	return {
		entries,
		registry: {
			register(e: EntityRegistration) { entries.push(e); },
			getAll(type: string) { return entries.filter(e => e.type === type); },
			getById(type: string, id: string) { return entries.find(e => e.type === type && e.id === id); },
			getByUrl(type: string, url: string) { return entries.filter(e => e.type === type && e.sourceUrl === url); },
			getTypes() { return [...new Set(entries.map(e => e.type))]; },
		} as EntityRegistry,
	};
}

const ctx: PipelineContext = { info: () => {}, warn: () => {}, error: () => {} };

describe('backlog rune', () => {
	it('transforms to a section with sentinel meta', () => {
		const result = parse(`{% backlog filter="status:ready" sort="priority" /%}`);
		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'backlog');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('section');

		// Should have filter and sort meta tags
		const filterMeta = findTag(tag!, t => t.attributes['data-field'] === 'filter');
		expect(filterMeta).toBeDefined();
		expect(filterMeta!.attributes.content).toBe('status:ready');

		const sortMeta = findTag(tag!, t => t.attributes['data-field'] === 'sort');
		expect(sortMeta).toBeDefined();
		expect(sortMeta!.attributes.content).toBe('priority');
	});

	it('has sentinel meta tag for postProcess', () => {
		const result = parse(`{% backlog /%}`);
		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'backlog');
		const sentinel = findTag(tag!, t => t.attributes['data-field'] === '__backlog-sentinel');
		expect(sentinel).toBeDefined();
	});
});

describe('backlog aggregate + postProcess', () => {
	it('populates backlog with filtered entity cards', () => {
		// 1. Register some work entities
		const { entries, registry } = makeRegistry();
		const workPages = [
			makePage('/plan/w1', `{% work id="W-1" status="ready" priority="high" %}
# Task One
Description.
{% /work %}`),
			makePage('/plan/w2', `{% work id="W-2" status="done" priority="low" %}
# Task Two
Description.
{% /work %}`),
			makePage('/plan/w3', `{% work id="W-3" status="ready" priority="critical" %}
# Task Three
Description.
{% /work %}`),
		];
		planPipelineHooks.register!(workPages, registry, ctx);
		expect(entries).toHaveLength(3);

		// 2. Aggregate
		const aggregated = { plan: planPipelineHooks.aggregate!(registry, ctx) };

		// 3. PostProcess a page with a backlog rune
		const backlogPage = makePage('/plan/dashboard', `{% backlog filter="status:ready" sort="priority" /%}`);
		const processed = planPipelineHooks.postProcess!(backlogPage, aggregated, ctx);

		// 4. Find the resolved backlog — should have cards
		const backlogTag = findTag(processed.renderable as any, t => t.attributes['data-rune'] === 'backlog');
		expect(backlogTag).toBeDefined();

		const cards = findAllTags(backlogTag!, t => t.attributes.class === 'rf-backlog__card');
		expect(cards).toHaveLength(2); // Only ready items

		// Should be sorted: critical before high
		expect(cards[0].attributes['data-id']).toBe('W-3');
		expect(cards[1].attributes['data-id']).toBe('W-1');
	});

	it('groups entities when group attribute is set', () => {
		const { registry } = makeRegistry();
		const pages = [
			makePage('/plan/w1', `{% work id="W-1" status="ready" priority="high" %}
# A
Desc.
{% /work %}`),
			makePage('/plan/w2', `{% work id="W-2" status="ready" priority="low" %}
# B
Desc.
{% /work %}`),
		];
		planPipelineHooks.register!(pages, registry, ctx);
		const aggregated = { plan: planPipelineHooks.aggregate!(registry, ctx) };

		const backlogPage = makePage('/plan/dashboard', `{% backlog filter="status:ready" group="priority" /%}`);
		const processed = planPipelineHooks.postProcess!(backlogPage, aggregated, ctx);

		const groups = findAllTags(processed.renderable as any, t =>
			typeof t.attributes.class === 'string' && t.attributes.class.includes('rf-backlog__group'),
		);
		expect(groups.length).toBeGreaterThanOrEqual(2);
	});

	it('caps the rendered count when limit is set', () => {
		const { registry } = makeRegistry();
		const pages = [1, 2, 3, 4, 5, 6, 7].map(n =>
			makePage(`/plan/w${n}`, `{% work id="W-${n}" status="ready" priority="high" %}
# Item ${n}
Desc.
{% /work %}`),
		);
		planPipelineHooks.register!(pages, registry, ctx);
		const aggregated = { plan: planPipelineHooks.aggregate!(registry, ctx) };

		const backlogPage = makePage('/plan/dashboard', `{% backlog filter="status:ready" sort="id" limit=3 /%}`);
		const processed = planPipelineHooks.postProcess!(backlogPage, aggregated, ctx);

		const cards = findAllTags(processed.renderable as any, t => t.attributes.class === 'rf-backlog__card');
		expect(cards).toHaveLength(3);
		// Limit applies post-sort, so the top 3 by id are the first three.
		expect(cards.map(c => c.attributes['data-id'])).toEqual(['W-1', 'W-2', 'W-3']);
	});

	it('renders the full set when limit is unset', () => {
		const { registry } = makeRegistry();
		const pages = [1, 2, 3, 4, 5].map(n =>
			makePage(`/plan/w${n}`, `{% work id="W-${n}" status="ready" priority="high" %}
# Item ${n}
Desc.
{% /work %}`),
		);
		planPipelineHooks.register!(pages, registry, ctx);
		const aggregated = { plan: planPipelineHooks.aggregate!(registry, ctx) };

		const backlogPage = makePage('/plan/dashboard', `{% backlog filter="status:ready" /%}`);
		const processed = planPipelineHooks.postProcess!(backlogPage, aggregated, ctx);

		const cards = findAllTags(processed.renderable as any, t => t.attributes.class === 'rf-backlog__card');
		expect(cards).toHaveLength(5);
	});

	it('treats limit=0 / negative / NaN as unset (no silent empty render)', () => {
		const { registry } = makeRegistry();
		const pages = [1, 2, 3].map(n =>
			makePage(`/plan/w${n}`, `{% work id="W-${n}" status="ready" priority="high" %}
# Item ${n}
Desc.
{% /work %}`),
		);
		planPipelineHooks.register!(pages, registry, ctx);
		const aggregated = { plan: planPipelineHooks.aggregate!(registry, ctx) };

		const backlogPage = makePage('/plan/dashboard', `{% backlog filter="status:ready" limit=0 /%}`);
		const processed = planPipelineHooks.postProcess!(backlogPage, aggregated, ctx);

		const cards = findAllTags(processed.renderable as any, t => t.attributes.class === 'rf-backlog__card');
		expect(cards).toHaveLength(3);
	});

	it('includes bugs when show=all', () => {
		const { registry } = makeRegistry();
		const pages = [
			makePage('/plan/w1', `{% work id="W-1" status="ready" priority="high" %}
# Work
Desc.
{% /work %}`),
			makePage('/plan/b1', `{% bug id="B-1" status="confirmed" severity="major" %}
# Bug
## Steps
1. Do thing
{% /bug %}`),
		];
		planPipelineHooks.register!(pages, registry, ctx);
		const aggregated = { plan: planPipelineHooks.aggregate!(registry, ctx) };

		const backlogPage = makePage('/plan/dashboard', `{% backlog show="all" /%}`);
		const processed = planPipelineHooks.postProcess!(backlogPage, aggregated, ctx);

		const cards = findAllTags(processed.renderable as any, t => t.attributes.class === 'rf-backlog__card');
		expect(cards).toHaveLength(2);
	});
});
