import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { parse, findTag, findAllTags } from './helpers.js';
import { tags as coreTags, nodes, functions, runeTagMap, defineRune, resolveAggregates } from '@refrakt-md/runes';
import { plan } from '../src/index.js';

// plan-progress lowers to an `aggregate` composition (WORK-296), so we assert on
// the emitted aggregate sentinel metas rather than a bespoke render path.
const aggOf = (src: string) => {
	const r = parse(src);
	return findTag(r as any, t => t.attributes['data-rune'] === 'aggregate');
};
const metaOf = (tag: any, field: string) =>
	findTag(tag, (t: any) => t.name === 'meta' && t.attributes?.['data-field'] === field)?.attributes?.content;

describe('plan-progress (sugar over aggregate)', () => {
	it('lowers to an aggregate composition with the plan defaults', () => {
		const agg = aggOf('{% plan-progress /%}');
		expect(agg).toBeDefined();
		expect(agg!.name).toBe('section');
		expect(metaOf(agg, 'aggregate-type')).toBe('work,bug');
		expect(metaOf(agg, 'aggregate-group')).toBe('status');
		expect(metaOf(agg, 'aggregate-value')).toBe('status:/^(done|fixed|accepted|complete)$/');
		expect(metaOf(agg, 'aggregate-filter')).toBe('');
	});

	it('the default body composes a progress preamble + per-status badge template + fallback', () => {
		const body = metaOf(aggOf('{% plan-progress /%}'), 'aggregate-body') ?? '';
		expect(body).toContain('{% progress value=$item.value max=$item.count %}');
		expect(body).toContain('{% badge type="status" %}');
		expect(body).toContain('humanize($item.key)');
		// three hr-delimited zones: preamble / template / fallback
		expect((body.match(/^---$/gm) ?? []).length).toBe(2);
	});

	it('type= scopes to a single type', () => {
		expect(metaOf(aggOf('{% plan-progress type="work" /%}'), 'aggregate-type')).toBe('work');
	});

	it('legacy show="all" expands to the full plan set; show=<type> passes through', () => {
		expect(metaOf(aggOf('{% plan-progress show="all" /%}'), 'aggregate-type')).toBe('work,bug,spec,decision,milestone');
		expect(metaOf(aggOf('{% plan-progress show="bug" /%}'), 'aggregate-type')).toBe('bug');
	});

	it('milestone= lowers to a filter="milestone:…" clause', () => {
		expect(metaOf(aggOf('{% plan-progress milestone="v0.19.0" /%}'), 'aggregate-filter')).toBe('milestone:v0.19.0');
	});

	it('value= overrides the achieved-status union', () => {
		expect(metaOf(aggOf('{% plan-progress value="status:done" /%}'), 'aggregate-value')).toBe('status:done');
	});

	// Author body override (readDeferredBody) is a content-loader concern
	// (captureDeferredBodies runs pre-transform), exercised at the pipeline level
	// rather than in this transform-only harness — see the aggregate resolver tests.
});

// End-to-end: the lowered composition actually resolves through the core
// `resolveAggregates` into a progress bar + per-status badges. The default body
// is baked into the `aggregate-body` meta at transform time, so no loader step is
// needed for the self-closing form.
describe('plan-progress resolves to a progress bar + status badges', () => {
	const pluginRunes: Record<string, any> = {};
	for (const [name, entry] of Object.entries(plan.runes)) {
		pluginRunes[name] = defineRune({ name, schema: (entry as any).transform, aliases: (entry as any).aliases });
	}
	const tags = { ...coreTags, ...runeTagMap(pluginRunes), ...Markdoc.tags } as any;
	const ctx = { info() {}, warn() {}, error() {} } as any;
	const reg = {
		register() {},
		getAll: (type: string) => entries.filter(e => e.type === type),
		getById: (type: string, id: string) => entries.find(e => e.type === type && e.id === id),
		getByUrl: () => [],
		getTypes: () => [...new Set(entries.map(e => e.type))],
	} as any;
	const entries = [
		{ type: 'work', id: 'W-1', sourceUrl: '/work/W-1/', data: { status: 'done' } },
		{ type: 'work', id: 'W-2', sourceUrl: '/work/W-2/', data: { status: 'done' } },
		{ type: 'work', id: 'W-3', sourceUrl: '/work/W-3/', data: { status: 'ready' } },
		{ type: 'bug', id: 'B-1', sourceUrl: '/bug/B-1/', data: { status: 'fixed' } },
		{ type: 'bug', id: 'B-2', sourceUrl: '/bug/B-2/', data: { status: 'confirmed' } },
	];

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
		// Production threads `functions` into the embed config (site.ts) so body
		// templates can call humanize/date; mirror that here.
		return resolveAggregates(transformed, '/p/', reg, { tags, nodes, functions } as any, ctx);
	})();

	it('emits a progress bar reading achieved-of-total (3 of 5 done)', () => {
		const progress = findTag(resolved as any, t => t.attributes?.['data-rune'] === 'progress');
		expect(progress).toBeDefined();
		expect(textOf(progress)).toContain('3 of 5');
	});

	it('emits one status-typed badge per status with its count', () => {
		const badges = findAllTags(resolved as any, t => t.attributes?.['data-rune'] === 'badge');
		expect(badges.length).toBe(4); // done, ready, fixed, confirmed
		expect(badges.every(b => b.attributes?.['data-meta-type'] === 'status')).toBe(true);
		// the `done` group's badge carries its count + humanized label (colour is
		// deferred — see the sentiment-projection follow-up)
		const done = badges.find(b => textOf(b).includes('Done'));
		expect(done).toBeDefined();
		expect(textOf(done)).toContain('2'); // two work items are done
	});
});
