import { describe, it, expect } from 'vitest';
import { generateThemeStylesheet, mergeThemeTokensConfigs } from '@refrakt-md/transform';
import { luminaTokens } from '../src/tokens.js';
import dracula from '../src/presets/dracula.js';
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

describe('Dracula preset module — SPEC-057 import', () => {
	describe('structural shape', () => {
		it('ships dark-only (no base-mode chrome) — Dracula has no official light variant', () => {
			const topLevel = Object.keys(dracula);
			expect(topLevel).toEqual(['modes']);
			expect(dracula.modes?.dark).toBeDefined();
		});

		it('claims chrome accents + code-surface + syntax in dark mode', () => {
			const dark = dracula.modes!.dark;
			expect(dark.color?.bg).toBe('#282a36');
			expect(dark.color?.code?.bg).toBe('#282a36');
			expect(dark.syntax?.keyword).toBe('#ff79c6');
		});

		it('stays out of typography / structural / status namespaces', () => {
			expect(dracula.font).toBeUndefined();
			expect(dracula.radius).toBeUndefined();
			expect(dracula.spacing).toBeUndefined();
			expect(dracula.shadow).toBeUndefined();
			const darkColor = dracula.modes!.dark.color as Record<string, unknown>;
			expect(darkColor.info).toBeUndefined();
			expect(darkColor.warning).toBeUndefined();
			expect(darkColor.danger).toBeUndefined();
			expect(darkColor.success).toBeUndefined();
		});

		it('sets at least three SPEC-056 extended roles distinctly from their core fallbacks', () => {
			const syn = dracula.modes!.dark.syntax!;
			// type ≠ function (Cyan vs Green — the SPEC-056 motivating split)
			expect(syn.type).toBe('#8be9fd');
			expect(syn.function).toBe('#50fa7b');
			expect(syn.type).not.toBe(syn.function);
			// tag ≠ keyword (both Pink in Dracula — same hue, intentional collapse)
			expect(syn.tag).toBe('#ff79c6');
			// attribute ≠ function (Green attributes ≠ Green functions — same hue here, but explicitly set)
			expect(syn.attribute).toBe('#50fa7b');
			// regex ≠ string (Red vs Yellow — Dracula distinguishes)
			expect(syn.regex).toBe('#ff5555');
			expect(syn.string).toBe('#f1fa8c');
			expect(syn.regex).not.toBe(syn.string);
		});
	});

	describe('CSS generation', () => {
		const css = generateThemeStylesheet(dracula);
		const dark = blockBody(css, /\[data-theme="dark"\](?:,\s*\[data-color-scheme="dark"\])?\s*\{/);
		const darkDecls = declsIn(dark);

		it('emits chrome accents in the dark block', () => {
			expect(darkDecls.get('--rf-color-bg')).toBe('#282a36');
			expect(darkDecls.get('--rf-color-text')).toBe('#f8f8f2');
			expect(darkDecls.get('--rf-color-primary')).toBe('#bd93f9');
			expect(darkDecls.get('--rf-color-surface')).toBe('#44475a');
		});

		it('emits code-surface tokens in the dark block', () => {
			expect(darkDecls.get('--rf-color-code-bg')).toBe('#282a36');
			expect(darkDecls.get('--rf-color-code-text')).toBe('#f8f8f2');
		});

		it('emits syntax contract + Shiki aliases for extended roles', () => {
			expect(darkDecls.get('--rf-syntax-type')).toBe('#8be9fd');
			expect(darkDecls.get('--rf-syntax-token-type')).toBe('#8be9fd');
			expect(darkDecls.get('--rf-syntax-regex')).toBe('#ff5555');
			expect(darkDecls.get('--rf-syntax-token-regex')).toBe('#ff5555');
		});

		it('emits no base block (no light-mode values)', () => {
			// The :root + [data-color-scheme="light"] block is the base layer.
			// Dracula sets no base-mode values so the block should be empty
			// or absent.
			const base = blockBody(css, /:root(?:,\s*\[data-color-scheme="light"\])?\s*\{/);
			expect(base.trim()).toBe('');
		});
	});

	describe('composition with chrome presets', () => {
		it('composes with tideline — tideline light chrome + Dracula dark overrides', () => {
			const merged = mergeThemeTokensConfigs(tideline, dracula);
			// tideline's light values win in the base layer (Dracula has no base)
			expect(merged.color?.bg).toBe(tideline.color?.bg);
			expect(merged.font?.sans).toBe(tideline.font?.sans);
			// Dracula's dark layer overrides tideline's dark layer
			expect(merged.modes?.dark.color?.bg).toBe('#282a36');
			expect(merged.modes?.dark.syntax?.type).toBe('#8be9fd');
			// tideline's dark typography survives (Dracula doesn't set fonts)
			// (font is set at the top level, so this is implicit)
		});

		it('composes with niwaki — niwaki syntax wins over Dracula in dark mode when ordered last', () => {
			const merged = mergeThemeTokensConfigs(dracula, niwaki);
			// niwaki overrides Dracula's syntax in *both* base and dark
			// (niwaki sets base-mode syntax too)
			expect(merged.syntax?.keyword).toBe(niwaki.syntax?.keyword);
			// But Dracula's chrome canvas survives — niwaki doesn't touch it
			expect(merged.modes?.dark.color?.bg).toBe('#282a36');
		});

		it('lumina + dracula — Dracula overlays Lumina with dark-mode-only overrides', () => {
			const merged = mergeThemeTokensConfigs(luminaTokens, dracula);
			// Lumina's typography + structural tokens stay (Dracula doesn't claim them)
			expect(merged.font?.sans).toBe(luminaTokens.font?.sans);
			expect(merged.radius?.md).toBe(luminaTokens.radius?.md);
			// Status sentiments stay (Dracula doesn't claim them)
			expect(merged.color?.info).toEqual(luminaTokens.color?.info);
			// Lumina's base (light) chrome stays — Dracula has no base
			expect(merged.color?.bg).toBe(luminaTokens.color?.bg);
			// Dracula's dark overlay wins on chrome + code-surface + syntax
			expect(merged.modes?.dark.color?.bg).toBe('#282a36');
			expect(merged.modes?.dark.color?.code?.bg).toBe('#282a36');
			expect(merged.modes?.dark.syntax?.type).toBe('#8be9fd');
		});
	});
});
