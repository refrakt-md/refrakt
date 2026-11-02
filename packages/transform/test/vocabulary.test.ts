import { describe, it, expect } from 'vitest';
import { cssSelectors, vocabularyCoverage, vocabularyEntries } from '../src/vocabulary.js';

/** WORK-672 — the vocabulary coverage check, over CSS text. */

const entries = vocabularyEntries([
	{ name: 'meta-type', attribute: 'data-meta-type', values: ['status', 'id'], source: 'test' },
	{ name: 'bg', attribute: 'data-bg', values: null, source: 'test' },
]);

describe('cssSelectors', () => {
	it('reads every selector, without comments, at-rules or declarations', () => {
		const sels = cssSelectors(`
/* [data-meta-type="id"] in a comment */
@layer skin {
	.a, [data-meta-type='status'] { color: red; }
	@media (max-width: 4px) { [ data-bg ] > p { margin: 0 } }
}`);
		expect(sels).toContain('.a, [data-meta-type="status"]');
		expect(sels).toContain('[data-bg] > p');
		expect(sels.some((s) => s.includes('"id"'))).toBe(false);
		expect(sels.some((s) => s.startsWith('@'))).toBe(false);
	});

	it('normalises unquoted and single-quoted values to one form', () => {
		expect(cssSelectors('[data-meta-type=status]{}')).toEqual(['[data-meta-type="status"]']);
	});
});

describe('vocabularyCoverage', () => {
	it('names the theme, the base stylesheet, or neither', () => {
		const rows = vocabularyCoverage(
			entries,
			[':is(.x, [data-meta-type="status"]) { color: red }'],
			['[data-bg="sunset"] { color: red }'],
		);
		expect(Object.fromEntries(rows.map((r) => [r.selector, r.coverage]))).toEqual({
			'[data-meta-type="status"]': 'theme',
			'[data-meta-type="id"]': 'none',
			// An open dimension is met by any value of its attribute.
			'[data-bg]': 'base',
		});
	});

	it('lists a value once, whichever dimension names it first', () => {
		const twice = vocabularyEntries([
			{ name: 'a', attribute: 'data-color-scheme', values: null, source: 'test' },
			{ name: 'b', attribute: 'data-color-scheme', values: null, source: 'test' },
		]);
		expect(twice.map((e) => e.dimension)).toEqual(['a']);
	});
});
