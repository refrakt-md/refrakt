import { describe, it, expect } from 'vitest';
import { generateThemeStylesheet, mergeThemeTokensConfigs } from '@refrakt-md/transform';
import { luminaTokens } from '../src/tokens.js';
import oneDark from '../src/presets/one-dark.js';
import tideline from '../src/presets/tideline.js';
import niwaki from '../src/presets/niwaki.js';

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

describe('One Dark preset module — SPEC-057 import', () => {
	describe('structural shape', () => {
		it('ships dark-only — One Light defers to Phase 2', () => {
			expect(Object.keys(oneDark)).toEqual(['modes']);
			expect(oneDark.modes?.dark).toBeDefined();
		});

		it('claims chrome + code-surface + syntax in dark mode', () => {
			const dark = oneDark.modes!.dark;
			expect(dark.color?.bg).toBe('#282c34');     // syntax-bg
			expect(dark.color?.code?.bg).toBe('#282c34');
			expect(dark.syntax?.keyword).toBe('#c678dd'); // hue-3 purple
		});

		it('stays out of typography / structural / status namespaces', () => {
			expect(oneDark.font).toBeUndefined();
			expect(oneDark.radius).toBeUndefined();
			expect(oneDark.shadow).toBeUndefined();
			expect((oneDark.modes!.dark.color as Record<string, unknown>).info).toBeUndefined();
		});

		it('sets SPEC-056 extended roles distinctly — One Dark splits 4+', () => {
			const syn = oneDark.modes!.dark.syntax!;
			// type (Yellow) ≠ function (Blue)
			expect(syn.type).toBe('#e5c07b');
			expect(syn.function).toBe('#61afef');
			expect(syn.type).not.toBe(syn.function);
			// regex (Cyan) ≠ string (Green)
			expect(syn.regex).toBe('#56b6c2');
			expect(syn.string).toBe('#98c379');
			expect(syn.regex).not.toBe(syn.string);
			// tag (Red) — same as variable in Atom's intent (variable also uses red)
			expect(syn.tag).toBe('#e06c75');
			// operator (Cyan) ≠ punctuation (mono-1)
			expect(syn.operator).toBe('#56b6c2');
			expect(syn.punctuation).toBe('#abb2bf');
			expect(syn.operator).not.toBe(syn.punctuation);
		});
	});

	describe('CSS generation', () => {
		const css = generateThemeStylesheet(oneDark);
		const dark = blockBody(css, /\[data-theme="dark"\](?:,\s*\[data-color-scheme="dark"\])?\s*\{/);
		const darkDecls = declsIn(dark);

		it('emits chrome accents in dark block', () => {
			expect(darkDecls.get('--rf-color-bg')).toBe('#282c34');
			expect(darkDecls.get('--rf-color-primary')).toBe('#528bff');
		});

		it('emits no base block (dark-only preset)', () => {
			const base = blockBody(css, /:root(?:,\s*\[data-color-scheme="light"\])?\s*\{/);
			expect(base.trim()).toBe('');
		});
	});

	describe('composition with chrome presets', () => {
		it('composes with tideline — tideline light chrome + One Dark dark overrides', () => {
			const merged = mergeThemeTokensConfigs(tideline, oneDark);
			expect(merged.color?.bg).toBe(tideline.color?.bg);
			expect(merged.modes?.dark.color?.bg).toBe('#282c34');
		});

		it('composes with niwaki — niwaki syntax wins, One Dark chrome survives', () => {
			const merged = mergeThemeTokensConfigs(oneDark, niwaki);
			expect(merged.syntax?.keyword).toBe(niwaki.syntax?.keyword);
			expect(merged.modes?.dark.color?.bg).toBe('#282c34');
		});

		it('lumina + one-dark — dark-mode-only override', () => {
			const merged = mergeThemeTokensConfigs(luminaTokens, oneDark);
			expect(merged.font?.sans).toBe(luminaTokens.font?.sans);
			expect(merged.color?.bg).toBe(luminaTokens.color?.bg);
			expect(merged.modes?.dark.color?.bg).toBe('#282c34');
		});
	});
});
