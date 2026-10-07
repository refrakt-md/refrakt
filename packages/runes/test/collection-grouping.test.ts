import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import type { EntityRegistration, EntityRegistry, PipelineContext } from '@refrakt-md/types';
import { tags, nodes } from '../src/index.js';
import { captureDeferredBodies } from '../src/deferred-body.js';
import { resolveAggregates } from '../src/aggregate-resolve.js';
import { resolveCollections } from '../src/collection-resolve.js';
import {
	buildOrdering,
	fieldValue,
	groupEntities,
	groupKeys,
	sortEntities,
	type CollectionEmbedConfig,
} from '../src/collection-helpers.js';

// BUG-025 — grouping by a multi-value field fans the entity out across one
// group per member, using the same split the filter side (`candidates()`)
// applies, instead of keying on the display join.

const ctx: PipelineContext = { info() {}, warn() {}, error() {} };

function ent(type: string, id: string, data: Record<string, unknown>): EntityRegistration {
	return { type, id, sourceUrl: `/${type}/${id}/`, data };
}

function registry(entries: EntityRegistration[]): EntityRegistry {
	return {
		register() {},
		getAll: (type) => entries.filter((e) => e.type === type),
		getById: (type, id) => entries.find((e) => e.type === type && e.id === id),
		getByUrl: () => [],
		getTypes: () => [...new Set(entries.map((e) => e.type))],
	} as EntityRegistry;
}

function transform(src: string) {
	const ast = Markdoc.parse(src);
	captureDeferredBodies(ast, (n) =>
		Boolean((tags as Record<string, { deferBody?: boolean }>)[n]?.deferBody),
	);
	return Markdoc.transform(ast, { tags, nodes, variables: {} } as never);
}

const config: CollectionEmbedConfig = { tags: tags as never, nodes: nodes as never };

function findAll(node: unknown, pred: (t: InstanceType<typeof Markdoc.Tag>) => boolean) {
	const out: InstanceType<typeof Markdoc.Tag>[] = [];
	const walk = (n: unknown) => {
		if (Array.isArray(n)) return n.forEach(walk);
		if (!Markdoc.Tag.isTag(n as never)) return;
		const t = n as InstanceType<typeof Markdoc.Tag>;
		if (pred(t)) out.push(t);
		(t.children ?? []).forEach(walk);
	};
	walk(node);
	return out;
}

function textOf(node: unknown): string {
	let out = '';
	const walk = (n: unknown) => {
		if (n == null) return;
		if (typeof n === 'string' || typeof n === 'number') out += String(n);
		else if (Array.isArray(n)) n.forEach(walk);
		else if (Markdoc.Tag.isTag(n as never))
			((n as InstanceType<typeof Markdoc.Tag>).children ?? []).forEach(walk);
	};
	walk(node);
	return out;
}

const groupMap = (g: Map<string, EntityRegistration[]>) =>
	Object.fromEntries([...g].map(([k, es]) => [k, es.map((e) => e.id)]));

const tagged = [
	ent('work', 'W-1', { tags: 'runes, data, csv', status: 'done' }),
	ent('work', 'W-2', { tags: 'runes', status: 'ready' }),
	ent('work', 'W-3', { tags: 'data,lumina', status: 'done' }),
	ent('work', 'W-4', { status: 'ready' }),
];

describe('groupKeys (BUG-025)', () => {
	it('splits a comma-string into trimmed members', () => {
		expect(groupKeys(tagged[0], 'tags')).toEqual(['runes', 'data', 'csv']);
	});

	it('fans a genuine array out by element', () => {
		expect(groupKeys(ent('work', 'A', { tags: ['x', ' y '] }), 'tags')).toEqual(['x', 'y']);
	});

	it('a single value is one key, and a missing value is `(none)`', () => {
		expect(groupKeys(tagged[1], 'status')).toEqual(['ready']);
		expect(groupKeys(tagged[3], 'tags')).toEqual(['(none)']);
		expect(groupKeys(ent('work', 'A', { tags: '' }), 'tags')).toEqual(['(none)']);
	});

	it('drops empty members and de-duplicates within one entity', () => {
		expect(groupKeys(ent('work', 'A', { tags: 'a, , b' }), 'tags')).toEqual(['a', 'b']);
		expect(groupKeys(ent('work', 'A', { tags: 'a, a, b,' }), 'tags')).toEqual(['a', 'b']);
		expect(groupKeys(ent('work', 'A', { tags: ' , ' }), 'tags')).toEqual(['(none)']);
	});

	it('leaves the display join alone', () => {
		expect(fieldValue(ent('work', 'A', { tags: ['x', 'y'] }), 'tags')).toBe('x, y');
	});
});

describe('groupEntities fans multi-value fields out (BUG-025)', () => {
	it('group="tags" yields one group per tag, an entity in every group it carries', () => {
		expect(groupMap(groupEntities(tagged, 'tags'))).toEqual({
			runes: ['W-1', 'W-2'],
			data: ['W-1', 'W-3'],
			csv: ['W-1'],
			lumina: ['W-3'],
			'(none)': ['W-4'],
		});
	});

	it('an empty member of a comma-string joins no group', () => {
		const g = groupEntities([ent('work', 'A', { tags: 'a, , b' })], 'tags');
		expect([...g.keys()]).toEqual(['a', 'b']);
	});

	it('single-valued grouping is unchanged', () => {
		const ord = buildOrdering({
			tags: { work: { attributes: { status: { matches: ['ready', 'done'] } } } },
			nodes: {},
		} as never);
		expect(groupMap(groupEntities(tagged, 'status', ord))).toEqual({
			ready: ['W-2', 'W-4'],
			done: ['W-1', 'W-3'],
		});
		expect(groupMap(groupEntities(tagged, 'priority'))).toEqual({
			'(none)': ['W-1', 'W-2', 'W-3', 'W-4'],
		});
	});

	it('orders fanned-out groups by domain rank when the field has an ordering', () => {
		const ord = buildOrdering({
			tags: { work: { attributes: { area: { matches: ['core', 'theme', 'docs'] } } } },
			nodes: {},
		} as never);
		const items = [
			ent('work', 'A', { area: 'docs, theme' }),
			ent('work', 'B', { area: 'core' }),
			ent('work', 'C', { area: 'other' }),
		];
		expect(groupMap(groupEntities(items, 'area', ord))).toEqual({
			core: ['B'],
			theme: ['A'],
			docs: ['A'],
			other: ['C'],
		});
		expect([...groupEntities(items, 'area', ord).keys()]).toEqual([
			'core',
			'theme',
			'docs',
			'other',
		]);
	});
});

describe('aggregate counts per member, not per combination (BUG-025)', () => {
	// The case from the bug: counting work items per spec. A work item that
	// lists two specs used to land in a combined `SPEC-008, SPEC-051` group,
	// so each spec's own total read low.
	const reg = registry([
		ent('work', 'W-1', { source: 'SPEC-008', status: 'done' }),
		ent('work', 'W-2', { source: 'SPEC-008', status: 'ready' }),
		ent('work', 'W-3', { source: 'SPEC-008, SPEC-051', status: 'done' }),
		ent('work', 'W-4', { source: 'SPEC-051', status: 'done' }),
		ent('work', 'W-5', { status: 'ready' }),
	]);

	it('counts work items per spec', () => {
		const out = resolveAggregates(
			transform(
				'{% aggregate type="work" value="status:done" group="source" %}\n---\n{% $item.key %}={% $item.value %}/{% $item.count %} of {% $item.total %}\n{% /aggregate %}',
			),
			'/p/',
			reg,
			config,
			ctx,
		) as RenderableTreeNode;
		const groups = findAll(out, (t) => t.attributes.class === 'rf-aggregate__group');
		const byKey = Object.fromEntries(
			groups.map((g) => [g.attributes['data-group'], textOf(g).trim()]),
		);
		expect(byKey).toEqual({
			'SPEC-008': 'SPEC-008=2/3 of 5',
			'SPEC-051': 'SPEC-051=2/2 of 5',
			'(none)': '(none)=0/1 of 5',
		});
	});

	it('the chart layout draws one bar per member', () => {
		const out = resolveAggregates(
			transform('{% aggregate type="work" group="source" layout="chart" /%}'),
			'/p/',
			reg,
			config,
			ctx,
		) as RenderableTreeNode;
		// The no-JS fallback table: one row per member (labels are humanized).
		const rows = findAll(out, (t) => t.name === 'tr')
			.slice(1)
			.map((tr) => findAll(tr, (t) => t.name === 'td').map(textOf));
		expect(rows).toEqual([
			['SPEC 008', '3'],
			['SPEC 051', '2'],
			['(None)', '1'],
		]);
	});
});

describe('collection group="tags" (BUG-025)', () => {
	it('renders one group heading per tag, with the entity under each', () => {
		const out = resolveCollections(
			transform('{% collection type="work" group="tags" /%}'),
			'/p/',
			registry(tagged),
			config,
			ctx,
		) as RenderableTreeNode;
		const groups = findAll(out, (t) => t.attributes.class === 'rf-collection__group');
		const byKey = Object.fromEntries(
			groups.map((g) => [
				g.attributes['data-group'],
				findAll(g, (t) => t.attributes['data-entity-id'] !== undefined).map(
					(t) => t.attributes['data-entity-id'],
				),
			]),
		);
		expect(byKey).toEqual({
			runes: ['W-1', 'W-2'],
			data: ['W-1', 'W-3'],
			csv: ['W-1'],
			lumina: ['W-3'],
			'(none)': ['W-4'],
		});
	});
});

describe('sortEntities on a multi-value field (BUG-025)', () => {
	// Rule: ascending sorts an entity by its smallest member, descending by its
	// largest (MongoDB's array-sort rule). A single value sorts as before.
	it('ascending uses the smallest member, not the joined string', () => {
		const items = [
			ent('work', 'A', { tags: 'zeta, beta' }), // smallest: beta
			ent('work', 'B', { tags: 'alpha' }),
			ent('work', 'C', { tags: 'gamma' }),
		];
		expect(sortEntities(items, 'tags').map((e) => e.id)).toEqual(['B', 'A', 'C']);
	});

	it('descending uses the largest member', () => {
		const items = [
			ent('work', 'A', { tags: 'beta, zeta' }), // largest: zeta
			ent('work', 'B', { tags: 'gamma' }),
			ent('work', 'C', { tags: 'alpha' }),
		];
		expect(sortEntities(items, '-tags').map((e) => e.id)).toEqual(['A', 'B', 'C']);
	});

	it('a ranked field uses the best- (asc) or worst- (desc) ranked member', () => {
		const ord = buildOrdering({
			tags: { work: { attributes: { area: { matches: ['core', 'theme', 'docs'] } } } },
			nodes: {},
		} as never);
		const items = [
			ent('work', 'A', { area: 'docs, core' }),
			ent('work', 'B', { area: 'theme' }),
			ent('work', 'C', { area: 'unknown' }),
		];
		expect(sortEntities(items, 'area', ord).map((e) => e.id)).toEqual(['A', 'B', 'C']);
		expect(sortEntities(items, '-area', ord).map((e) => e.id)).toEqual(['A', 'B', 'C']);
		const items2 = [ent('work', 'A', { area: 'theme, core' }), ent('work', 'B', { area: 'docs' })];
		expect(sortEntities(items2, '-area', ord).map((e) => e.id)).toEqual(['B', 'A']);
	});
});
