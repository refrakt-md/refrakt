import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { corePipelineHooks, createCorePipelineHooks } from '../src/config.js';
import { compileXrefPatterns } from '../src/xref-patterns.js';
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
		expect(link!.attributes['data-target-type']).toBe('page');
		expect(link!.attributes['data-xref-source']).toBe('registry');
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
		expect(span!.attributes['data-xref-id']).toBe('RF-999');
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
		expect(link!.attributes['data-target-type']).toBe('page');
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
		expect(link!.attributes['data-target-type']).toBe('heading');
		expect(link!.children).toContain('Setup');
	});
});

describe('xref resolution — pattern fallback (SPEC-065)', () => {
	function setupWithPatterns(pages: TransformedPage[], patternConfig: Array<{ match: string; template: string; type?: string; label?: string }>) {
		const registry = new EntityRegistryImpl();
		const { ctx } = makeCtx();
		const { patterns } = compileXrefPatterns(patternConfig);
		const hooks = createCorePipelineHooks({ xrefPatterns: patterns });

		hooks.register!(pages, registry, ctx);
		const aggregated: AggregatedData = {
			'__core__': hooks.aggregate!(registry, ctx),
		};
		return { hooks, aggregated };
	}

	it('falls through to pattern resolution when no entity matches', () => {
		const xref = xrefPlaceholder('GH-123');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [makePage('/', 'Home', wrapper)];

		const { hooks, aggregated } = setupWithPatterns(pages, [
			{ match: '^GH-(?<num>\\d+)$', template: 'https://github.com/owner/repo/issues/{num}', type: 'github-issue', label: 'GH #{num}' },
		]);
		const { ctx } = makeCtx();
		const result = hooks.postProcess!(pages[0], aggregated, ctx);
		const link = findTag(result.renderable as any, t => t.name === 'a');

		expect(link).toBeDefined();
		expect(link!.attributes.href).toBe('https://github.com/owner/repo/issues/123');
		expect(link!.attributes['data-xref-source']).toBe('pattern');
		expect(link!.attributes['data-target-type']).toBeUndefined();
		expect(link!.attributes.class).toContain('rf-xref--github-issue');
		expect(link!.children).toContain('GH #123');
	});

	it('uses entity URL when the registry entity has a usable sourceUrl', () => {
		const xref = xrefPlaceholder('/docs/guide/');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [
			makePage('/', 'Home', wrapper),
			makePage('/docs/guide/', 'Guide'),
		];

		// Patterns are configured but should NOT be used — registry wins.
		const { hooks, aggregated } = setupWithPatterns(pages, [
			{ match: '^/docs/.+$', template: 'https://external.example.com{id}' },
		]);
		const { ctx } = makeCtx();
		const result = hooks.postProcess!(pages[0], aggregated, ctx);
		const link = findTag(result.renderable as any, t => t.name === 'a' && t.attributes.class?.includes('rf-xref'));

		expect(link).toBeDefined();
		expect(link!.attributes['data-xref-source']).toBe('registry');
		expect(link!.attributes.href).toBe('/docs/guide/');
	});

	it('falls through to patterns when the entity has no sourceUrl', () => {
		const xref = xrefPlaceholder('SPEC-023');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [makePage('/', 'Home', wrapper)];

		const registry = new EntityRegistryImpl();
		const { ctx: regCtx } = makeCtx();
		// Pre-register a spec entity without a sourceUrl (SPEC-064 case).
		registry.register({
			type: 'spec',
			id: 'SPEC-023',
			data: { title: 'Auth system' },
		});
		const { patterns } = compileXrefPatterns([
			{ match: '^SPEC-\\d+$', template: 'https://trace.example.com/{id}', type: 'spec', label: '{id}' },
		]);
		const hooks = createCorePipelineHooks({ xrefPatterns: patterns });
		hooks.register!(pages, registry, regCtx);
		const aggregated: AggregatedData = { '__core__': hooks.aggregate!(registry, regCtx) };
		const { ctx } = makeCtx();
		const result = hooks.postProcess!(pages[0], aggregated, ctx);
		const link = findTag(result.renderable as any, t => t.name === 'a');

		expect(link).toBeDefined();
		expect(link!.attributes.href).toBe('https://trace.example.com/SPEC-023');
		expect(link!.attributes['data-xref-source']).toBe('pattern');
		// Entity metadata still wins for label and the target-type marker.
		expect(link!.children).toContain('Auth system');
		expect(link!.attributes['data-target-type']).toBe('spec');
	});

	it('encodes substituted values per URL segment, preserving slashes', () => {
		const xref = xrefPlaceholder('docs:guide/intro');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [makePage('/', 'Home', wrapper)];

		const { hooks, aggregated } = setupWithPatterns(pages, [
			{ match: '^docs:(?<path>[a-z0-9/-]+)$', template: 'https://example.com/docs/{path}' },
		]);
		const { ctx } = makeCtx();
		const result = hooks.postProcess!(pages[0], aggregated, ctx);
		const link = findTag(result.renderable as any, t => t.name === 'a');

		expect(link).toBeDefined();
		// Slashes preserved, not encoded to %2F.
		expect(link!.attributes.href).toBe('https://example.com/docs/guide/intro');
	});

	it('URL-encodes single-segment values with reserved characters', () => {
		const xref = xrefPlaceholder('npm:@scope/pkg');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [makePage('/', 'Home', wrapper)];

		const { hooks, aggregated } = setupWithPatterns(pages, [
			{ match: '^npm:(?<pkg>.+)$', template: 'https://npm/package/{pkg}' },
		]);
		const { ctx } = makeCtx();
		const result = hooks.postProcess!(pages[0], aggregated, ctx);
		const link = findTag(result.renderable as any, t => t.name === 'a');

		expect(link).toBeDefined();
		// `@` is preserved per segment; `/` survives because we split first.
		expect(link!.attributes.href).toBe('https://npm/package/%40scope/pkg');
	});

	it('renders unresolved when neither entity nor pattern matches', () => {
		const xref = xrefPlaceholder('UNKNOWN-42');
		const wrapper = new Tag('div', {}, [xref]);
		const pages = [makePage('/', 'Home', wrapper)];

		const { hooks, aggregated } = setupWithPatterns(pages, [
			{ match: '^GH-\\d+$', template: 'https://gh/{id}' },
		]);
		const { ctx } = makeCtx();
		const result = hooks.postProcess!(pages[0], aggregated, ctx);
		const span = findTag(result.renderable as any, t =>
			t.name === 'span' && t.attributes.class?.includes('rf-xref--unresolved')
		);

		expect(span).toBeDefined();
		expect(span!.attributes['data-xref-id']).toBe('UNKNOWN-42');
	});
});

describe('same-page href compaction', () => {
	function setupWithDrawerEntity(pageUrl: string, drawerId: string, drawerSourceUrl: string) {
		const registry = new EntityRegistryImpl();
		registry.register({
			type: 'drawer',
			id: drawerId,
			scope: 'page',
			sourceUrl: drawerSourceUrl,
			data: { title: 'A drawer' },
		});
		const aggregated: AggregatedData = {
			'__core__': {
				breadcrumbPaths: new Map(),
				pagesByUrl: new Map(),
				allPosts: [],
				registry,
				xrefPatterns: [],
			},
		};
		const xref = xrefPlaceholder(drawerId, 'See it');
		const wrapper = new Tag('div', {}, [xref]);
		return { aggregated, page: makePage(pageUrl, 'P', wrapper) };
	}

	it('compacts an entity href to a fragment-only anchor when the entity is on the current page', () => {
		const { aggregated, page } = setupWithDrawerEntity('/runes/drawer/', 'auth', '/runes/drawer/#drawer-auth');
		const { ctx } = makeCtx();
		const result = corePipelineHooks.postProcess!(page, aggregated, ctx);
		const a = findTag(result.renderable as any, t => t.name === 'a');
		expect(a).toBeDefined();
		expect(a!.attributes.href).toBe('#drawer-auth');
	});

	it('tolerates trailing-slash mismatch between page URL and entity URL', () => {
		const { aggregated, page } = setupWithDrawerEntity('/runes/drawer', 'auth', '/runes/drawer/#drawer-auth');
		const { ctx } = makeCtx();
		const result = corePipelineHooks.postProcess!(page, aggregated, ctx);
		const a = findTag(result.renderable as any, t => t.name === 'a');
		expect(a!.attributes.href).toBe('#drawer-auth');
	});

	it('leaves cross-page hrefs absolute', () => {
		const { aggregated, page } = setupWithDrawerEntity('/some-other-page/', 'auth', '/runes/drawer/#drawer-auth');
		const { ctx } = makeCtx();
		const result = corePipelineHooks.postProcess!(page, aggregated, ctx);
		const a = findTag(result.renderable as any, t => t.name === 'a');
		expect(a!.attributes.href).toBe('/runes/drawer/#drawer-auth');
	});
});

describe('EntityRegistration sourceUrl normalization', () => {
	it('treats empty-string sourceUrl as undefined for registry lookups', () => {
		const registry = new EntityRegistryImpl();
		registry.register({
			type: 'spec',
			id: 'SPEC-099',
			sourceUrl: '',
			data: { title: 'No URL spec' },
		});

		// getById still finds it (primary index).
		const found = registry.getById('spec', 'SPEC-099');
		expect(found).toBeDefined();
		expect(found!.sourceUrl).toBeUndefined();

		// getByUrl('') doesn't return it (the empty-string URL never indexed).
		expect(registry.getByUrl('spec', '')).toEqual([]);
	});

	it('skips the byTypeAndUrl index for entries with undefined sourceUrl', () => {
		const registry = new EntityRegistryImpl();
		registry.register({
			type: 'spec',
			id: 'SPEC-100',
			data: { title: 'Plan-only spec' },
		});

		expect(registry.getById('spec', 'SPEC-100')).toBeDefined();
		expect(registry.getByUrl('spec', '/some/url')).toEqual([]);
	});
});
