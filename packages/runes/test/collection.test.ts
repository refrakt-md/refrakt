import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';
import { captureDeferredBodies } from '../src/deferred-body.js';
import { resolveCollections } from '../src/collection-resolve.js';
import type { EntityRegistration, EntityRegistry, PipelineContext } from '@refrakt-md/types';

const ctx: PipelineContext = { info() {}, warn() {}, error() {} };

function registry(entries: EntityRegistration[]): EntityRegistry {
	return {
		register() {},
		getAll: (type) => entries.filter((e) => e.type === type),
		getById: (type, id) => entries.find((e) => e.type === type && e.id === id),
		getByUrl: (type, url) => entries.filter((e) => e.type === type && e.sourceUrl === url),
		getTypes: () => [...new Set(entries.map((e) => e.type))],
	} as EntityRegistry;
}

function render(src: string, reg: EntityRegistry): RenderableTreeNode {
	const ast = Markdoc.parse(src);
	captureDeferredBodies(ast, (n) => Boolean((tags as Record<string, { deferBody?: boolean }>)[n]?.deferBody));
	const transformed = Markdoc.transform(ast, { tags, nodes, variables: {} } as never);
	return resolveCollections(transformed, '/p/', reg, { tags, nodes }, ctx) as RenderableTreeNode;
}

function findAll(node: unknown, pred: (t: InstanceType<typeof Markdoc.Tag>) => boolean): InstanceType<typeof Markdoc.Tag>[] {
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

const work = (id: string, data: Record<string, unknown>): EntityRegistration => ({
	type: 'work', id, sourceUrl: `/work/${id}/`, data,
});

describe('collection resolver', () => {
	const reg = registry([
		work('W-1', { title: 'Alpha', status: 'ready', priority: 'high' }),
		work('W-2', { title: 'Beta', status: 'done', priority: 'low' }),
		work('W-3', { title: 'Gamma', status: 'ready', priority: 'critical' }),
	]);

	it('renders cards with title links and projected fields', () => {
		const out = render('{% collection type="work" layout="grid" fields="status,priority" /%}', reg);
		const cards = findAll(out, (t) => t.attributes.class === 'rf-collection__card');
		expect(cards).toHaveLength(3);
		const titles = findAll(out, (t) => t.attributes.class === 'rf-collection__title');
		expect(titles.some((t) => (t.children ?? []).includes('Alpha'))).toBe(true);
		const fields = findAll(out, (t) => t.attributes['data-field'] === 'status');
		expect(fields.length).toBeGreaterThan(0);
	});

	it('applies a field:value filter', () => {
		const out = render('{% collection type="work" filter="status:ready" layout="grid" /%}', reg);
		const cards = findAll(out, (t) => t.attributes.class === 'rf-collection__card');
		expect(cards).toHaveLength(2);
		expect(cards.map((c) => c.attributes['data-entity-id']).sort()).toEqual(['W-1', 'W-3']);
	});

	it('renders a table with a header row and one row per entity', () => {
		const out = render('{% collection type="work" layout="table" fields="status" /%}', reg);
		const tables = findAll(out, (t) => t.name === 'table');
		expect(tables).toHaveLength(1);
		const rows = findAll(out, (t) => t.name === 'tr' && t.attributes['data-entity-id'] !== undefined);
		expect(rows).toHaveLength(3);
	});

	it('groups items when group is set', () => {
		const out = render('{% collection type="work" group="status" layout="grid" /%}', reg);
		const groups = findAll(out, (t) => t.attributes.class === 'rf-collection__group');
		expect(groups.length).toBe(2); // ready, done
	});

	it('renders heading-delimited table columns with per-cell $item templates', () => {
		const out = render(
			'{% collection type="work" filter="status:ready" layout="table" %}\n## Title\n{% $item.data.title %}\n\n## Status\n{% $item.data.status %}\n{% /collection %}',
			reg,
		);
		const tables = findAll(out, (t) => t.name === 'table');
		expect(tables).toHaveLength(1);
		// Two heading-derived columns
		const ths = findAll(out, (t) => t.name === 'th');
		expect(ths.map((t) => (t.children ?? [])[0])).toEqual(['Title', 'Status']);
		// One row per ready entity, each with 2 cells
		const rows = findAll(out, (t) => t.name === 'tr' && t.attributes['data-entity-id'] !== undefined);
		expect(rows).toHaveLength(2);
		const blob = JSON.stringify(out);
		expect(blob).toContain('Alpha');
		expect(blob).toContain('Gamma');
		expect(blob).not.toContain('Beta');
	});

	it('renders a per-entity body template with $item bound', () => {
		const out = render(
			'{% collection type="work" filter="status:ready" sort="priority" %}\n## {% $item.data.title %}\nStatus: {% $item.data.status %} ({% $item.id %})\n{% /collection %}',
			reg,
		);
		const blob = JSON.stringify(out);
		expect(blob).toContain('Alpha');
		expect(blob).toContain('Gamma');
		expect(blob).not.toContain('Beta'); // filtered out
		expect(blob).toContain('W-1');
		// per-item wrappers
		const items = findAll(out, (t) => t.attributes.class === 'rf-collection__item');
		expect(items).toHaveLength(2);
	});
});
