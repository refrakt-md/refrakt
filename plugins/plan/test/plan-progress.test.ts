import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { parse, findTag, findAllTags } from './helpers.js';
import { tags as coreTags, nodes, functions, runeTagMap, defineRune, resolveAggregates } from '@refrakt-md/runes';
import { plan } from '../src/index.js';

// plan-progress composes one `aggregate` per type (WORK-296), so we assert on the
// per-type aggregate sentinel blocks + the type headings.
const aggsOf = (src: string) =>
	findAllTags(parse(src) as any, t => t.attributes['data-rune'] === 'aggregate');
const metaOf = (tag: any, field: string) =>
	findTag(tag, (t: any) => t.name === 'meta' && t.attributes?.['data-field'] === field)?.attributes?.content;
const headingsOf = (src: string) => {
	const wrap = findTag(parse(src) as any, t => t.attributes['data-rune'] === 'plan-progress');
	return findAllTags(wrap, (t: any) => t.name === 'h3' && t.attributes?.['data-name'] === 'heading');
};

describe('plan-progress (per-type aggregate composition)', () => {
	it('emits one aggregate per type, grouped by status, with that type\'s achieved-status value', () => {
		const aggs = aggsOf('{% plan-progress /%}');
		expect(aggs.length).toBe(2); // work, bug
		expect(metaOf(aggs[0], 'aggregate-type')).toBe('work');
		expect(metaOf(aggs[0], 'aggregate-group')).toBe('status');
		expect(metaOf(aggs[0], 'aggregate-value')).toBe('status:done');
		expect(metaOf(aggs[1], 'aggregate-type')).toBe('bug');
		expect(metaOf(aggs[1], 'aggregate-value')).toBe('status:fixed');
	});

	it('labels each progress bar with the achieved-status word (no numbers in the label)', () => {
		const aggs = aggsOf('{% plan-progress /%}');
		expect(metaOf(aggs[0], 'aggregate-body')).toContain('{% progress value=$item.value max=$item.count %}Done{% /progress %}');
		expect(metaOf(aggs[1], 'aggregate-body')).toContain('}Fixed{% /progress %}');
	});

	it('renders a type heading above each block', () => {
		const headings = headingsOf('{% plan-progress /%}');
		expect(headings.length).toBe(2);
		expect(JSON.stringify(headings)).toContain('Work');
		expect(JSON.stringify(headings)).toContain('Bugs');
	});

	it('type= scopes to a single type with its own achieved status', () => {
		const aggs = aggsOf('{% plan-progress type="spec" /%}');
		expect(aggs.length).toBe(1);
		expect(metaOf(aggs[0], 'aggregate-type')).toBe('spec');
		expect(metaOf(aggs[0], 'aggregate-value')).toBe('status:accepted');
		expect(metaOf(aggs[0], 'aggregate-body')).toContain('}Accepted{% /progress %}');
	});

	it('legacy show="all" expands to the full plan set (5 blocks)', () => {
		expect(aggsOf('{% plan-progress show="all" /%}').length).toBe(5);
	});

	it('milestone= scopes every block via a filter clause', () => {
		const aggs = aggsOf('{% plan-progress milestone="v0.19.0" /%}');
		expect(aggs.every(a => metaOf(a, 'aggregate-filter') === 'milestone:v0.19.0')).toBe(true);
	});
});

// End-to-end: the per-type composition resolves through core `resolveAggregates`
// into a labelled progress bar + status badges per type.
describe('plan-progress resolves to per-type bars + status badges', () => {
	const pluginRunes: Record<string, any> = {};
	for (const [name, entry] of Object.entries(plan.runes)) {
		pluginRunes[name] = defineRune({ name, schema: (entry as any).transform, aliases: (entry as any).aliases });
	}
	const tags = { ...coreTags, ...runeTagMap(pluginRunes), ...Markdoc.tags } as any;
	const ctx = { info() {}, warn() {}, error() {} } as any;
	const entries = [
		{ type: 'work', id: 'W-1', sourceUrl: '/work/W-1/', data: { status: 'done' } },
		{ type: 'work', id: 'W-2', sourceUrl: '/work/W-2/', data: { status: 'done' } },
		{ type: 'work', id: 'W-3', sourceUrl: '/work/W-3/', data: { status: 'ready' } },
		{ type: 'bug', id: 'B-1', sourceUrl: '/bug/B-1/', data: { status: 'fixed' } },
		{ type: 'bug', id: 'B-2', sourceUrl: '/bug/B-2/', data: { status: 'confirmed' } },
	];
	const reg = {
		register() {},
		getAll: (type: string) => entries.filter(e => e.type === type),
		getById: (type: string, id: string) => entries.find(e => e.type === type && e.id === id),
		getByUrl: () => [],
		getTypes: () => [...new Set(entries.map(e => e.type))],
	} as any;
	const textOf = (n: any): string => {
		let out = '';
		const walk = (x: any) => {
			if (x == null) return;
			if (typeof x === 'string' || typeof x === 'number') { out += String(x); return; }
			if (Array.isArray(x)) return x.forEach(walk);
			if (Markdoc.Tag.isTag(x)) (x.children ?? []).forEach(walk);
		};
		walk(n);
		return out;
	};
	const resolved = (() => {
		const transformed = Markdoc.transform(Markdoc.parse('{% plan-progress /%}'), { tags, nodes, functions, variables: {} } as never);
		return resolveAggregates(transformed, '/p/', reg, { tags, nodes, functions } as any, ctx);
	})();

	it('renders one labelled progress bar per type (Work→Done 2/3, Bugs→Fixed 1/2)', () => {
		const bars = findAllTags(resolved as any, t => t.attributes?.['data-rune'] === 'progress');
		expect(bars.length).toBe(2);
		const done = bars.find(b => textOf(b).includes('Done'));
		const fixed = bars.find(b => textOf(b).includes('Fixed'));
		expect(done).toBeDefined();
		expect(fixed).toBeDefined();
	});

	it('renders per-type status badges (work: done×2 + ready×1)', () => {
		const work = findTag(resolved as any, t => t.attributes?.['data-type'] === 'work');
		const badges = findAllTags(work, t => t.attributes?.['data-rune'] === 'badge');
		expect(badges.length).toBe(2); // done, ready
		expect(badges.every(b => b.attributes?.['data-meta-type'] === 'status')).toBe(true);
		expect(textOf(badges.find(b => textOf(b).includes('Done')))).toContain('2');
	});

	it('keeps the type heading above each block', () => {
		const headings = findAllTags(resolved as any, t => t.name === 'h3' && t.attributes?.['data-name'] === 'heading');
		expect(headings.length).toBe(2);
	});
});
