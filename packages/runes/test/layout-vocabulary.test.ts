import { describe, it, expect } from 'vitest';
import { LAYOUT, CANONICAL_LAYOUTS, layoutMatches } from '../src/layout-vocabulary.js';

describe('canonical layout vocabulary (ADR-018)', () => {
	it('seeds the canonical pool with grid and list', () => {
		expect(LAYOUT.grid).toBe('grid');
		expect(LAYOUT.list).toBe('list');
		expect([...CANONICAL_LAYOUTS].sort()).toEqual(['grid', 'list']);
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
