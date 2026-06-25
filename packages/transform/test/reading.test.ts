import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import { resolveReading, coerceRegister, READING_CAPABILITIES } from '../src/reading.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;

function findSection(node: any, role: string): SerializedTag | undefined {
	if (node && typeof node === 'object' && node.attributes) {
		if (node.attributes['data-section'] === role) return node as SerializedTag;
		for (const c of node.children ?? []) {
			const f = findSection(c, role);
			if (f) return f;
		}
	}
	return undefined;
}

const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: {
		Pullquote: { block: 'pullquote', defaultReading: 'prose', sections: { body: 'body' } },
		Card: { block: 'card', sections: { body: 'body' } },
		Caption: { block: 'caption', defaultReading: 'fine', sections: { body: 'body' } },
	},
};

// `data-rune` is the kebab form; config keys are PascalCase.
const rune = (kebab: string, attrs: Record<string, any> = {}) =>
	asTag(createTransform(config)(makeTag('div', { 'data-rune': kebab, ...attrs },
		[makeTag('div', { 'data-name': 'body' }, [makeTag('p', {}, ['x'])])])));

describe('resolveReading (SPEC-108)', () => {
	it('resolves with precedence author ▸ rune ▸ region ▸ ui', () => {
		expect(resolveReading({})).toBe('ui');
		expect(resolveReading({ regionDefault: 'prose' })).toBe('prose');
		expect(resolveReading({ runeDefault: 'prose', regionDefault: 'fine' })).toBe('prose');
		expect(resolveReading({ authorAttr: 'fine', runeDefault: 'prose' })).toBe('fine');
	});
	it('drops an invalid author value to the cascade (typo falls through)', () => {
		expect(resolveReading({ authorAttr: 'bogus', runeDefault: 'prose' })).toBe('prose');
		expect(coerceRegister('prose')).toBe('prose');
		expect(coerceRegister('nope')).toBeUndefined();
		expect(coerceRegister(42)).toBeUndefined();
	});
	it('READING_CAPABILITIES: only prose enables dropcap', () => {
		expect(READING_CAPABILITIES.prose.dropcap).toBe(true);
		expect(READING_CAPABILITIES.ui.dropcap).toBe(false);
		expect(READING_CAPABILITIES.fine.dropcap).toBe(false);
	});
});

describe('data-reading emission (SPEC-108)', () => {
	it('emits the rune default on the body section', () => {
		expect(findSection(rune('pullquote'), 'body')?.attributes['data-reading']).toBe('prose');
		expect(findSection(rune('caption'), 'body')?.attributes['data-reading']).toBe('fine');
	});
	it('suppresses emission at the ui default (byte-identical)', () => {
		expect(findSection(rune('card'), 'body')?.attributes['data-reading']).toBeUndefined();
	});
	it('author reading= overrides the rune default; invalid falls through', () => {
		// prose → ui (suppressed)
		expect(findSection(rune('pullquote', { reading: 'ui' }), 'body')?.attributes['data-reading']).toBeUndefined();
		// ui rune → prose
		expect(findSection(rune('card', { reading: 'prose' }), 'body')?.attributes['data-reading']).toBe('prose');
		// typo → rune default
		expect(findSection(rune('pullquote', { reading: 'bogus' }), 'body')?.attributes['data-reading']).toBe('prose');
	});
});
