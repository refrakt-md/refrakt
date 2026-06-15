import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// @ts-expect-error — plain .mjs build script, no type declarations.
import { iconMaskTokenCss } from '../scripts/generate-tokens.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(resolve(here, '..', p), 'utf-8');

describe('icon-from-config (SPEC-094 §8 / WORK-437)', () => {
	it('surfaces config glyphs as --rf-icon-<group>-<name> mask custom properties', () => {
		const css = iconMaskTokenCss({
			hint: { note: '<svg><circle/></svg>' },
			accordion: { chevron: '<svg><polyline/></svg>' },
		});
		expect(css).toContain('--rf-icon-hint-note: url("data:image/svg+xml,');
		expect(css).toContain('--rf-icon-accordion-chevron: url("data:image/svg+xml,');
	});

	it('is config-driven — overriding the glyph changes the generated token, no CSS edit', () => {
		const a = iconMaskTokenCss({ hint: { note: '<svg><circle/></svg>' } });
		const b = iconMaskTokenCss({ hint: { note: '<svg><rect/></svg>' } });
		expect(a).not.toBe(b);
		expect(a).toContain('circle');   // encoded glyph A
		expect(b).toContain('rect');     // encoded glyph B
		// Same custom-property name in both — only the value (the glyph) changed,
		// so a theme re-glyphs by config alone.
		expect(a).toContain('--rf-icon-hint-note:');
		expect(b).toContain('--rf-icon-hint-note:');
	});

	it('pins currentColor to an opaque paint so the mask silhouette renders', () => {
		const css = iconMaskTokenCss({ hint: { note: '<svg stroke="currentColor"><circle/></svg>' } });
		expect(css).not.toContain('currentColor');
		expect(css.toLowerCase()).toContain('black');
	});

	it('excludes the global Lucide set (those are {% icon %} glyphs, not surface masks)', () => {
		const css = iconMaskTokenCss({ global: { box: '<svg><rect/></svg>' }, hint: { note: '<svg/>' } });
		expect(css).not.toContain('--rf-icon-global-');
		expect(css).toContain('--rf-icon-hint-note');
	});

	it('leaves no embedded data-URI glyphs in hint/accordion CSS', () => {
		expect(read('styles/runes/hint.css')).not.toMatch(/data:image\/svg\+xml/);
		expect(read('styles/runes/accordion.css')).not.toMatch(/data:image\/svg\+xml/);
		// …and they read the registry-fed custom properties instead.
		expect(read('styles/runes/hint.css')).toContain('var(--rf-icon-hint-note)');
		expect(read('styles/runes/accordion.css')).toContain('var(--rf-icon-accordion-chevron)');
	});

	it('ships the generated icon tokens in the committed base.css', () => {
		const base = read('tokens/base.css');
		for (const v of ['hint-note', 'hint-warning', 'hint-caution', 'hint-check', 'accordion-chevron']) {
			expect(base).toContain(`--rf-icon-${v}: url("data:image/svg+xml,`);
		}
	});
});
