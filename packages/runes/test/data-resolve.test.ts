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
	r.register({ type: 'page', id: '/', sourceUrl: '/', data: { url: '/', title: 'Home', parentUrl: '', tags: ['root'] } });
	r.register({ type: 'page', id: '/docs/', sourceUrl: '/docs/', data: { url: '/docs/', title: 'Docs', parentUrl: '/' } });
	r.register({ type: 'page', id: '/docs/a/', sourceUrl: '/docs/a/', data: { url: '/docs/a/', title: 'A', parentUrl: '/docs/' } });
	r.register({ type: 'page', id: '/blog/', sourceUrl: '/blog/', data: { url: '/blog/', title: 'Blog', parentUrl: '/' } });
	return r;
}

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
		expect(payload.tree).toHaveLength(1);
		expect(payload.tree[0].url).toBe('/');
		expect(payload.tree[0].children.map((c: any) => c.url).sort()).toEqual(['/blog/', '/docs/']);
		const docs = payload.tree[0].children.find((c: any) => c.url === '/docs/');
		expect(docs.children.map((c: any) => c.url)).toEqual(['/docs/a/']);
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
