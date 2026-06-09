import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { parse, findTag, findAllTags } from './helpers.js';
import { tags as coreTags, nodes, functions, runeTagMap, defineRune, resolveCollections } from '@refrakt-md/runes';
import { plan } from '../src/index.js';

// ─── Lowering: backlog → collection metas + composed default body (WORK-342) ───
const collOf = (src: string) => findTag(parse(src) as any, t => t.attributes['data-rune'] === 'collection');
const metaOf = (tag: any, field: string) =>
	findTag(tag, (t: any) => t.name === 'meta' && t.attributes?.['data-field'] === field)?.attributes?.content;

describe('backlog (sugar over collection)', () => {
	it('defaults to cards layout with a card + bar header body', () => {
		const c = collOf('{% backlog /%}');
		expect(metaOf(c, 'collection-layout')).toBe('cards');
		expect(metaOf(c, 'collection-type')).toBe('work,bug');
		const body = metaOf(c, 'collection-body') ?? '';
		expect(body).toContain('{% card href=$item.url %}');
		expect(body).toContain('{% bar %}');
		expect(body).toContain('{% $item.identifier %}');
		expect(body).toContain('sentiment=$item.sentiment');
		expect(body).toContain('{% if $item.mixed %}');
	});

	it('layout="table" forwards the table layout + a heading-column body', () => {
		const c = collOf('{% backlog layout="table" /%}');
		expect(metaOf(c, 'collection-layout')).toBe('table');
		const body = metaOf(c, 'collection-body') ?? '';
		expect(body).toContain('# Identifier');
		expect(body).toContain('# Type');
		expect(body).toContain('# Status');
		expect(body).toContain('# Title');
	});

	it('layout="list" forwards list (still the card body)', () => {
		expect(metaOf(collOf('{% backlog layout="list" /%}'), 'collection-layout')).toBe('list');
	});

	it('show widens the type set; default stays work,bug', () => {
		expect(metaOf(collOf('{% backlog show="all" /%}'), 'collection-type')).toBe('work,bug');
		expect(metaOf(collOf('{% backlog show="spec" /%}'), 'collection-type')).toBe('spec');
	});

	it('a single-type backlog surfaces that type\'s key field; mixed stays universal', () => {
		expect(metaOf(collOf('{% backlog show="work" /%}'), 'collection-body')).toContain('$item.data.priority');
		expect(metaOf(collOf('{% backlog show="bug" /%}'), 'collection-body')).toContain('$item.data.severity');
		// mixed (work,bug) → no type-specific field, just the universal projection
		expect(metaOf(collOf('{% backlog /%}'), 'collection-body')).not.toContain('$item.data.priority');
	});
});

// ─── End-to-end: backlog resolves to cards with a bar header + status badge ───
describe('backlog resolves through collection (WORK-342)', () => {
	const pluginRunes: Record<string, any> = {};
	for (const [name, entry] of Object.entries(plan.runes)) {
		pluginRunes[name] = defineRune({ name, schema: (entry as any).transform, aliases: (entry as any).aliases });
	}
	const tags = { ...coreTags, ...runeTagMap(pluginRunes), ...Markdoc.tags } as any;
	const ctx = { info() {}, warn() {}, error() {} } as any;
	const sentiments = { work: { status: { done: 'positive', ready: 'neutral' } }, bug: { status: { fixed: 'positive', confirmed: 'caution' } } };
	const mk = (entries: any[]) => ({
		register() {}, getAll: (t: string) => entries.filter(e => e.type === t),
		getById: (t: string, i: string) => entries.find(e => e.type === t && e.id === i),
		getByUrl: () => [], getTypes: () => [...new Set(entries.map(e => e.type))],
	} as any);
	const resolve = (src: string, reg: any) => {
		const tr = Markdoc.transform(Markdoc.parse(src), { tags, nodes, functions, variables: {} } as never);
		return resolveCollections(tr, '/p/', reg, { tags, nodes, functions, sentiments } as any, ctx);
	};
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
	const cat = (out: any) => findAllTags(out, (t: any) => t.attributes?.['data-rune'] === 'badge' && t.attributes?.['data-meta-type'] === 'category');

	it('renders a card with a bar (identifier + sentiment-coloured status badge)', () => {
		const reg = mk([{ type: 'work', id: 'WORK-1', sourceUrl: '/w/1/', data: { title: 'Alpha', status: 'done' } }]);
		const out = resolve('{% backlog show="work" /%}', reg);
		const cards = findAllTags(out, (t: any) => t.attributes?.['data-rune'] === 'card');
		expect(cards.length).toBe(1);
		const bar = findTag(cards[0], (t: any) => t.attributes?.['data-rune'] === 'bar');
		expect(bar).toBeDefined();
		expect(textOf(bar)).toContain('WORK-1');
		const status = findTag(cards[0], (t: any) => t.attributes?.['data-rune'] === 'badge' && t.attributes?.['data-meta-type'] === 'status');
		expect(status?.attributes?.['data-meta-sentiment']).toBe('positive');
	});

	it('shows a type chip per card for a mixed set, omits it for a single type', () => {
		const mixed = resolve('{% backlog /%}', mk([
			{ type: 'work', id: 'WORK-1', sourceUrl: '/w/1/', data: { title: 'A', status: 'ready' } },
			{ type: 'bug', id: 'BUG-1', sourceUrl: '/b/1/', data: { title: 'B', status: 'confirmed' } },
		]));
		expect(cat(mixed).length).toBe(2);

		const single = resolve('{% backlog show="work" /%}', mk([
			{ type: 'work', id: 'WORK-1', sourceUrl: '/w/1/', data: { title: 'A', status: 'ready' } },
		]));
		expect(cat(single).length).toBe(0);
	});

	it('layout="table" renders an Identifier/Type/Status/Title table', () => {
		const reg = mk([{ type: 'milestone', id: '', sourceUrl: '/m/v1/', data: { name: 'v1.0.0', status: 'active' } }]);
		const out = resolve('{% backlog show="milestone" layout="table" /%}', reg);
		const ths = findAllTags(out, (t: any) => t.name === 'th').map(textOf);
		expect(ths).toEqual(['Identifier', 'Type', 'Status', 'Title']);
		// identifier falls back to `name` for a milestone (no id)
		expect(textOf(findAllTags(out, (t: any) => t.name === 'tbody')[0])).toContain('v1.0.0');
	});
});
