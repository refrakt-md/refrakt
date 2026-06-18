import { describe, it, expect } from 'vitest';
import {
	generateThemeStylesheet,
	mergeThemeTokensConfigs,
	validateThemeTokensConfig,
} from '@refrakt-md/transform';
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
		it('claims chrome accents + code-surface + syntax — but stays out of typography / structural', () => {
			// Nord is an *integrated* palette — claims chrome (bg/surface/text/
			// muted/border/primary), code surface, and syntax. It stays out of
			// typography, status sentiments, radius, spacing, and shadow — those
			// remain the chrome theme's responsibility (and are filtered out of
			// scoped tint projections regardless).
			const topLevel = Object.keys(nord);
			expect(topLevel.sort()).toEqual(['color', 'modes', 'syntax'].sort());
			expect(nord.font).toBeUndefined();
			expect(nord.radius).toBeUndefined();
			expect(nord.spacing).toBeUndefined();
			expect(nord.shadow).toBeUndefined();
			// No status sentiment overrides
			expect(nord.color?.info).toBeUndefined();
			expect(nord.color?.warning).toBeUndefined();
			expect(nord.color?.danger).toBeUndefined();
			expect(nord.color?.success).toBeUndefined();
		});

		it('sets at least one extended syntax role distinctly from its core fallback', () => {
			// SPEC-056 validation: Nord must prove the fidelity gain by routing
			// type ≠ function. nord7 vs nord8.
			expect(nord.syntax!.type).toBe('#8fbcbb'); // Frost nord7
			expect(nord.syntax!.function).toBe('#88c0d0'); // Frost nord8
			expect(nord.syntax!.type).not.toBe(nord.syntax!.function);
		});

		it('validates cleanly against the token contract as an active preset', () => {
			// Regression: the token validator's contract shape once omitted the
			// SPEC-056 extended syntax roles (type/tag/attribute/operator/number/
			// regex), so validating Nord as the active preset rejected those keys
			// as "unknown token key". The validator now mirrors SyntaxTokens.
			const r = validateThemeTokensConfig(nord);
			expect(r.errors).toEqual([]);
			expect(r.valid).toBe(true);
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

		it('emits chrome accents + code-surface + syntax; nothing structural or status', () => {
			// Nord claims chrome (bg/surface/text/muted/border/primary),
			// code surface, and syntax. It does NOT claim typography
			// (font.*), structural (radius/spacing/shadow), or status
			// sentiments (color.info/warning/danger/success).
			const FORBIDDEN_PREFIXES = [
				'--rf-font-',
				'--rf-radius-',
				'--rf-spacing-',
				'--rf-inset-',
				'--rf-shadow-',
				'--rf-color-info',
				'--rf-color-warning',
				'--rf-color-danger',
				'--rf-color-success',
				'--rf-color-primary-50',
				'--rf-color-primary-100',
				'--rf-color-primary-200',
				'--rf-color-primary-300',
				'--rf-color-primary-400',
				'--rf-color-primary-500',
				'--rf-color-primary-600',
				'--rf-color-primary-700',
				'--rf-color-primary-800',
				'--rf-color-primary-900',
				'--rf-color-primary-950',
			];
			for (const name of baseDecls.keys()) {
				for (const prefix of FORBIDDEN_PREFIXES) {
					expect(
						name.startsWith(prefix),
						`Nord must not emit ${name} — outside the chrome accent + code-surface + syntax scope`,
					).toBe(false);
				}
			}
		});
	});

	describe('composition with chrome presets', () => {
		it('composes with tideline — tideline typography + Nord chrome', () => {
			const merged = mergeThemeTokensConfigs(tideline, nord);
			// tideline's typography wins (Nord doesn't claim font.*)
			expect(merged.font?.sans).toBe(tideline.font?.sans);
			// Nord wins on chrome (it ships after tideline and claims color.*)
			expect(merged.color?.bg).toBe(nord.color?.bg);
			expect(merged.color?.code?.bg).toBe(nord.color?.code?.bg);
			expect(merged.syntax?.type).toBe(nord.syntax?.type);
			expect(merged.syntax?.tag).toBe(nord.syntax?.tag);
		});

		it('composes with niwaki — niwaki syntax wins over Nord when ordered ["nord", "niwaki"]', () => {
			// Order matters: niwaki ships after Nord, so niwaki's syntax overrides win.
			// But niwaki doesn't set color.code.* or chrome, so Nord's canvas survives.
			const merged = mergeThemeTokensConfigs(nord, niwaki);
			expect(merged.syntax?.keyword).toBe(niwaki.syntax?.keyword);
			expect(merged.syntax?.function).toBe(niwaki.syntax?.function);
			// Nord's canvas survives — niwaki doesn't touch chrome / code surface
			expect(merged.color?.code?.bg).toBe(nord.color?.code?.bg);
			expect(merged.color?.bg).toBe(nord.color?.bg);
		});

		it('lumina + nord — Nord overlays Lumina on chrome + code-surface + syntax', () => {
			const merged = mergeThemeTokensConfigs(luminaTokens, nord);
			// Lumina's typography + structural tokens stay
			expect(merged.font?.sans).toBe(luminaTokens.font?.sans);
			expect(merged.radius?.md).toBe(luminaTokens.radius?.md);
			// Status sentiments stay (Nord doesn't claim them)
			expect(merged.color?.info).toEqual(luminaTokens.color?.info);
			// Nord wins on chrome accents, code surface, and syntax
			expect(merged.color?.bg).toBe(nord.color?.bg);
			expect(merged.color?.surface?.base).toBe(nord.color?.surface?.base);
			expect(merged.color?.code?.bg).toBe(nord.color?.code?.bg);
			expect(merged.syntax?.type).toBe(nord.syntax?.type);
		});
	});
});
