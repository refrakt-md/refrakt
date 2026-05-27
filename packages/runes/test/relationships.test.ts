import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';
import { captureDeferredBodies } from '../src/deferred-body.js';
import { resolveRelationships } from '../src/relationships-resolve.js';
import type { EntityRegistration, EntityRegistry, ResolvedEdge, PipelineContext } from '@refrakt-md/types';

const ctx: PipelineContext = { info() {}, warn() {}, error() {} };

const ent = (type: string, id: string, data: Record<string, unknown>): EntityRegistration => ({
	type, id, sourceUrl: `/${type}/${id}/`, data,
});

const entities = [
	ent('work', 'WORK-1', { title: 'Build it' }),
	ent('spec', 'SPEC-1', { title: 'Spec One', status: 'accepted' }),
	ent('spec', 'SPEC-2', { title: 'Spec Two', status: 'draft' }),
	ent('bug', 'BUG-1', { title: 'Broken' }),
];
const byId = new Map(entities.map((e) => [e.id, e]));

// Edges out of WORK-1.
const edges: ResolvedEdge[] = [
	{ kind: 'implements', fromId: 'WORK-1', toId: 'SPEC-1', target: byId.get('SPEC-1')! },
	{ kind: 'implements', fromId: 'WORK-1', toId: 'SPEC-2', target: byId.get('SPEC-2')! },
	{ kind: 'blocked-by', fromId: 'WORK-1', toId: 'BUG-1', target: byId.get('BUG-1')! },
];

function registry(): EntityRegistry {
	return {
		register() {},
		getAll: (type) => entities.filter((e) => e.type === type),
		getById: (type, id) => entities.find((e) => e.type === type && e.id === id),
		getByUrl: () => [],
		getTypes: () => [...new Set(entities.map((e) => e.type))],
		getRelated: (id, opts) => {
			if (id !== 'WORK-1') return [];
			const kinds = opts?.kind ? (Array.isArray(opts.kind) ? opts.kind : [opts.kind]) : undefined;
			const types = opts?.type ? (Array.isArray(opts.type) ? opts.type : [opts.type]) : undefined;
			return edges.filter((e) => (!kinds || kinds.includes(e.kind)) && (!types || types.includes(e.target.type)));
		},
	} as EntityRegistry;
}

function render(src: string, reg: EntityRegistry): RenderableTreeNode {
	const ast = Markdoc.parse(src);
	captureDeferredBodies(ast, (n) => Boolean((tags as Record<string, { deferBody?: boolean }>)[n]?.deferBody));
	const transformed = Markdoc.transform(ast, { tags, nodes, variables: {} } as never);
	return resolveRelationships(transformed, '/p/', reg, { tags, nodes }, ctx) as RenderableTreeNode;
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

describe('relationships resolver', () => {
	it('zero-config groups edges by kind with humanized headings and title links', () => {
		const out = render('{% relationships of="WORK-1" /%}', registry());
		const groups = findAll(out, (t) => t.attributes.class === 'rf-relationships__group');
		expect(groups.map((g) => g.attributes['data-group'])).toEqual(['implements', 'blocked-by']);
		const titles = findAll(out, (t) => t.attributes.class === 'rf-relationships__group-title');
		expect(titles.map((t) => (t.children ?? [])[0])).toEqual(['Implements', 'Blocked By']);
		const links = findAll(out, (t) => t.attributes.class === 'rf-relationships__title');
		expect(links.map((l) => (l.children ?? [])[0])).toEqual(['Spec One', 'Spec Two', 'Broken']);
	});

	it('filters by kind', () => {
		const out = render('{% relationships of="WORK-1" kind="blocked-by" /%}', registry());
		const items = findAll(out, (t) => t.attributes.class === 'rf-relationships__item');
		expect(items).toHaveLength(1);
		expect(items[0].attributes['data-entity-id']).toBe('BUG-1');
	});

	it('binds $item and $kind in a per-edge body template', () => {
		const out = render(
			'{% relationships of="WORK-1" kind="implements" %}\n### {% $item.data.title %}\n{% $kind %} — {% $item.data.status %}\n{% /relationships %}',
			registry(),
		);
		const blob = JSON.stringify(out);
		expect(blob).toContain('Spec One');
		expect(blob).toContain('implements');
		expect(blob).toContain('accepted');
		const items = findAll(out, (t) => t.attributes.class === 'rf-relationships__item');
		expect(items).toHaveLength(2);
	});

	it('groups by target type when group=type', () => {
		const out = render('{% relationships of="WORK-1" group="type" /%}', registry());
		const groups = findAll(out, (t) => t.attributes.class === 'rf-relationships__group');
		expect(groups.map((g) => g.attributes['data-group'])).toEqual(['spec', 'bug']);
	});

	it('caps with limit', () => {
		const out = render('{% relationships of="WORK-1" group="none" limit=2 /%}', registry());
		const items = findAll(out, (t) => t.attributes.class === 'rf-relationships__item');
		expect(items).toHaveLength(2);
	});

	it('empty= renders a fallback when an entity has no matching edges', () => {
		const out = render('{% relationships of="SPEC-1" empty="No relationships." /%}', registry());
		const empty = findAll(out, (t) => t.attributes.class === 'rf-relationships__empty');
		expect(empty).toHaveLength(1);
		expect(JSON.stringify(empty[0])).toContain('No relationships.');
	});

	it('group-display=accordion renders details panels styled like the accordion rune', () => {
		const out = render('{% relationships of="WORK-1" group-display="accordion" /%}', registry());
		expect(findAll(out, (t) => t.attributes.class === 'rf-accordion')).toHaveLength(1);
		const panels = findAll(out, (t) => t.name === 'details' && t.attributes.class === 'rf-accordion-item');
		expect(panels.map((p) => p.attributes['data-group'])).toEqual(['implements', 'blocked-by']);
		expect(panels.every((p) => p.attributes.open === undefined)).toBe(true);
		expect(findAll(out, (t) => t.attributes.class === 'rf-accordion-item__title').map((t) => (t.children ?? [])[0]))
			.toEqual(['Implements', 'Blocked By']);
		expect(findAll(out, (t) => t.attributes.class === 'rf-accordion-item__count').map((c) => (c.children ?? [])[0]))
			.toEqual(['(2)', '(1)']);
		expect(findAll(out, (t) => t.attributes.class === 'rf-relationships__group')).toHaveLength(0);
	});

	it('binds $count (pre-limit) and $shown (post-limit) in the preamble', () => {
		const out = render('{% relationships of="WORK-1" group="none" limit=2 %}\n{% $shown %} of {% $count %} links\n---\n- {% $item.data.title %}\n{% /relationships %}', registry());
		const pre = findAll(out, (t) => t.attributes.class === 'rf-relationships__preamble');
		expect(pre).toHaveLength(1);
		const blob = JSON.stringify(pre[0]);
		expect(blob).toContain('2');
		expect(blob).toContain('3');
	});
});
