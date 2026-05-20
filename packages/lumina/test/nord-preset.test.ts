import { describe, it, expect } from 'vitest';
import { generateThemeStylesheet, mergeThemeTokensConfigs } from '@refrakt-md/transform';
import { luminaTokens } from '../src/tokens.js';
import nord from '../src/presets/nord.js';
import tideline from '../src/presets/tideline.js';
import niwaki from '../src/presets/niwaki.js';

/** Extract `--var: value;` declarations from a single CSS block body. */
function declsIn(css: string): Map<string, string> {
	const out = new Map<string, string>();
	for (const m of css.matchAll(/(--[a-zA-Z0-9_-]+):\s*([^;\n]+);/g)) {
		const name = m[1].trim();
		if (!out.has(name)) out.set(name, m[2].trim());
	}
	return out;
}

function blockBody(css: string, selectorPattern: RegExp): string {
	const m = css.match(selectorPattern);
	if (!m) return '';
	const start = m.index! + m[0].length;
	let depth = 1;
	for (let i = start; i < css.length; i++) {
		if (css[i] === '{') depth++;
		else if (css[i] === '}') {
			depth--;
			if (depth === 0) return css.slice(start, i);
		}
	}
	return css.slice(start);
}

describe('Nord preset module — SPEC-056 validation case', () => {
	describe('structural shape', () => {
		it('overrides only syntax and color.code namespaces — no chrome, fonts, status, structural', () => {
			// Nord is an *integrated* palette — sets syntax + code surface but
			// not chrome (bg/surface/primary/border), typography, status, radius,
			// spacing, or shadow. Those remain the chrome theme's responsibility.
			const topLevel = Object.keys(nord);
			expect(topLevel.sort()).toEqual(['color', 'modes', 'syntax'].sort());
			expect(Object.keys(nord.color!)).toEqual(['code']);
			expect(nord.font).toBeUndefined();
			expect(nord.radius).toBeUndefined();
			expect(nord.spacing).toBeUndefined();
			expect(nord.shadow).toBeUndefined();
		});

		it('sets at least one extended syntax role distinctly from its core fallback', () => {
			// SPEC-056 validation: Nord must prove the fidelity gain by routing
			// type ≠ function. nord7 vs nord8.
			expect(nord.syntax!.type).toBe('#8fbcbb'); // Frost nord7
			expect(nord.syntax!.function).toBe('#88c0d0'); // Frost nord8
			expect(nord.syntax!.type).not.toBe(nord.syntax!.function);
		});

		it('sets color.code.* in both light and dark modes (canvas-claiming)', () => {
			expect(nord.color!.code!.bg).toBe('#eceff4'); // Snow Storm nord6
			expect(nord.color!.code!.text).toBe('#2e3440'); // Polar Night nord0
			expect(nord.modes!.dark.color!.code!.bg).toBe('#2e3440'); // Polar Night nord0
			expect(nord.modes!.dark.color!.code!.text).toBe('#d8dee9'); // Snow Storm nord4
		});
	});

	describe('CSS generation', () => {
		const css = generateThemeStylesheet(nord);
		const base = blockBody(css, /:root(?:,\s*\[data-color-scheme="light"\])?\s*\{/);
		const dark = blockBody(css, /\[data-theme="dark"\](?:,\s*\[data-color-scheme="dark"\])?\s*\{/);
		const baseDecls = declsIn(base);
		const darkDecls = declsIn(dark);

		it('emits contract variables for set syntax roles', () => {
			expect(baseDecls.get('--rf-syntax-keyword')).toBe('#5e81ac');
			expect(baseDecls.get('--rf-syntax-function')).toBe('#88c0d0');
			expect(baseDecls.get('--rf-syntax-type')).toBe('#8fbcbb');
			expect(baseDecls.get('--rf-syntax-tag')).toBe('#5e81ac');
		});

		it('emits Shiki aliases including the new SPEC-056 extended ones', () => {
			expect(baseDecls.get('--rf-syntax-token-type')).toBe('#8fbcbb');
			expect(baseDecls.get('--rf-syntax-token-tag')).toBe('#5e81ac');
			expect(baseDecls.get('--rf-syntax-token-attribute')).toBe('#8fbcbb');
			expect(baseDecls.get('--rf-syntax-token-operator')).toBe('#81a1c1');
			expect(baseDecls.get('--rf-syntax-token-number')).toBe('#d08770');
			expect(baseDecls.get('--rf-syntax-token-regex')).toBe('#ebcb8b');
		});

		it('emits code-surface tokens in light mode', () => {
			expect(baseDecls.get('--rf-color-code-bg')).toBe('#eceff4');
			expect(baseDecls.get('--rf-color-code-text')).toBe('#2e3440');
		});

		it('emits code-surface tokens in dark mode', () => {
			expect(darkDecls.get('--rf-color-code-bg')).toBe('#2e3440');
			expect(darkDecls.get('--rf-color-code-text')).toBe('#d8dee9');
		});

		it('emits no chrome / typography / structural tokens', () => {
			// Code-surface IS chrome-territory; everything else is not.
			for (const name of baseDecls.keys()) {
				// Allowlist of namespaces Nord is permitted to write to.
				const allowed = (
					name.startsWith('--rf-syntax-') ||
					name.startsWith('--rf-color-code-')
				);
				expect(allowed, `Nord must not emit ${name} — it's outside the syntax + code-surface scope`).toBe(true);
			}
		});
	});

	describe('composition with chrome presets', () => {
		it('composes with tideline — tideline chrome + Nord code surface', () => {
			const merged = mergeThemeTokensConfigs(tideline, nord);
			// tideline's chrome wins where Nord doesn't set (font, body bg, etc.)
			expect(merged.font?.sans).toBe(tideline.font?.sans);
			expect(merged.color?.bg).toBe(tideline.color?.bg);
			// Nord wins where it sets — code surface + syntax tokens
			expect(merged.color?.code?.bg).toBe(nord.color?.code?.bg);
			expect(merged.syntax?.type).toBe(nord.syntax?.type);
			expect(merged.syntax?.tag).toBe(nord.syntax?.tag);
		});

		it('composes with niwaki — niwaki syntax wins over Nord when ordered ["nord", "niwaki"]', () => {
			// Order matters: niwaki ships after Nord, so niwaki's syntax overrides win.
			// But niwaki doesn't set color.code.*, so Nord's canvas survives the merge.
			const merged = mergeThemeTokensConfigs(nord, niwaki);
			expect(merged.syntax?.keyword).toBe(niwaki.syntax?.keyword);
			expect(merged.syntax?.function).toBe(niwaki.syntax?.function);
			// Nord's code canvas survives — niwaki doesn't touch it
			expect(merged.color?.code?.bg).toBe(nord.color?.code?.bg);
		});

		it('lumina + nord — Nord overlays Lumina exactly on syntax + code surface', () => {
			const merged = mergeThemeTokensConfigs(luminaTokens, nord);
			// Lumina's chrome stays
			expect(merged.color?.text).toBe(luminaTokens.color?.text);
			expect(merged.color?.surface?.base).toBe(luminaTokens.color?.surface?.base);
			// Nord overrides code surface and syntax
			expect(merged.color?.code?.bg).toBe(nord.color?.code?.bg);
			expect(merged.syntax?.type).toBe(nord.syntax?.type);
		});
	});
});
