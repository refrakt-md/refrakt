import { describe, it, expect } from 'vitest';
import { generateThemeStylesheet, mergeThemeTokensConfigs } from '@refrakt-md/transform';
import { luminaTokens } from '../src/tokens.js';
import gruvbox from '../src/presets/gruvbox.js';
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

describe('Gruvbox preset module — SPEC-057 import (the warm one)', () => {
	describe('structural shape', () => {
		it('ships light medium (default) + dark medium (modes.dark) — canonical pair', () => {
			expect(gruvbox.color?.bg).toBe('#fbf1c7'); // light bg0
			expect(gruvbox.modes?.dark.color?.bg).toBe('#282828'); // dark bg0
		});

		it('claims chrome accents + code-surface + syntax in both modes', () => {
			expect(gruvbox.color?.code?.bg).toBe('#ebdbb2'); // light bg1
			expect(gruvbox.modes?.dark.color?.code?.bg).toBe('#282828'); // dark bg0
		});

		it('stays out of typography / structural / status namespaces', () => {
			expect(gruvbox.font).toBeUndefined();
			expect(gruvbox.radius).toBeUndefined();
			expect(gruvbox.shadow).toBeUndefined();
			expect((gruvbox.color as Record<string, unknown>).info).toBeUndefined();
		});

		it('sets SPEC-056 extended roles distinctly — Gruvbox splits 4+', () => {
			const syn = gruvbox.modes!.dark.syntax!;
			// type (Green) ≠ function (Yellow)
			expect(syn.type).toBe('#b8bb26');
			expect(syn.function).toBe('#fabd2f');
			expect(syn.type).not.toBe(syn.function);
			// regex (Orange) ≠ string (Green)
			expect(syn.regex).toBe('#fe8019');
			expect(syn.string).toBe('#b8bb26');
			expect(syn.regex).not.toBe(syn.string);
			// operator (Orange) ≠ punctuation (foreground)
			expect(syn.operator).toBe('#fe8019');
			expect(syn.punctuation).toBe('#ebdbb2');
			expect(syn.operator).not.toBe(syn.punctuation);
			// attribute (Blue) ≠ function (Yellow)
			expect(syn.attribute).toBe('#83a598');
			expect(syn.attribute).not.toBe(syn.function);
		});

		it('is genuinely warm — primary colour family is in the warm half of the spectrum (red/orange/yellow/brown)', () => {
			// Sanity check: keyword in light mode should be red-ish, not blue-ish.
			// Verifies we didn't accidentally swap warm/cool somewhere.
			expect(gruvbox.syntax?.keyword).toBe('#9d0006'); // faded_red (light)
			expect(gruvbox.modes?.dark.syntax?.keyword).toBe('#fb4934'); // bright_red (dark)
		});
	});

	describe('CSS generation', () => {
		const css = generateThemeStylesheet(gruvbox);
		const base = blockBody(css, /:root(?:,\s*\[data-color-scheme="light"\])?\s*\{/);
		const dark = blockBody(css, /\[data-theme="dark"\](?:,\s*\[data-color-scheme="dark"\])?\s*\{/);
		const baseDecls = declsIn(base);
		const darkDecls = declsIn(dark);

		it('emits chrome canvases per mode', () => {
			expect(baseDecls.get('--rf-color-bg')).toBe('#fbf1c7');
			expect(darkDecls.get('--rf-color-bg')).toBe('#282828');
		});

		it('emits warm-distinctive syntax tokens', () => {
			expect(baseDecls.get('--rf-syntax-keyword')).toBe('#9d0006');  // faded_red
			expect(darkDecls.get('--rf-syntax-keyword')).toBe('#fb4934');  // bright_red
			expect(darkDecls.get('--rf-syntax-token-operator')).toBe('#fe8019'); // bright_orange
		});
	});

	describe('composition with chrome presets', () => {
		it('composes with tideline — Gruvbox chrome wins on both modes', () => {
			const merged = mergeThemeTokensConfigs(tideline, gruvbox);
			expect(merged.color?.bg).toBe('#fbf1c7');
			expect(merged.modes?.dark.color?.bg).toBe('#282828');
			expect(merged.font?.sans).toBe(tideline.font?.sans);
		});

		it('composes with niwaki — niwaki syntax wins, Gruvbox chrome survives', () => {
			const merged = mergeThemeTokensConfigs(gruvbox, niwaki);
			expect(merged.syntax?.keyword).toBe(niwaki.syntax?.keyword);
			expect(merged.color?.bg).toBe('#fbf1c7');
		});

		it('lumina + gruvbox — chrome + syntax wins, structural stays', () => {
			const merged = mergeThemeTokensConfigs(luminaTokens, gruvbox);
			expect(merged.font?.sans).toBe(luminaTokens.font?.sans);
			expect(merged.color?.bg).toBe('#fbf1c7');
			expect(merged.syntax?.keyword).toBe('#9d0006');
		});
	});
});
