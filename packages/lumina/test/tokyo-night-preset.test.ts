import { describe, it, expect } from 'vitest';
import { generateThemeStylesheet, mergeThemeTokensConfigs } from '@refrakt-md/transform';
import { luminaTokens } from '../src/tokens.js';
import tokyoNight from '../src/presets/tokyo-night.js';
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

describe('Tokyo Night preset module — SPEC-057 import + extended-role validator', () => {
	describe('structural shape', () => {
		it('ships Day (light) + Storm (dark) — canonical pair', () => {
			expect(tokyoNight.color?.bg).toBe('#e1e2e7'); // Day
			expect(tokyoNight.modes?.dark.color?.bg).toBe('#24283b'); // Storm
		});

		it('claims chrome accents + code-surface + syntax in both modes', () => {
			expect(tokyoNight.color?.code?.bg).toBe('#d6d8de'); // Day code surface
			expect(tokyoNight.modes?.dark.color?.code?.bg).toBe('#1f2335'); // Storm code surface
		});

		it('stays out of typography / structural / status namespaces', () => {
			expect(tokyoNight.font).toBeUndefined();
			expect(tokyoNight.radius).toBeUndefined();
			expect(tokyoNight.shadow).toBeUndefined();
			expect((tokyoNight.color as Record<string, unknown>).info).toBeUndefined();
		});

		// SPEC-057 WORK-227 acceptance gate: Tokyo Night must set 4+ extended
		// roles distinctly to validate the SPEC-056 widening. If this drops
		// below 4, escalate per the SPEC-057 verification gate.
		it('SPEC-057 fidelity gate: sets at least 4 of 7 extended roles distinctly in dark mode', () => {
			const syn = tokyoNight.modes!.dark.syntax!;
			const EXTENDED_ROLES = ['type', 'property', 'parameter', 'tag', 'attribute', 'operator', 'number', 'regex'] as const;
			const FALLBACK_PAIRS: Record<string, keyof typeof syn> = {
				type: 'function',
				property: 'variable',
				parameter: 'variable',
				tag: 'keyword',
				attribute: 'function',
				operator: 'punctuation',
				number: 'constant',
				regex: 'string',
			};
			let distinctCount = 0;
			for (const role of EXTENDED_ROLES) {
				const value = (syn as Record<string, string | undefined>)[role];
				if (value === undefined) continue;
				const fallback = (syn as Record<string, string | undefined>)[FALLBACK_PAIRS[role]];
				if (value !== fallback) distinctCount++;
			}
			expect(distinctCount, `Tokyo Night should distinguish ≥4 extended roles in dark mode; found ${distinctCount}`).toBeGreaterThanOrEqual(4);
		});

		it('headline SPEC-056 split — type ≠ function in both modes', () => {
			expect(tokyoNight.syntax?.type).toBe('#007197'); // Day cyan
			expect(tokyoNight.syntax?.function).toBe('#2e7de9'); // Day blue
			expect(tokyoNight.syntax?.type).not.toBe(tokyoNight.syntax?.function);
			expect(tokyoNight.modes?.dark.syntax?.type).toBe('#7dcfff'); // Storm cyan
			expect(tokyoNight.modes?.dark.syntax?.function).toBe('#7aa2f7'); // Storm blue
			expect(tokyoNight.modes?.dark.syntax?.type).not.toBe(tokyoNight.modes?.dark.syntax?.function);
		});

		it('parameter gets a dedicated hue in Storm (yellow #e0af68) distinct from variable', () => {
			expect(tokyoNight.modes?.dark.syntax?.parameter).toBe('#e0af68');
			expect(tokyoNight.modes?.dark.syntax?.parameter).not.toBe(tokyoNight.modes?.dark.syntax?.variable);
		});
	});

	describe('CSS generation', () => {
		const css = generateThemeStylesheet(tokyoNight);
		const base = blockBody(css, /:root(?:,\s*\[data-color-scheme="light"\])?\s*\{/);
		const dark = blockBody(css, /\[data-theme="dark"\](?:,\s*\[data-color-scheme="dark"\])?\s*\{/);
		const baseDecls = declsIn(base);
		const darkDecls = declsIn(dark);

		it('emits chrome canvases per mode', () => {
			expect(baseDecls.get('--rf-color-bg')).toBe('#e1e2e7');
			expect(darkDecls.get('--rf-color-bg')).toBe('#24283b');
		});

		it('emits all four headline-split Shiki aliases in Storm', () => {
			expect(darkDecls.get('--rf-syntax-token-type')).toBe('#7dcfff');
			expect(darkDecls.get('--rf-syntax-token-function')).toBe('#7aa2f7');
			expect(darkDecls.get('--rf-syntax-token-parameter')).toBe('#e0af68');
			expect(darkDecls.get('--rf-syntax-token-tag')).toBe('#f7768e');
		});
	});

	describe('composition with chrome presets', () => {
		it('composes with tideline — Tokyo Night chrome wins on both modes', () => {
			const merged = mergeThemeTokensConfigs(tideline, tokyoNight);
			expect(merged.color?.bg).toBe('#e1e2e7');
			expect(merged.modes?.dark.color?.bg).toBe('#24283b');
			expect(merged.font?.sans).toBe(tideline.font?.sans);
		});

		it('composes with niwaki — niwaki syntax wins, Tokyo Night chrome survives', () => {
			const merged = mergeThemeTokensConfigs(tokyoNight, niwaki);
			expect(merged.syntax?.keyword).toBe(niwaki.syntax?.keyword);
			expect(merged.color?.bg).toBe('#e1e2e7');
		});

		it('lumina + tokyo-night — chrome + syntax wins, structural stays', () => {
			const merged = mergeThemeTokensConfigs(luminaTokens, tokyoNight);
			expect(merged.font?.sans).toBe(luminaTokens.font?.sans);
			expect(merged.color?.bg).toBe('#e1e2e7');
			expect(merged.modes?.dark.syntax?.parameter).toBe('#e0af68');
		});
	});
});
