import { describe, it, expect, beforeEach } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import {
	hoistPreviewDrawers,
	registerHoistBuilder,
	pathToSlug,
	HOIST_DRAWER_SENTINEL,
} from '../src/drawer-pipeline.js';
import { parse, findAllTags, findTag } from './helpers.js';
import type { PipelineContext } from '@refrakt-md/types';

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

/** Wrap an array-or-tag renderable in a synthetic root tag so `findTag` /
 *  `findAllTags` (which only walk individual tags) can traverse it. */
function root(value: unknown): InstanceType<typeof Tag> {
	const children = Array.isArray(value) ? value : [value];
	return new Tag('root', {}, children as never[]);
}

/** Build a renderable shape that mimics what a reference rune would emit:
 *  an inline `<span data-rune="my-source">` containing an `<a>` (the inline
 *  link the reader sees) and a sentinel meta with the hoist payload. */
function sentinelSpan(source: string, targetId: string, extras: Record<string, string> = {}) {
	return new Tag('span', { 'data-rune': source }, [
		new Tag('a', { href: `#drawer-${targetId}` }, [extras.label ?? targetId]),
		new Tag('meta', {
			'data-field': HOIST_DRAWER_SENTINEL,
			'data-source': source,
			'data-target-id': targetId,
			'data-title': extras.title ?? targetId,
			...Object.fromEntries(Object.entries(extras).map(([k, v]) => [`data-${k}`, v])),
		}),
	]);
}

/** A minimal mock builder that produces a `<section class="rf-drawer">`
 *  wrapper carrying the payload as data-* attributes so tests can assert
 *  what reached the builder. */
function mockBuilder(payload: Record<string, string>) {
	const id = payload['target-id'];
	return new Tag(
		'section',
		{
			class: 'rf-drawer',
			'data-rune': 'drawer',
			'data-drawer-id': id,
			id: `drawer-${id}`,
			'data-built-from': payload.source ?? '',
			'data-built-title': payload.title ?? '',
		},
		[`drawer body for ${id}`],
	);
}

describe('drawer hoist mechanism (SPEC-078, WORK-300)', () => {
	beforeEach(() => {
		registerHoistBuilder('test-source', mockBuilder);
		registerHoistBuilder('test-source-2', mockBuilder);
	});

	describe('no-op cases', () => {
		it('returns the same renderable identity when no sentinels are present', () => {
			const tree = parse('# Hello\n\nBody text.');
			const { ctx } = makeCtx();
			const out = hoistPreviewDrawers(tree, '/p/', undefined, undefined, ctx);
			expect(out).toBe(tree);
		});

		it('emits a warning when a sentinel has no target-id', () => {
			const sentinel = new Tag('meta', {
				'data-field': HOIST_DRAWER_SENTINEL,
				'data-source': 'test-source',
			});
			const { ctx, messages } = makeCtx();
			hoistPreviewDrawers([sentinel], '/p/', undefined, undefined, ctx);
			const warnings = messages.filter(m => m.severity === 'warning');
			expect(warnings.length).toBe(1);
			expect(warnings[0].message).toContain('data-target-id');
		});

		it('emits a warning when source has no registered builder', () => {
			const sentinel = sentinelSpan('unknown-source', 'foo');
			const { ctx, messages } = makeCtx();
			hoistPreviewDrawers([sentinel], '/p/', undefined, undefined, ctx);
			const warnings = messages.filter(m => m.severity === 'warning');
			expect(warnings.length).toBe(1);
			expect(warnings[0].message).toContain('unknown-source');
		});
	});

	describe('sentinel stripping + drawer appending', () => {
		it('strips the sentinel meta and appends a hoisted drawer at the root', () => {
			const tree = [
				new Tag('p', {}, ['Some prose.']),
				sentinelSpan('test-source', 'foo'),
				new Tag('p', {}, ['More prose.']),
			];
			const { ctx } = makeCtx();
			const out = hoistPreviewDrawers(tree, '/p/', undefined, undefined, ctx) as unknown[];

			// The sentinel meta is gone from the span.
			const sentinels = findAllTags(
				out,
				t => t.attributes['data-field'] === HOIST_DRAWER_SENTINEL,
			);
			expect(sentinels.length).toBe(0);

			// The inline `<a>` link inside the span is preserved at its original position.
			expect(out.length).toBe(4); // 2 paragraphs + sentinel-span (with anchor) + hoisted drawer
			const anchor = findTag(root(out), t => t.name === 'a' && t.attributes.href === '#drawer-foo');
			expect(anchor).toBeDefined();

			// The hoisted drawer is appended at the page root.
			const drawer = out[out.length - 1] as InstanceType<typeof Tag>;
			expect(drawer.name).toBe('section');
			expect(drawer.attributes['data-drawer-id']).toBe('foo');
			expect(drawer.attributes['data-built-from']).toBe('test-source');
		});

		it('preserves the inline anchor unchanged when the sentinel is stripped', () => {
			const tree = [sentinelSpan('test-source', 'foo', { label: 'click me' })];
			const { ctx } = makeCtx();
			const out = hoistPreviewDrawers(tree, '/p/', undefined, undefined, ctx);
			const anchor = findTag(root(out), t => t.name === 'a');
			expect(anchor).toBeDefined();
			expect(anchor!.attributes.href).toBe('#drawer-foo');
			expect(anchor!.children).toEqual(['click me']);
		});
	});

	describe('dedup', () => {
		it('collapses N mentions of the same target-id to one hoisted drawer', () => {
			const tree = [
				new Tag('p', {}, [sentinelSpan('test-source', 'shared'), ' and ', sentinelSpan('test-source', 'shared')]),
				new Tag('p', {}, [sentinelSpan('test-source', 'shared')]),
			];
			const { ctx } = makeCtx();
			const out = hoistPreviewDrawers(tree, '/p/', undefined, undefined, ctx) as unknown[];
			const drawers = findAllTags(root(out), t => t.attributes['data-rune'] === 'drawer');
			expect(drawers.length).toBe(1);
			expect(drawers[0].attributes['data-drawer-id']).toBe('shared');
		});

		it('keeps distinct target-ids separate', () => {
			const tree = [
				sentinelSpan('test-source', 'one'),
				sentinelSpan('test-source', 'two'),
			];
			const { ctx } = makeCtx();
			const out = hoistPreviewDrawers(tree, '/p/', undefined, undefined, ctx) as unknown[];
			const drawers = findAllTags(root(out), t => t.attributes['data-rune'] === 'drawer');
			expect(drawers.length).toBe(2);
			const ids = drawers.map(d => d.attributes['data-drawer-id']).sort();
			expect(ids).toEqual(['one', 'two']);
		});
	});

	describe('collision with author-declared drawer', () => {
		it('author drawer wins; hoist defers; info-level note emitted', () => {
			const authorDrawer = parse(`{% drawer id="auth" title="Auth system" %}body{% /drawer %}`);
			const tree = [
				...(Array.isArray(authorDrawer) ? authorDrawer : [authorDrawer]),
				sentinelSpan('test-source', 'auth'),
			];
			const { ctx, messages } = makeCtx();
			const out = hoistPreviewDrawers(tree, '/p/', undefined, undefined, ctx) as unknown[];

			// Only the author drawer remains — no hoisted one was emitted.
			const drawers = findAllTags(root(out), t => t.attributes['data-rune'] === 'drawer');
			expect(drawers.length).toBe(1);
			expect(drawers[0].attributes['data-built-from']).toBeUndefined();

			// Info note names the source.
			const infos = messages.filter(m => m.severity === 'info');
			expect(infos.length).toBe(1);
			expect(infos[0].message).toContain('auth');
			expect(infos[0].message).toContain('test-source');
		});
	});

	describe('nested preview detection', () => {
		it('still hoists a sentinel that lives inside an existing drawer body, with info note', () => {
			const inner = sentinelSpan('test-source', 'inner');
			const authorDrawerWithNested = new Tag(
				'section',
				{ class: 'rf-drawer', 'data-rune': 'drawer', 'data-drawer-id': 'outer', id: 'drawer-outer' },
				[
					new Tag('div', { 'data-name': 'body' }, [
						new Tag('p', {}, ['Outer body — contains ', inner, ' a nested preview.']),
					]),
				],
			);
			const tree = [authorDrawerWithNested];

			const { ctx, messages } = makeCtx();
			const out = hoistPreviewDrawers(tree, '/p/', undefined, undefined, ctx) as unknown[];

			// Both drawers exist in the output (author + hoisted inner).
			const drawers = findAllTags(root(out), t => t.attributes['data-rune'] === 'drawer');
			expect(drawers.length).toBe(2);
			const ids = drawers.map(d => d.attributes['data-drawer-id']).sort();
			expect(ids).toEqual(['inner', 'outer']);

			// Info-level note flags the nesting.
			const infos = messages.filter(m => m.severity === 'info');
			expect(infos.length).toBe(1);
			expect(infos[0].message).toContain('inside another drawer');
		});
	});
});

describe('pathToSlug', () => {
	it('lowercases, replaces non-alphanumeric with -, and trims', () => {
		expect(pathToSlug('packages/types/src/token-contract.ts'))
			.toBe('packages-types-src-token-contract.ts');
	});

	it('appends L{n} for a single-line range', () => {
		expect(pathToSlug('foo.ts', '42')).toBe('foo.ts-L42');
	});

	it('appends L{start}-L{end} for a range', () => {
		expect(pathToSlug('packages/types/src/token-contract.ts', '42-58'))
			.toBe('packages-types-src-token-contract.ts-L42-L58');
	});

	it('handles paths with spaces and special characters', () => {
		expect(pathToSlug('docs/My Folder/foo (bar).md', '12'))
			.toBe('docs-my-folder-foo-bar-.md-L12');
	});

	it('distinct paths produce distinct slugs', () => {
		expect(pathToSlug('a/b.ts')).not.toBe(pathToSlug('a/b.md'));
	});

	it('distinct line ranges of the same path produce distinct slugs', () => {
		expect(pathToSlug('foo.ts', '1-10')).not.toBe(pathToSlug('foo.ts', '42-50'));
	});
});
