import { describe, it, expect } from 'vitest';
import { generateThemeStylesheet, mergeThemeTokensConfigs } from '@refrakt-md/transform';
import { luminaTokens } from '../src/tokens.js';
import catppuccin from '../src/presets/catppuccin.js';
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

describe('Catppuccin preset module — SPEC-057 import', () => {
	describe('structural shape', () => {
		it('ships Latte (light) + Mocha (dark) — canonical pair', () => {
			expect(catppuccin.color?.bg).toBe('#eff1f5'); // Latte Base
			expect(catppuccin.modes?.dark.color?.bg).toBe('#1e1e2e'); // Mocha Base
		});

		it('claims chrome accents + code-surface + syntax in both modes', () => {
			expect(catppuccin.color?.code?.bg).toBe('#e6e9ef'); // Latte Mantle
			expect(catppuccin.modes?.dark.color?.code?.bg).toBe('#181825'); // Mocha Mantle
		});

		it('stays out of typography / structural / status namespaces', () => {
			expect(catppuccin.font).toBeUndefined();
			expect(catppuccin.radius).toBeUndefined();
			expect(catppuccin.spacing).toBeUndefined();
			expect(catppuccin.shadow).toBeUndefined();
			expect((catppuccin.color as Record<string, unknown>).info).toBeUndefined();
		});

		it('sets the parameter role distinctly — Catppuccin gives it a dedicated Maroon hue', () => {
			expect(catppuccin.syntax?.parameter).toBe('#e64553'); // Latte Maroon
			expect(catppuccin.modes?.dark.syntax?.parameter).toBe('#eba0ac'); // Mocha Maroon
			// Verify it's distinct from variable (parameter's default fallback)
			expect(catppuccin.syntax?.parameter).not.toBe(catppuccin.syntax?.variable);
		});

		it('sets SPEC-056 extended roles distinctly — Catppuccin splits 6+', () => {
			const syn = catppuccin.syntax!;
			// type (Yellow) ≠ function (Blue)
			expect(syn.type).toBe('#df8e1d');
			expect(syn.function).toBe('#1e66f5');
			expect(syn.type).not.toBe(syn.function);
			// regex (Pink) ≠ string (Green)
			expect(syn.regex).toBe('#ea76cb');
			expect(syn.string).toBe('#40a02b');
			expect(syn.regex).not.toBe(syn.string);
			// operator (Sky) ≠ punctuation (Overlay2)
			expect(syn.operator).toBe('#04a5e5');
			expect(syn.punctuation).toBe('#7c7f93');
			expect(syn.operator).not.toBe(syn.punctuation);
			// attribute (Yellow) — same as type by Catppuccin intent (both type-family)
			expect(syn.attribute).toBe('#df8e1d');
			// tag (Mauve) — same as keyword by Catppuccin intent
			expect(syn.tag).toBe('#8839ef');
			expect(syn.tag).toBe(syn.keyword);
			// parameter (Maroon) — dedicated, ≠ variable
			expect(syn.parameter).not.toBe(syn.variable);
		});
	});

	describe('CSS generation', () => {
		const css = generateThemeStylesheet(catppuccin);
		const base = blockBody(css, /:root(?:,\s*\[data-color-scheme="light"\])?\s*\{/);
		const dark = blockBody(css, /\[data-theme="dark"\](?:,\s*\[data-color-scheme="dark"\])?\s*\{/);
		const baseDecls = declsIn(base);
		const darkDecls = declsIn(dark);

		it('emits chrome accents per mode', () => {
			expect(baseDecls.get('--rf-color-bg')).toBe('#eff1f5');
			expect(darkDecls.get('--rf-color-bg')).toBe('#1e1e2e');
		});

		it('emits code-surface tokens per mode', () => {
			expect(baseDecls.get('--rf-color-code-bg')).toBe('#e6e9ef');
			expect(darkDecls.get('--rf-color-code-bg')).toBe('#181825');
		});

		it('emits dedicated parameter Shiki alias in both modes', () => {
			expect(baseDecls.get('--rf-syntax-token-parameter')).toBe('#e64553');
			expect(darkDecls.get('--rf-syntax-token-parameter')).toBe('#eba0ac');
		});
	});

	describe('composition with chrome presets', () => {
		it('composes with tideline — Catppuccin chrome wins on both modes', () => {
			const merged = mergeThemeTokensConfigs(tideline, catppuccin);
			expect(merged.color?.bg).toBe('#eff1f5');
			expect(merged.modes?.dark.color?.bg).toBe('#1e1e2e');
			expect(merged.font?.sans).toBe(tideline.font?.sans);
		});

		it('composes with niwaki — niwaki syntax wins, Catppuccin chrome survives', () => {
			const merged = mergeThemeTokensConfigs(catppuccin, niwaki);
			expect(merged.syntax?.keyword).toBe(niwaki.syntax?.keyword);
			expect(merged.color?.bg).toBe('#eff1f5');
		});

		it('lumina + catppuccin — chrome + syntax wins, structural stays', () => {
			const merged = mergeThemeTokensConfigs(luminaTokens, catppuccin);
			expect(merged.font?.sans).toBe(luminaTokens.font?.sans);
			expect(merged.color?.info).toEqual(luminaTokens.color?.info);
			expect(merged.color?.bg).toBe('#eff1f5');
			expect(merged.syntax?.parameter).toBe('#e64553');
		});
	});
});
