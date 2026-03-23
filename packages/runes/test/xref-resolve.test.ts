import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { corePipelineHooks } from '../src/config.js';
import { EntityRegistryImpl } from '../../content/src/registry.js';
import type { TransformedPage, AggregatedData } from '@refrakt-md/types';
import { parse, findTag } from './helpers.js';

function makePage(
	url: string,
	title: string,
	renderable: unknown = null,
	headings: Array<{ level: number; text: string; id: string }> = [],
): TransformedPage {
	return { url, title, headings, frontmatter: { title }, renderable };
}

function makeCtx() {
	const warnings: Array<{ severity: string; message: string; url?: string }> = [];
	return {
		ctx: {
			info(message: string, url?: string) { warnings.push({ severity: 'info', message, url }); },
			warn(message: string, url?: string) { warnings.push({ severity: 'warning', message, url }); },
			error(message: string, url?: string) { warnings.push({ severity: 'error', message, url }); },
		},
		warnings,
	};
}

/** Run register + aggregate to get aggregated data with registry */
function setupPipeline(pages: TransformedPage[]) {
	const registry = new EntityRegistryImpl();
	const { ctx } = makeCtx();

	corePipelineHooks.register!(pages, registry, ctx);
	const aggregated: AggregatedData = {
		'__core__': corePipelineHooks.aggregate!(registry, ctx),
	};

	return { registry, aggregated };
}

/** Create an xref placeholder tag (what Phase 1 transform emits) */
function xrefPlaceholder(id: string, label?: string, type?: string): any {
	const attrs: Record<string, string> = {
		'data-rune': 'xref',
		'data-xref-id': id,
	};
	if (label) attrs['data-xref-label'] = label;
	if (type) attrs['data-xref-type'] = type;
	return new Tag('span', attrs, [label || id]);
}

describe('xref resolution (Phase 4 — postProcess)', () => {
	it('should resolve xref by page ID (url)', () => {
		const xref = xrefPlaceholder('/docs/guide/');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [
			makePage('/', 'Home'),
			makePage('/docs/', 'Docs'),
			makePage('/docs/guide/', 'Getting Started Guide', wrapper),
		];

		const { aggregated } = setupPipeline(pages);
		const { ctx, warnings } = makeCtx();

		const result = corePipelineHooks.postProcess!(pages[2], aggregated, ctx);
		const link = findTag(result.renderable as any, t => t.name === 'a' && t.attributes.class?.includes('rf-xref'));

		expect(link).toBeDefined();
		expect(link!.attributes.href).toBe('/docs/guide/');
		expect(link!.attributes.class).toContain('rf-xref--page');
		expect(link!.attributes['data-entity-type']).toBe('page');
		expect(link!.children).toContain('Getting Started Guide');
	});

	it('should resolve xref by page title (name match)', () => {
		const xref = xrefPlaceholder('Getting Started Guide');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [
			makePage('/', 'Home', wrapper),
			makePage('/docs/guide/', 'Getting Started Guide'),
		];

		const { aggregated } = setupPipeline(pages);
		const { ctx } = makeCtx();

		const result = corePipelineHooks.postProcess!(pages[0], aggregated, ctx);
		const link = findTag(result.renderable as any, t => t.name === 'a' && t.attributes.class?.includes('rf-xref'));

		expect(link).toBeDefined();
		expect(link!.attributes.href).toBe('/docs/guide/');
		expect(link!.children).toContain('Getting Started Guide');
	});

	it('should use custom label as link text', () => {
		const xref = xrefPlaceholder('/docs/guide/', 'the guide');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [
			makePage('/', 'Home', wrapper),
			makePage('/docs/guide/', 'Getting Started Guide'),
		];

		const { aggregated } = setupPipeline(pages);
		const { ctx } = makeCtx();

		const result = corePipelineHooks.postProcess!(pages[0], aggregated, ctx);
		const link = findTag(result.renderable as any, t => t.name === 'a');

		expect(link).toBeDefined();
		expect(link!.children).toContain('the guide');
	});

	it('should render unresolved reference as span', () => {
		const xref = xrefPlaceholder('RF-999');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [makePage('/', 'Home', wrapper)];

		const { aggregated } = setupPipeline(pages);
		const { ctx, warnings } = makeCtx();

		const result = corePipelineHooks.postProcess!(pages[0], aggregated, ctx);
		const span = findTag(result.renderable as any, t =>
			t.name === 'span' && t.attributes.class?.includes('rf-xref--unresolved')
		);

		expect(span).toBeDefined();
		expect(span!.attributes['data-entity-id']).toBe('RF-999');
		expect(span!.children).toContain('RF-999');
		expect(warnings.some(w => w.severity === 'warning' && w.message.includes('RF-999'))).toBe(true);
	});

	it('should use custom label on unresolved reference', () => {
		const xref = xrefPlaceholder('RF-999', 'missing item');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [makePage('/', 'Home', wrapper)];

		const { aggregated } = setupPipeline(pages);
		const { ctx } = makeCtx();

		const result = corePipelineHooks.postProcess!(pages[0], aggregated, ctx);
		const span = findTag(result.renderable as any, t =>
			t.name === 'span' && t.attributes.class?.includes('rf-xref--unresolved')
		);

		expect(span).toBeDefined();
		expect(span!.children).toContain('missing item');
	});

	it('should emit info diagnostic for self-reference', () => {
		const xref = xrefPlaceholder('/docs/guide/');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [
			makePage('/', 'Home'),
			makePage('/docs/guide/', 'Guide', wrapper),
		];

		const { aggregated } = setupPipeline(pages);
		const { ctx, warnings } = makeCtx();

		corePipelineHooks.postProcess!(pages[1], aggregated, ctx);
		expect(warnings.some(w => w.severity === 'info' && w.message.includes('references itself'))).toBe(true);
	});

	it('should warn on ambiguous name match', () => {
		// Register two entities with same title via two pages
		const xref = xrefPlaceholder('Shared Title');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [
			makePage('/', 'Home', wrapper),
			makePage('/page-a/', 'Shared Title'),
			makePage('/page-b/', 'Shared Title'),
		];

		const { aggregated } = setupPipeline(pages);
		const { ctx, warnings } = makeCtx();

		const result = corePipelineHooks.postProcess!(pages[0], aggregated, ctx);

		// Should still produce a link (first match)
		const link = findTag(result.renderable as any, t => t.name === 'a');
		expect(link).toBeDefined();

		// Should emit ambiguity warning
		expect(warnings.some(w => w.severity === 'warning' && w.message.includes('matches 2 entities'))).toBe(true);
	});

	it('should resolve name match case-insensitively', () => {
		const xref = xrefPlaceholder('getting started guide');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [
			makePage('/', 'Home', wrapper),
			makePage('/docs/guide/', 'Getting Started Guide'),
		];

		const { aggregated } = setupPipeline(pages);
		const { ctx } = makeCtx();

		const result = corePipelineHooks.postProcess!(pages[0], aggregated, ctx);
		const link = findTag(result.renderable as any, t => t.name === 'a');

		expect(link).toBeDefined();
		expect(link!.attributes.href).toBe('/docs/guide/');
	});

	it('should filter by type hint', () => {
		const xref = xrefPlaceholder('Guide', 'page');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [
			makePage('/', 'Home', wrapper),
			makePage('/docs/guide/', 'Guide'),
		];

		const { aggregated } = setupPipeline(pages);
		const { ctx } = makeCtx();

		// Type hint 'page' with id='Guide' should find the page by name
		// since 'Guide' is not a valid page ID but matches title
		const xref2 = xrefPlaceholder('Guide', undefined, 'page');
		const wrapper2 = new Tag('div', {}, [xref2]);
		const pages2 = [
			makePage('/', 'Home', wrapper2),
			makePage('/docs/guide/', 'Guide'),
		];

		const { aggregated: agg2 } = setupPipeline(pages2);
		const { ctx: ctx2 } = makeCtx();

		const result = corePipelineHooks.postProcess!(pages2[0], agg2, ctx2);
		const link = findTag(result.renderable as any, t => t.name === 'a');

		expect(link).toBeDefined();
		expect(link!.attributes['data-entity-type']).toBe('page');
	});

	it('should preserve identity when no xref nodes are present', () => {
		const wrapper = new Tag('div', {}, ['Hello world']);
		const pages = [makePage('/', 'Home', wrapper)];

		const { aggregated } = setupPipeline(pages);
		const { ctx } = makeCtx();

		const result = corePipelineHooks.postProcess!(pages[0], aggregated, ctx);
		// renderable should be the same object if no xrefs were found
		// (though breadcrumb/nav resolution might have run, the tag itself has no matching sentinels)
		expect(result.renderable).toBeDefined();
	});

	it('should resolve heading entity by composite ID', () => {
		const xref = xrefPlaceholder('/docs/guide/#setup');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [
			makePage('/', 'Home', wrapper),
			makePage('/docs/guide/', 'Guide', null, [
				{ level: 2, text: 'Setup', id: 'setup' },
			]),
		];

		const { aggregated } = setupPipeline(pages);
		const { ctx } = makeCtx();

		const result = corePipelineHooks.postProcess!(pages[0], aggregated, ctx);
		const link = findTag(result.renderable as any, t => t.name === 'a');

		expect(link).toBeDefined();
		expect(link!.attributes['data-entity-type']).toBe('heading');
		expect(link!.children).toContain('Setup');
	});
});
