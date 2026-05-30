import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';
import { resolveXrefPreviews } from '../src/xref-preview-resolve.js';
import { hoistPreviewDrawers, HOIST_DRAWER_SENTINEL } from '../src/drawer-pipeline.js';
import { resolveExpands } from '../src/expand-pipeline.js';
import { EntityRegistryImpl } from '../../content/src/registry.js';
import type { PipelineContext, EntityRegistration } from '@refrakt-md/types';

const { Tag } = Markdoc;

function makeCtx() {
	const messages: Array<{ severity: string; message: string; url?: string }> = [];
	const ctx: PipelineContext = {
		info: (message, url) => messages.push({ severity: 'info', message, url }),
		warn: (message, url) => messages.push({ severity: 'warning', message, url }),
		error: (message, url) => messages.push({ severity: 'error', message, url }),
	};
	return { ctx, messages };
}

function render(src: string): unknown {
	const ast = Markdoc.parse(src);
	return Markdoc.transform(ast, { tags, nodes, variables: {} } as never);
}

function findAll(node: unknown, pred: (t: InstanceType<typeof Tag>) => boolean) {
	const out: InstanceType<typeof Tag>[] = [];
	const walk = (n: unknown) => {
		if (Array.isArray(n)) return n.forEach(walk);
		if (!Tag.isTag(n as never)) return;
		const t = n as InstanceType<typeof Tag>;
		if (pred(t)) out.push(t);
		(t.children ?? []).forEach(walk);
	};
	walk(node);
	return out;
}

function makeRegistry(entries: EntityRegistration[]): EntityRegistryImpl {
	const reg = new EntityRegistryImpl();
	for (const e of entries) reg.register(e);
	return reg;
}

describe('xref preview="drawer" (SPEC-078, WORK-302)', () => {
	describe('placeholder rewriting', () => {
		it('passes non-preview xref placeholders through unchanged', () => {
			const tree = render('See {% ref "SPEC-076" /%} for the design.');
			const { ctx } = makeCtx();
			const out = resolveXrefPreviews(tree, '/p/', undefined, ctx);
			// Placeholder still has data-rune="xref" — wasn't touched.
			const placeholders = findAll(out, t => t.attributes?.['data-rune'] === 'xref');
			expect(placeholders).toHaveLength(1);
			expect(placeholders[0].attributes['data-xref-preview']).toBeUndefined();
		});

		it('rewrites preview="drawer" placeholders to an inline anchor + hoist sentinel', () => {
			const tree = render('See {% ref "SPEC-076" preview="drawer" /%} for the design.');
			const reg = makeRegistry([
				{ type: 'spec', id: 'SPEC-076', sourceUrl: '/specs/SPEC-076/', data: { title: 'Aggregate rune' } },
			]);
			const { ctx } = makeCtx();
			const out = resolveXrefPreviews(tree, '/p/', reg, ctx);

			const anchors = findAll(
				out,
				t => t.name === 'a' && t.attributes.href === '#drawer-SPEC-076',
			);
			expect(anchors).toHaveLength(1);
			expect(anchors[0].attributes['aria-controls']).toBe('drawer-SPEC-076');
			expect(anchors[0].attributes['aria-expanded']).toBe('false');
			expect(anchors[0].attributes['data-target-type']).toBe('drawer');
			expect(anchors[0].children).toEqual(['Aggregate rune']);

			const sentinels = findAll(
				out,
				t => t.name === 'meta' && t.attributes['data-field'] === HOIST_DRAWER_SENTINEL,
			);
			expect(sentinels).toHaveLength(1);
			expect(sentinels[0].attributes['data-source']).toBe('xref');
			expect(sentinels[0].attributes['data-entity-id']).toBe('SPEC-076');
		});

		it('uses authored label when set instead of entity title', () => {
			const tree = render('See {% ref "SPEC-076" label="the aggregate spec" preview="drawer" /%}.');
			const reg = makeRegistry([
				{ type: 'spec', id: 'SPEC-076', sourceUrl: '/specs/SPEC-076/', data: { title: 'Aggregate rune' } },
			]);
			const { ctx } = makeCtx();
			const out = resolveXrefPreviews(tree, '/p/', reg, ctx);
			const anchor = findAll(out, t => t.name === 'a' && t.attributes.href === '#drawer-SPEC-076')[0];
			expect(anchor.children).toEqual(['the aggregate spec']);
		});

		it('falls back to the entity id as label when the entity is not in the registry', () => {
			const tree = render('See {% ref "MISSING-1" preview="drawer" /%}.');
			const reg = makeRegistry([]);
			const { ctx } = makeCtx();
			const out = resolveXrefPreviews(tree, '/p/', reg, ctx);
			const anchor = findAll(out, t => t.name === 'a' && t.attributes.href === '#drawer-MISSING-1')[0];
			expect(anchor.children).toEqual(['MISSING-1']);
		});
	});

	describe('hoist builder output', () => {
		it('builds a drawer whose body contains an expand-pending placeholder, footer linking to sourceUrl', () => {
			const tree = render('See {% ref "SPEC-076" preview="drawer" /%}.');
			const reg = makeRegistry([
				{ type: 'spec', id: 'SPEC-076', sourceUrl: '/specs/SPEC-076/', data: { title: 'Aggregate rune' } },
			]);
			const { ctx } = makeCtx();
			let out = resolveXrefPreviews(tree, '/p/', reg, ctx);
			out = hoistPreviewDrawers(out, '/p/', reg, undefined, ctx);

			const drawers = findAll(out, t => t.attributes['data-rune'] === 'drawer');
			expect(drawers).toHaveLength(1);
			expect(drawers[0].attributes.id).toBe('drawer-SPEC-076');

			// Body is an expand-pending placeholder pointing at SPEC-076.
			const placeholders = findAll(drawers[0], t => t.attributes['data-rune'] === 'expand-pending');
			expect(placeholders).toHaveLength(1);
			expect(placeholders[0].attributes['data-expand-id']).toBe('SPEC-076');

			// Footer link points at the entity sourceUrl.
			const footers = findAll(drawers[0], t => t.name === 'footer');
			expect(footers).toHaveLength(1);
			const footerLinks = findAll(footers[0], t => t.name === 'a');
			expect(footerLinks).toHaveLength(1);
			expect(footerLinks[0].attributes.href).toBe('/specs/SPEC-076/');
		});

		it('hides the footer link for entities without a sourceUrl', () => {
			const tree = render('See {% ref "HEADING-1" preview="drawer" /%}.');
			const reg = makeRegistry([
				// Heading-like entity — no sourceUrl.
				{ type: 'heading', id: 'HEADING-1', data: { title: 'A heading' } },
			]);
			const { ctx } = makeCtx();
			let out = resolveXrefPreviews(tree, '/p/', reg, ctx);
			out = hoistPreviewDrawers(out, '/p/', reg, undefined, ctx);
			const drawers = findAll(out, t => t.attributes['data-rune'] === 'drawer');
			expect(drawers).toHaveLength(1);
			const footers = findAll(drawers[0], t => t.name === 'footer');
			expect(footers).toHaveLength(0);
		});

		it('multiple references to the same entity dedupe to one hoisted drawer', () => {
			const tree = render('A {% ref "SPEC-076" preview="drawer" /%} and B {% ref "SPEC-076" preview="drawer" /%}.');
			const reg = makeRegistry([
				{ type: 'spec', id: 'SPEC-076', sourceUrl: '/specs/SPEC-076/', data: { title: 'Aggregate rune' } },
			]);
			const { ctx } = makeCtx();
			let out = resolveXrefPreviews(tree, '/p/', reg, ctx);
			out = hoistPreviewDrawers(out, '/p/', reg, undefined, ctx);
			const drawers = findAll(out, t => t.attributes['data-rune'] === 'drawer');
			expect(drawers).toHaveLength(1);
			// Both inline anchors point at the same drawer.
			const anchors = findAll(out, t => t.name === 'a' && (t.attributes.href as string | undefined) === '#drawer-SPEC-076');
			expect(anchors).toHaveLength(2);
		});
	});

	describe('expand resolution downstream', () => {
		it('the expand-pending body resolves to the entity content when resolveExpands runs after', () => {
			const tree = render('See {% ref "SPEC-076" preview="drawer" /%}.');
			const reg = makeRegistry([
				{
					type: 'spec',
					id: 'SPEC-076',
					sourceUrl: '/specs/SPEC-076/',
					data: { title: 'Aggregate rune' },
					// `extract` returns the spec body when read from disk. For
					// the test, return a synthetic minimal AST so resolveExpands
					// has something to inline.
					extract: () => Markdoc.parse('Expanded content from SPEC-076.').children[0],
				},
			]);
			const { ctx } = makeCtx();
			let out = resolveXrefPreviews(tree, '/p/', reg, ctx);
			out = hoistPreviewDrawers(out, '/p/', reg, undefined, ctx);
			out = resolveExpands(out, '/p/', reg, [], undefined, ctx);

			// The expand-pending placeholder is now resolved into the entity's content.
			const drawers = findAll(out, t => t.attributes['data-rune'] === 'drawer');
			expect(drawers).toHaveLength(1);
			const remaining = findAll(drawers[0], t => t.attributes['data-rune'] === 'expand-pending');
			expect(remaining).toHaveLength(0);
			const resolvedExpands = findAll(drawers[0], t => t.attributes['data-rune'] === 'expand');
			expect(resolvedExpands.length).toBeGreaterThan(0);
		});
	});
});
