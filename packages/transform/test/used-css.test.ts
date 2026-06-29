import { describe, it, expect } from 'vitest';
import { computeUsedCssBlocks } from '../src/used-css.js';
import type { ThemeConfig } from '../src/types.js';

// Minimal config: only `hint` is a "real" rune here. `computeUsedCssBlocks`
// resolves the theme package from disk (`@refrakt-md/lumina`) and checks which
// `styles/runes/*.css` files exist, so we assert against Lumina's shipped set.
const config = { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: {
	Hint: { block: 'hint' },
} } as unknown as ThemeConfig;

describe('computeUsedCssBlocks — universal/layout-mode CSS (not rune-scoped)', () => {
	it('always includes carousel.css even when no carousel rune is used', async () => {
		// No rune emits `data-rune="carousel"` — carousel is a `data-layout` mode
		// (SPEC-100). Its skin must still ship or injected nav buttons are unstyled
		// in a production (tree-shaken) build.
		const { usedBlocks } = await computeUsedCssBlocks(['hint'], config, '@refrakt-md/lumina');
		expect(usedBlocks.has('carousel')).toBe(true);
	});

	it('always includes the tint and bg universal-axis CSS', async () => {
		const { usedBlocks } = await computeUsedCssBlocks(['hint'], config, '@refrakt-md/lumina');
		expect(usedBlocks.has('tint')).toBe(true);
		expect(usedBlocks.has('bg')).toBe(true);
	});

	it('includes a used rune block and omits an unused one', async () => {
		const cfg = { ...config, runes: { Hint: { block: 'hint' }, Recipe: { block: 'recipe' } } } as unknown as ThemeConfig;
		const { usedBlocks } = await computeUsedCssBlocks(['hint'], cfg, '@refrakt-md/lumina');
		expect(usedBlocks.has('hint')).toBe(true);
		expect(usedBlocks.has('recipe')).toBe(false);
	});
});
