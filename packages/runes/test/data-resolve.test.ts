import 'reflect-metadata';
import Markdoc from '@markdoc/markdoc';
import { describe, it, expect } from 'vitest';
import { resolveDataBindings } from '../src/data-resolve.js';
import { EntityRegistryImpl } from '../../content/src/registry.js';

const { Tag } = Markdoc;

function ctxOf() {
	const warnings: string[] = [];
	return { ctx: { info() {}, warn(m: string) { warnings.push(m); }, error() {} } as any, warnings };
}

function sandbox(query: string, opts: { fields?: string; shape?: string; limit?: number; fallback?: boolean } = {}) {
	const attrs: Record<string, unknown> = { 'data-rf-query': query };
	if (opts.fields) attrs['data-rf-fields'] = opts.fields;
	if (opts.shape) attrs['data-rf-shape'] = opts.shape;
	if (opts.limit) attrs['data-rf-limit'] = String(opts.limit);
	const children: any[] = [];
	if (opts.fallback) children.push(new Tag('template', { 'data-content': 'fallback' }, []));
	return new Tag('rf-sandbox', attrs, children);
}

function carrierJson(resolved: any): any {
	const raw = resolved?.attributes?.['data-rf-records'];
	return raw ? JSON.parse(String(raw)) : null;
}

function registryWithPages() {
	const r = new EntityRegistryImpl();
	// Real registry convention: `url` has no trailing slash, `parentUrl` has one.
	r.register({ type: 'page', id: '/', sourceUrl: '/', data: { url: '/', title: 'Home', parentUrl: '', tags: ['root'] } });
	r.register({ type: 'page', id: '/docs', sourceUrl: '/docs', data: { url: '/docs', title: 'Docs', parentUrl: '/' } });
	r.register({ type: 'page', id: '/docs/a', sourceUrl: '/docs/a', data: { url: '/docs/a', title: 'A', parentUrl: '/docs/' } });
	r.register({ type: 'page', id: '/blog', sourceUrl: '/blog', data: { url: '/blog', title: 'Blog', parentUrl: '/' } });
	return r;
}

/** A plan-shaped registry with SPEC-072 edges (WORK-390 graph shape). PAGE-1 is
 *  deliberately outside the spec/work/decision/milestone selection so the
 *  closed-graph filter can be exercised. */
function registryWithGraph() {
	const r = new EntityRegistryImpl();
	r.register({ type: 'spec', id: 'SPEC-1', sourceUrl: '/plan/spec/spec-1', data: { url: '/plan/spec/spec-1', title: 'Spec One' } });
	r.register({ type: 'work', id: 'WORK-1', sourceUrl: '/plan/work/work-1', data: { url: '/plan/work/work-1', title: 'Work One' } });
	r.register({ type: 'decision', id: 'ADR-1', sourceUrl: '/plan/decision/adr-1', data: { url: '/plan/decision/adr-1', title: 'ADR One' } });
	r.register({ type: 'milestone', id: 'v1', sourceUrl: '/plan/milestone/v1', data: { url: '/plan/milestone/v1', title: 'v1' } });
	r.register({ type: 'page', id: 'PAGE-1', sourceUrl: '/docs', data: { url: '/docs', title: 'Docs' } });
	r.relate({ fromId: 'WORK-1', toId: 'SPEC-1', kind: 'implements', toType: 'spec' });
	r.relate({ fromId: 'SPEC-1', toId: 'ADR-1', kind: 'informed-by', toType: 'decision' });
	r.relate({ fromId: 'WORK-1', toId: 'v1', kind: 'depends-on', toType: 'milestone' });
	// Edge to a node outside the query selection — must be dropped (closed graph).
	r.relate({ fromId: 'WORK-1', toId: 'PAGE-1', kind: 'related', toType: 'page' });
	return r;
}

const PLAN_QUERY = 'type:spec type:work type:decision type:milestone';

describe('resolveDataBindings (SPEC-093 core)', () => {
	it('injects the flat query result as JSON', () => {
		const { ctx } = ctxOf();
		const out = resolveDataBindings(sandbox('type:page', { fallback: true }), registryWithPages(), ctx, '/x/');
		const payload = carrierJson(out);
		expect(payload.shape).toBe('flat');
		expect(payload.records).toHaveLength(4);
		expect(payload.records[0]).toMatchObject({ type: 'page', url: '/' });
		expect(payload.records[0].data.title).toBe('Home');
	});

	it('builds a tree from parentUrl with data-shape=tree', () => {
		const { ctx } = ctxOf();
		const out = resolveDataBindings(sandbox('type:page', { shape: 'tree', fallback: true }), registryWithPages(), ctx, '/x/');
		const payload = carrierJson(out);
		expect(payload.shape).toBe('tree');
		// Nests correctly despite url (no slash) vs parentUrl (trailing slash).
		expect(payload.tree).toHaveLength(1);
		expect(payload.tree[0].url).toBe('/');
		expect(payload.tree[0].children.map((c: any) => c.url).sort()).toEqual(['/blog', '/docs']);
		const docs = payload.tree[0].children.find((c: any) => c.url === '/docs');
		expect(docs.children.map((c: any) => c.url)).toEqual(['/docs/a']);
	});

	it('builds nodes + SPEC-072 edges with data-shape=graph', () => {
		const { ctx } = ctxOf();
		const out = resolveDataBindings(sandbox(PLAN_QUERY, { shape: 'graph', fallback: true }), registryWithGraph(), ctx, '/x/');
		const payload = carrierJson(out);
		expect(payload.shape).toBe('graph');
		// Nodes: the four selected entities (PAGE-1 isn't in the selection).
		expect(payload.nodes.map((n: any) => n.id).sort()).toEqual(['ADR-1', 'SPEC-1', 'WORK-1', 'v1']);
		// Edges among the selected nodes, each {from,to,kind}.
		expect(payload.edges).toEqual(
			expect.arrayContaining([
				{ from: 'WORK-1', to: 'SPEC-1', kind: 'implements' },
				{ from: 'SPEC-1', to: 'ADR-1', kind: 'informed-by' },
				{ from: 'WORK-1', to: 'v1', kind: 'depends-on' },
			]),
		);
	});

	it('drops graph edges to nodes outside the query selection (closed graph)', () => {
		const { ctx } = ctxOf();
		const out = resolveDataBindings(sandbox(PLAN_QUERY, { shape: 'graph', fallback: true }), registryWithGraph(), ctx, '/x/');
		const payload = carrierJson(out);
		expect(payload.edges).toHaveLength(3);
		expect(payload.edges.some((e: any) => e.to === 'PAGE-1')).toBe(false);
	});

	it('projects only data-fields when set', () => {
		const { ctx } = ctxOf();
		const out = resolveDataBindings(sandbox('type:page', { fields: 'title', fallback: true }), registryWithPages(), ctx, '/x/');
		expect(Object.keys(carrierJson(out).records[0].data)).toEqual(['title']);
	});

	it('filters by non-type clauses', () => {
		const { ctx } = ctxOf();
		const out = resolveDataBindings(sandbox('type:page tags:root', { fallback: true }), registryWithPages(), ctx, '/x/');
		const payload = carrierJson(out);
		expect(payload.records).toHaveLength(1);
		expect(payload.records[0].url).toBe('/');
	});

	it('caps the payload and warns', () => {
		const { ctx, warnings } = ctxOf();
		const out = resolveDataBindings(sandbox('type:page', { limit: 2, fallback: true }), registryWithPages(), ctx, '/x/');
		expect(carrierJson(out).records).toHaveLength(2);
		expect(warnings.some((w) => /over the 2 cap/.test(w))).toBe(true);
	});

	it('warns when a data-bound sandbox has no fallback', () => {
		const { ctx, warnings } = ctxOf();
		resolveDataBindings(sandbox('type:page'), registryWithPages(), ctx, '/x/');
		expect(warnings.some((w) => /no fallback/.test(w))).toBe(true);
	});

	it('warns and no-ops when the query has no type clause', () => {
		const { ctx, warnings } = ctxOf();
		const out = resolveDataBindings(sandbox('tags:root', { fallback: true }), registryWithPages(), ctx, '/x/');
		expect(carrierJson(out)).toBeNull();
		expect(warnings.some((w) => /no entity type/.test(w))).toBe(true);
	});

	it('leaves non-data-bound sandboxes untouched', () => {
		const { ctx } = ctxOf();
		const plain = new Tag('rf-sandbox', { 'data-framework': 'tailwind' }, []);
		expect(carrierJson(resolveDataBindings(plain, registryWithPages(), ctx, '/x/'))).toBeNull();
	});
});
