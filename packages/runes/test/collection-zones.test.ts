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
		getByUrl: () => [],
		getTypes: () => [...new Set(entries.map((e) => e.type))],
	} as EntityRegistry;
}

function render(src: string, reg: EntityRegistry): RenderableTreeNode {
	const ast = Markdoc.parse(src);
	captureDeferredBodies(ast, (n) => Boolean((tags as Record<string, { deferBody?: boolean }>)[n]?.deferBody));
	const transformed = Markdoc.transform(ast, { tags, nodes, variables: {} } as never);
	return resolveCollections(transformed, '/p/', reg, { tags, nodes }, ctx) as RenderableTreeNode;
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

const work = (id: string, data: Record<string, unknown>): EntityRegistration => ({ type: 'work', id, sourceUrl: `/work/${id}/`, data });
const reg = registry([work('W-1', { title: 'Alpha', status: 'ready' }), work('W-2', { title: 'Beta', status: 'ready' })]);

describe('collection body zones + empty state (WORK-286)', () => {
	it('empty= attribute renders an empty state on the self-closing form', () => {
		const out = render('{% collection type="work" filter="status:zzz" empty="No work." /%}', reg);
		const empty = cls(out, 'rf-collection__empty');
		expect(empty).toHaveLength(1);
		expect(JSON.stringify(empty[0])).toContain('No work.');
		expect(cls(out, 'rf-collection__items')).toHaveLength(0);
	});

	it('3-zone body: preamble + items when non-empty', () => {
		const out = render('{% collection type="work" filter="status:ready" %}\n## Open\n---\n{% card %}### {% $item.data.title %}{% /card %}\n---\nNothing open.\n{% /collection %}', reg);
		const pre = cls(out, 'rf-collection__preamble');
		expect(pre).toHaveLength(1);
		expect(JSON.stringify(pre[0])).toContain('Open');
		expect(cls(out, 'rf-collection__items')).toHaveLength(1);
		expect(cls(out, 'rf-collection__empty')).toHaveLength(0);
	});

	it('3-zone body: fallback + no preamble/items when empty', () => {
		const out = render('{% collection type="work" filter="status:zzz" %}\n## Open\n---\n{% card %}### {% $item.data.title %}{% /card %}\n---\nNothing open.\n{% /collection %}', reg);
		expect(cls(out, 'rf-collection__preamble')).toHaveLength(0);
		expect(cls(out, 'rf-collection__items')).toHaveLength(0);
		const empty = cls(out, 'rf-collection__empty');
		expect(empty).toHaveLength(1);
		expect(JSON.stringify(empty[0])).toContain('Nothing open.');
	});

	it('a single-zone body stays the per-item template (back-compat)', () => {
		const out = render('{% collection type="work" filter="status:ready" %}\n{% card %}### {% $item.data.title %}{% /card %}\n{% /collection %}', reg);
		expect(cls(out, 'rf-collection__preamble')).toHaveLength(0);
		expect(cls(out, 'rf-collection__item')).toHaveLength(2);
	});

	it('a --- inside a nested card is not a zone delimiter', () => {
		const out = render('{% collection type="work" filter="status:ready" %}\n{% card %}\n![x](/i.png)\n\n---\n\n### {% $item.data.title %}\n{% /card %}\n{% /collection %}', reg);
		// single top-level zone → template; no preamble/empty split
		expect(cls(out, 'rf-collection__preamble')).toHaveLength(0);
		expect(cls(out, 'rf-collection__empty')).toHaveLength(0);
		expect(cls(out, 'rf-collection__item')).toHaveLength(2);
	});
});
