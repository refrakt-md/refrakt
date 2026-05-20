import { describe, it, expect } from 'vitest';
import { generateThemeStylesheet, mergeThemeTokensConfigs } from '@refrakt-md/transform';
import { luminaTokens } from '../src/tokens.js';
import solarized from '../src/presets/solarized.js';
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

describe('Solarized preset module — SPEC-057 import', () => {
	describe('structural shape', () => {
		it('ships both light and dark modes (the unified-mode test case)', () => {
			expect(solarized.color).toBeDefined();
			expect(solarized.modes?.dark).toBeDefined();
		});

		it('claims chrome accents + code-surface + syntax in both modes', () => {
			expect(solarized.color?.bg).toBe('#fdf6e3'); // base3 — light canvas
			expect(solarized.color?.code?.bg).toBe('#fdf6e3');
			expect(solarized.modes?.dark.color?.bg).toBe('#002b36'); // base03 — dark canvas
			expect(solarized.modes?.dark.color?.code?.bg).toBe('#002b36');
		});

		it('stays out of typography / structural / status namespaces', () => {
			expect(solarized.font).toBeUndefined();
			expect(solarized.radius).toBeUndefined();
			expect(solarized.spacing).toBeUndefined();
			expect(solarized.shadow).toBeUndefined();
			const color = solarized.color as Record<string, unknown>;
			expect(color.info).toBeUndefined();
			expect(color.warning).toBeUndefined();
		});

		it('Solarized invariant — the eight accent hues are mode-symmetric', () => {
			// The whole point of Solarized: same accents in both modes.
			const accentRoles = [
				'keyword',    // red     #dc322f
				'function',   // blue    #268bd2
				'type',       // yellow  #b58900
				'string',     // cyan    #2aa198
				'constant',   // violet  #6c71c4
				'number',     // orange  #cb4b16
				'regex',      // green   #859900
				'tag',        // red
				'attribute',  // blue
				'operator',   // violet
				'string-expression', // magenta #d33682
			] as const;
			for (const role of accentRoles) {
				const light = (solarized.syntax as Record<string, string>)[role];
				const dark = (solarized.modes!.dark.syntax as Record<string, string>)[role];
				expect(light, `${role} in light mode`).toBeDefined();
				expect(dark, `${role} in dark mode`).toBeDefined();
				expect(light, `Solarized invariant: ${role} same in both modes`).toBe(dark);
			}
		});

		it('mode-flipped base tones differ between light and dark', () => {
			// Canvas / text / muted / border SHOULD flip — that's the whole
			// point of light vs dark.
			expect(solarized.color?.bg).not.toBe(solarized.modes?.dark.color?.bg);
			expect(solarized.color?.text).not.toBe(solarized.modes?.dark.color?.text);
			// Comments use the lighter base in light mode, darker in dark mode
			expect(solarized.syntax?.comment).not.toBe(solarized.modes?.dark.syntax?.comment);
		});

		it('sets SPEC-056 extended roles distinctly — Solarized splits 4+ of them', () => {
			const syn = solarized.syntax!;
			// number (orange) ≠ constant (violet) — Solarized splits these
			expect(syn.number).toBe('#cb4b16');
			expect(syn.constant).toBe('#6c71c4');
			expect(syn.number).not.toBe(syn.constant);
			// type (yellow) ≠ function (blue) — SPEC-056 headline split
			expect(syn.type).toBe('#b58900');
			expect(syn.function).toBe('#268bd2');
			expect(syn.type).not.toBe(syn.function);
			// regex (green) ≠ string (cyan)
			expect(syn.regex).toBe('#859900');
			expect(syn.string).toBe('#2aa198');
			expect(syn.regex).not.toBe(syn.string);
			// operator (violet) ≠ punctuation (base00)
			expect(syn.operator).toBe('#6c71c4');
			expect(syn.punctuation).toBe('#657b83');
			expect(syn.operator).not.toBe(syn.punctuation);
		});
	});

	describe('CSS generation', () => {
		const css = generateThemeStylesheet(solarized);
		const base = blockBody(css, /:root(?:,\s*\[data-color-scheme="light"\])?\s*\{/);
		const dark = blockBody(css, /\[data-theme="dark"\](?:,\s*\[data-color-scheme="dark"\])?\s*\{/);
		const baseDecls = declsIn(base);
		const darkDecls = declsIn(dark);

		it('emits both base and dark blocks (the only multi-mode preset in Phase 1 with this characteristic)', () => {
			expect(base.trim()).not.toBe('');
			expect(dark.trim()).not.toBe('');
		});

		it('emits chrome canvases per mode', () => {
			expect(baseDecls.get('--rf-color-bg')).toBe('#fdf6e3');
			expect(darkDecls.get('--rf-color-bg')).toBe('#002b36');
		});

		it('emits the same syntax accent values in both blocks (the Solarized invariant in CSS form)', () => {
			expect(baseDecls.get('--rf-syntax-keyword')).toBe('#dc322f');
			expect(darkDecls.get('--rf-syntax-keyword')).toBe('#dc322f');
			expect(baseDecls.get('--rf-syntax-token-type')).toBe('#b58900');
			expect(darkDecls.get('--rf-syntax-token-type')).toBe('#b58900');
		});
	});

	describe('composition with chrome presets', () => {
		it('composes with tideline — Solarized chrome wins on both modes when ordered last', () => {
			const merged = mergeThemeTokensConfigs(tideline, solarized);
			// Solarized's light chrome wins (it ships after tideline)
			expect(merged.color?.bg).toBe('#fdf6e3');
			expect(merged.modes?.dark.color?.bg).toBe('#002b36');
			// tideline's typography survives
			expect(merged.font?.sans).toBe(tideline.font?.sans);
		});

		it('composes with niwaki — niwaki syntax wins over Solarized when ordered last', () => {
			const merged = mergeThemeTokensConfigs(solarized, niwaki);
			expect(merged.syntax?.keyword).toBe(niwaki.syntax?.keyword);
			// Solarized's chrome canvas survives — niwaki doesn't touch chrome
			expect(merged.color?.bg).toBe('#fdf6e3');
		});

		it('lumina + solarized — Solarized overlays Lumina on chrome + code-surface + syntax', () => {
			const merged = mergeThemeTokensConfigs(luminaTokens, solarized);
			// Lumina's typography + structural tokens stay
			expect(merged.font?.sans).toBe(luminaTokens.font?.sans);
			expect(merged.color?.info).toEqual(luminaTokens.color?.info);
			// Solarized wins on chrome + syntax in both modes
			expect(merged.color?.bg).toBe('#fdf6e3');
			expect(merged.modes?.dark.color?.bg).toBe('#002b36');
			expect(merged.syntax?.type).toBe('#b58900');
		});
	});
});
