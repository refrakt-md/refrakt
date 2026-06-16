import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

/** Collect every descendant tag's inline `--rf-reveal-index` value, in document order. */
function revealIndices(node: any, out: string[] = []): string[] {
	if (!node || typeof node !== 'object') return out;
	const style = node.attributes?.style ? String(node.attributes.style) : '';
	const m = style.match(/--rf-reveal-index:\s*(\d+)/);
	if (m) out.push(m[1]);
	for (const child of node.children ?? []) revealIndices(child, out);
	return out;
}

const baseConfig = (overrides: Record<string, any> = {}): ThemeConfig => ({
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: {
		Bento: { block: 'bento', staggerItems: 'cell', ...overrides },
	},
});

// SPEC-105 / WORK-431 — the reveal/stagger engine facet. Pure intent → attributes:
// emission of data-reveal / data-stagger and the --rf-reveal-index cascade marker.
describe('reveal facet (SPEC-105)', () => {
	it('emits data-reveal from the attribute with no BEM modifier class', () => {
		const transform = createTransform(baseConfig());
		const tag = makeTag('section', { 'data-rune': 'bento', reveal: 'fade' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes['data-reveal']).toBe('fade');
		// reveal is styled by attribute, like elevation — never a BEM modifier.
		expect(result.attributes.class).not.toContain('rf-bento--fade');
	});

	it('omits data-reveal when the attribute is absent', () => {
		const transform = createTransform(baseConfig());
		const tag = makeTag('section', { 'data-rune': 'bento' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes['data-reveal']).toBeUndefined();
	});

	it('strips the raw reveal/stagger attributes from the output root', () => {
		const transform = createTransform(baseConfig());
		const tag = makeTag('section', { 'data-rune': 'bento', reveal: 'slide', stagger: true }, []);

		const result = asTag(transform(tag));
		expect(result.attributes.reveal).toBeUndefined();
		expect(result.attributes.stagger).toBeUndefined();
	});
});

describe('stagger facet (SPEC-105)', () => {
	it('emits data-stagger when set', () => {
		const transform = createTransform(baseConfig());
		const tag = makeTag('section', { 'data-rune': 'bento', stagger: true }, []);

		const result = asTag(transform(tag));
		expect(result.attributes['data-stagger']).toBe('');
	});

	it('stamps --rf-reveal-index (0,1,2,…) on cascade items matched by data-field', () => {
		const transform = createTransform(baseConfig());
		const tag = makeTag('section', { 'data-rune': 'bento', stagger: true }, [
			makeTag('div', { 'data-field': 'cell' }, []),
			makeTag('div', { 'data-field': 'cell' }, []),
			makeTag('div', { 'data-field': 'cell' }, []),
		]);

		const result = asTag(transform(tag));
		expect(revealIndices(result)).toEqual(['0', '1', '2']);
	});

	it('matches cascade items by data-name as well as data-field', () => {
		const transform = createTransform(baseConfig({ staggerItems: 'item' }));
		const tag = makeTag('section', { 'data-rune': 'bento', stagger: true }, [
			makeTag('div', { 'data-name': 'item' }, []),
			makeTag('div', { 'data-name': 'item' }, []),
		]);

		const result = asTag(transform(tag));
		expect(revealIndices(result)).toEqual(['0', '1']);
	});

	it('finds cascade items nested inside a wrapper (document order)', () => {
		const transform = createTransform(baseConfig());
		const tag = makeTag('section', { 'data-rune': 'bento', stagger: true }, [
			makeTag('div', { 'data-name': 'grid' }, [
				makeTag('div', { 'data-field': 'cell' }, []),
				makeTag('div', { 'data-field': 'cell' }, []),
			]),
		]);

		const result = asTag(transform(tag));
		expect(revealIndices(result)).toEqual(['0', '1']);
	});

	it('merges --rf-reveal-index onto an item\'s existing inline style', () => {
		const transform = createTransform(baseConfig());
		const tag = makeTag('section', { 'data-rune': 'bento', stagger: true }, [
			makeTag('div', { 'data-field': 'cell', style: 'color: red' }, []),
		]);

		const result = asTag(transform(tag));
		const cell: any = result.children?.[0];
		expect(cell.attributes.style).toContain('color: red');
		expect(cell.attributes.style).toContain('--rf-reveal-index: 0');
	});

	it('is a silent no-op without stagger (no indices stamped)', () => {
		const transform = createTransform(baseConfig());
		const tag = makeTag('section', { 'data-rune': 'bento' }, [
			makeTag('div', { 'data-field': 'cell' }, []),
			makeTag('div', { 'data-field': 'cell' }, []),
		]);

		const result = asTag(transform(tag));
		expect(revealIndices(result)).toEqual([]);
		expect(result.attributes['data-stagger']).toBeUndefined();
	});

	it('is a silent no-op when the rune declares no staggerItems (single-child runes)', () => {
		// A hero-like rune: stagger set, but no staggerItems → data-stagger emits,
		// yet nothing cascades (there are no declared items).
		const transform = createTransform(baseConfig({ staggerItems: undefined }));
		const tag = makeTag('section', { 'data-rune': 'bento', stagger: true }, [
			makeTag('div', { 'data-field': 'cell' }, []),
		]);

		const result = asTag(transform(tag));
		expect(revealIndices(result)).toEqual([]);
		expect(result.attributes['data-stagger']).toBe('');
	});
});
