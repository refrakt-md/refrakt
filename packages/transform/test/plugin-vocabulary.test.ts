import { describe, it, expect } from 'vitest';
import { lintTokenOnly, novelElements } from '../src/plugin-vocabulary.js';
import type { RuneContract } from '../src/contracts.js';

/** WORK-673 — ADR-044's two reports on a plugin rune's own structure. */

describe('novelElements', () => {
	it('lists the elements no vocabulary role names', () => {
		const contract = {
			root: '.rf-x',
			dataRune: 'x',
			elements: {
				meta: { tag: 'div', selector: '.rf-x__meta', source: 'block' },
				headline: { tag: 'h2', selector: '.rf-x__headline', source: 'autoLabel' },
				media: { tag: 'div', selector: '.rf-x__media', source: 'autoLabel' },
				ordinal: { tag: 'span', selector: '.rf-x__ordinal', source: 'structure' },
				dial: { tag: 'div', selector: '.rf-x__dial', source: 'structure' },
			},
		} as unknown as RuneContract;
		expect(
			novelElements(contract, {
				block: 'x',
				sections: { headline: 'title' },
				mediaSlots: { media: 'cover' },
			}),
		).toEqual(['dial']);
	});
});

describe('lintTokenOnly', () => {
	it('flags literal colours, sizes and font stacks, with their line and property', () => {
		const findings = lintTokenOnly(`.a {
	color: #fff;
	padding: 0.75rem 1.25rem;
	font-family: "Inter", sans-serif;
	background: rgb(0 0 0 / 50%);
}`);
		expect(findings.map((f) => [f.kind, f.line, f.property, f.value])).toEqual([
			['colour', 2, 'color', '#fff'],
			['size', 3, 'padding', '0.75rem'],
			['size', 3, 'padding', '1.25rem'],
			['font', 4, 'font-family', '"Inter", sans-serif'],
			['colour', 5, 'background', 'rgb('],
		]);
	});

	it('accepts tokens, keywords, zero, token definitions and var() fallbacks', () => {
		expect(
			lintTokenOnly(`.a {
	--x-gap: 12px;
	color: var(--rf-color-text);
	margin: 0;
	padding: var(--rf-spacing-sm, 0.5rem);
	font-family: var(--rf-font-mono, monospace);
	display: flex;
}`),
		).toEqual([]);
	});

	it('ignores comments', () => {
		expect(lintTokenOnly('/* color: #fff; */ .a { color: var(--c) }')).toEqual([]);
	});
});
