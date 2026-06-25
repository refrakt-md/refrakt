import { describe, it, expect } from 'vitest';
import { LAYOUT, CANONICAL_LAYOUTS, layoutMatches } from '../src/layout-vocabulary.js';

describe('canonical layout vocabulary (ADR-018)', () => {
	it('holds the canonical pool grid, list, and carousel', () => {
		expect(LAYOUT.grid).toBe('grid');
		expect(LAYOUT.list).toBe('list');
		expect(LAYOUT.carousel).toBe('carousel');
		expect([...CANONICAL_LAYOUTS].sort()).toEqual(['carousel', 'grid', 'list']);
	});

	it('composes canonical picks with rune-local literals', () => {
		expect(layoutMatches([LAYOUT.grid, LAYOUT.list], 'masonry')).toEqual(['grid', 'list', 'masonry']);
	});

	it('supports a canonical subset without local values', () => {
		expect(layoutMatches([LAYOUT.list])).toEqual(['list']);
	});

	it('returns a fresh array each call (Markdoc mutates matches)', () => {
		const a = layoutMatches([LAYOUT.grid]);
		const b = layoutMatches([LAYOUT.grid]);
		expect(a).not.toBe(b);
	});
});
