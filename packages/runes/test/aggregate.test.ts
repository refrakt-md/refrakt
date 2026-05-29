import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';
import { captureDeferredBodies } from '../src/deferred-body.js';
import { resolveAggregates } from '../src/aggregate-resolve.js';
import type { CollectionEmbedConfig } from '../src/collection-helpers.js';
import type { EntityRegistration, EntityRegistry, PipelineContext } from '@refrakt-md/types';

const ctx: PipelineContext = { info() {}, warn() {}, error() {} };

function registry(entries: EntityRegistration[]): EntityRegistry {
	return {
		register() {},
		getAll: (type) => entries.filter((e) => e.type === type),
		getById: (type, id) => entries.find((e) => e.type === type && e.id === id),
		getByUrl: () => [],
		getTypes: () => [...new Set(entries.map((e) => e.type))],
	} as EntityRegistry;
}

function render(src: string, reg: EntityRegistry, embed?: CollectionEmbedConfig): RenderableTreeNode {
	const ast = Markdoc.parse(src);
	captureDeferredBodies(ast, (n) => Boolean((tags as Record<string, { deferBody?: boolean }>)[n]?.deferBody));
	const transformed = Markdoc.transform(ast, { tags, nodes, variables: {} } as never);
	const config: CollectionEmbedConfig = embed ?? { tags: tags as never, nodes: nodes as never };
	return resolveAggregates(transformed, '/p/', reg, config, ctx) as RenderableTreeNode;
}

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
const cls = (node: unknown, c: string) => findAll(node, (t) => t.attributes.class === c);

/** Flatten all string/number text content of a node into a single string. Used
 *  to assert template bindings (Markdoc keeps inserted numbers as numbers, so
 *  JSON.stringify shows `"value=",4` rather than `"value=4"`). */
function textOf(node: unknown): string {
	let out = '';
	const walk = (n: unknown) => {
		if (n == null) return;
		if (typeof n === 'string' || typeof n === 'number' || typeof n === 'boolean') {
			out += String(n);
			return;
		}
		if (Array.isArray(n)) { n.forEach(walk); return; }
		if (Markdoc.Tag.isTag(n as never)) {
			((n as InstanceType<typeof Markdoc.Tag>).children ?? []).forEach(walk);
		}
	};
	walk(node);
	return out;
}

const work = (id: string, data: Record<string, unknown>): EntityRegistration =>
	({ type: 'work', id, sourceUrl: `/work/${id}/`, data });
const bug = (id: string, data: Record<string, unknown>): EntityRegistration =>
	({ type: 'bug', id, sourceUrl: `/bug/${id}/`, data });

describe('aggregate rune (SPEC-076)', () => {
	describe('no-body single-number form', () => {
		it('emits an inline span carrying the count of entities matching the query', () => {
			const reg = registry([
				work('W-1', { status: 'done' }),
				work('W-2', { status: 'done' }),
				work('W-3', { status: 'ready' }),
			]);
			const out = render('Done: {% aggregate type="work" filter="status:done" /%}.', reg);
			const spans = findAll(out, (t) => t.name === 'span' && t.attributes['data-rune'] === 'aggregate');
			expect(spans).toHaveLength(1);
			expect(spans[0].attributes['data-aggregate']).toBe('count');
			expect(spans[0].attributes['data-count']).toBe('2');
			expect(spans[0].children).toEqual(['2']);
		});

		it('emits zero when nothing matches', () => {
			const reg = registry([work('W-1', { status: 'ready' })]);
			const out = render('{% aggregate type="work" filter="status:done" /%}', reg);
			const spans = findAll(out, (t) => t.attributes['data-rune'] === 'aggregate');
			expect(spans[0].children).toEqual(['0']);
			expect(spans[0].attributes['data-count']).toBe('0');
		});

		it('supports mixed types (type="work,bug")', () => {
			const reg = registry([
				work('W-1', { status: 'done' }),
				bug('B-1', { status: 'done' }),
				bug('B-2', { status: 'ready' }),
			]);
			const out = render('{% aggregate type="work,bug" filter="status:done" /%}', reg);
			const spans = findAll(out, (t) => t.attributes['data-rune'] === 'aggregate');
			expect(spans[0].children).toEqual(['2']);
		});
	});

	describe('body-zoned form', () => {
		const reg = registry([
			work('W-1', { status: 'done' }),
			work('W-2', { status: 'done' }),
			work('W-3', { status: 'ready' }),
			work('W-4', { status: 'in-progress' }),
		]);

		it('preamble binds $item to the totals projection (count / value / percent / total)', () => {
			const out = render(
				'{% aggregate type="work" value="status:done" %}\nDone {% $item.value %} of {% $item.count %} ({% $item.percent %}%, total {% $item.total %})\n---\n- {% $item.key %}: {% $item.count %}\n{% /aggregate %}',
				reg,
			);
			const pre = cls(out, 'rf-aggregate__preamble');
			expect(pre).toHaveLength(1);
			const blob = JSON.stringify(pre[0]);
			expect(blob).toContain('Done');
			expect(blob).toContain('2'); // value
			expect(blob).toContain('4'); // count + total
			expect(blob).toContain('50'); // percent (2/4*100)
		});

		it('without `value` attribute, $item.value falls back to count and $item.percent is 100', () => {
			const out = render(
				'{% aggregate type="work" %}\nvalue={% $item.value %} count={% $item.count %} percent={% $item.percent %}\n{% /aggregate %}',
				reg,
			);
			const items = cls(out, 'rf-aggregate__items');
			expect(items).toHaveLength(1);
			const text = textOf(items[0]);
			expect(text).toContain('value=4');
			expect(text).toContain('count=4');
			expect(text).toContain('percent=100');
		});

		it('template binds $item per group (key / count / value / percent / total / shown)', () => {
			const out = render(
				'{% aggregate type="work" value="status:done" group="status" %}\n---\n[{% $item.key %}] {% $item.value %}/{% $item.count %} pct={% $item.percent %} total={% $item.total %} shown={% $item.shown %}\n{% /aggregate %}',
				reg,
			);
			const groups = cls(out, 'rf-aggregate__group');
			const keys = groups.map((g) => g.attributes['data-group']);
			expect(keys).toEqual(expect.arrayContaining(['done', 'ready', 'in-progress']));

			const done = groups.find((g) => g.attributes['data-group'] === 'done')!;
			const doneText = textOf(done);
			// done: count=2, value=2, percent=100, total=4
			expect(doneText).toContain('[done]');
			expect(doneText).toContain('2/2');
			expect(doneText).toContain('pct=100');
			expect(doneText).toContain('total=4');
			expect(doneText).toContain('shown=3');

			const ready = groups.find((g) => g.attributes['data-group'] === 'ready')!;
			const readyText = textOf(ready);
			// ready: count=1, value=0, percent=0, total=4
			expect(readyText).toContain('[ready]');
			expect(readyText).toContain('0/1');
			expect(readyText).toContain('pct=0');
			expect(readyText).toContain('total=4');
		});

		it('fallback zone binds all numeric fields to 0 when no entities match', () => {
			const empty = registry([work('W-1', { status: 'ready' })]);
			const out = render(
				'{% aggregate type="work" filter="status:zzz" %}\npreamble\n---\ntemplate\n---\nNothing — count={% $item.count %} total={% $item.total %} value={% $item.value %} percent={% $item.percent %}\n{% /aggregate %}',
				empty,
			);
			const fallback = cls(out, 'rf-aggregate__empty');
			expect(fallback).toHaveLength(1);
			const text = textOf(fallback[0]);
			expect(text).toContain('Nothing');
			expect(text).toContain('count=0');
			expect(text).toContain('total=0');
			expect(text).toContain('value=0');
			expect(text).toContain('percent=0');
			expect(cls(out, 'rf-aggregate__preamble')).toHaveLength(0);
			expect(cls(out, 'rf-aggregate__items')).toHaveLength(0);
		});

		it('group= omitted renders the body once with totals on $item', () => {
			const out = render(
				'{% aggregate type="work" value="status:done" %}\nProgress: {% $item.value %} of {% $item.count %} ({% $item.percent %}%)\n{% /aggregate %}',
				reg,
			);
			const items = cls(out, 'rf-aggregate__items');
			expect(items).toHaveLength(1);
			const blob = JSON.stringify(items[0]);
			expect(blob).toContain('Progress:');
			expect(blob).toContain('2'); // value
			expect(blob).toContain('4'); // count
			expect(blob).toContain('50'); // percent
			expect(cls(out, 'rf-aggregate__group')).toHaveLength(0);
		});

		it('value sub-filter math — counts entities matching both filter and value', () => {
			const data = registry([
				work('W-1', { status: 'done', team: 'alpha' }),
				work('W-2', { status: 'done', team: 'alpha' }),
				work('W-3', { status: 'ready', team: 'alpha' }),
				work('W-4', { status: 'done', team: 'beta' }),
			]);
			// Primary set = team:alpha (3 entities); achieved = team:alpha AND status:done (2).
			const out = render(
				'{% aggregate type="work" filter="team:alpha" value="status:done" %}\n{% $item.value %} / {% $item.count %} ({% $item.percent %}%)\n{% /aggregate %}',
				data,
			);
			const blob = JSON.stringify(cls(out, 'rf-aggregate__items')[0]);
			expect(blob).toContain('2');  // value
			expect(blob).toContain('3');  // count
			expect(blob).toContain('67'); // percent: round(2/3*100) = 67
		});

		it('limit caps the number of rendered groups; $item.shown reflects the post-limit count', () => {
			const out = render(
				'{% aggregate type="work" group="status" sort="-count" limit=2 %}\n---\n{% $item.key %}:shown={% $item.shown %}\n{% /aggregate %}',
				reg,
			);
			const groups = cls(out, 'rf-aggregate__group');
			expect(groups).toHaveLength(2);
			for (const g of groups) expect(textOf(g)).toContain('shown=2');
		});

		it('sort="-count" orders groups by descending member count', () => {
			const data = registry([
				work('W-1', { status: 'done' }),
				work('W-2', { status: 'done' }),
				work('W-3', { status: 'done' }),
				work('W-4', { status: 'ready' }),
			]);
			const out = render(
				'{% aggregate type="work" group="status" sort="-count" %}\n---\n{% $item.key %}\n{% /aggregate %}',
				data,
			);
			const groups = cls(out, 'rf-aggregate__group');
			expect(groups.map((g) => g.attributes['data-group'])).toEqual(['done', 'ready']);
		});

		it('honors SPEC-072 domain-aware ordering for the group field by default', () => {
			// Provide explicit orderings override so 'work.status' has a domain order.
			const data = registry([
				work('W-1', { status: 'done' }),
				work('W-2', { status: 'todo' }),
				work('W-3', { status: 'doing' }),
			]);
			const embed: CollectionEmbedConfig = {
				tags: tags as never,
				nodes: nodes as never,
				orderings: { work: { status: ['todo', 'doing', 'done'] } },
			};
			const out = render(
				'{% aggregate type="work" group="status" %}\n---\n{% $item.key %},\n{% /aggregate %}',
				data,
				embed,
			);
			const groups = cls(out, 'rf-aggregate__group');
			expect(groups.map((g) => g.attributes['data-group'])).toEqual(['todo', 'doing', 'done']);
		});

		it('empty= attribute renders a string fallback when no entities match (no body fallback zone)', () => {
			const noData = registry([work('W-1', { status: 'open' })]);
			const out = render(
				'{% aggregate type="work" filter="status:zzz" empty="Nothing yet." %}\nignored\n{% /aggregate %}',
				noData,
			);
			const fallback = cls(out, 'rf-aggregate__empty');
			expect(fallback).toHaveLength(1);
			expect(JSON.stringify(fallback[0])).toContain('Nothing yet.');
		});

		it('the body fallback zone wins over the empty= attribute (same precedence as collection)', () => {
			const noData = registry([]);
			const out = render(
				'{% aggregate type="work" empty="attr fallback" %}\npre\n---\ntmpl\n---\nbody fallback\n{% /aggregate %}',
				noData,
			);
			const fallback = cls(out, 'rf-aggregate__empty');
			expect(fallback).toHaveLength(1);
			const blob = JSON.stringify(fallback[0]);
			expect(blob).toContain('body fallback');
			expect(blob).not.toContain('attr fallback');
		});

		it('outer wrapper is a <section> for body forms; data-aggregate marks it as a breakdown', () => {
			const out = render(
				'{% aggregate type="work" %}\nx={% $item.count %}\n{% /aggregate %}',
				reg,
			);
			const root = findAll(out, (t) => t.attributes['data-rune'] === 'aggregate')[0];
			expect(root.name).toBe('section');
			expect(root.attributes['data-aggregate']).toBe('breakdown');
		});
	});
});
