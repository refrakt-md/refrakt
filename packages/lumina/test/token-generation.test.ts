import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// @ts-expect-error — plain .mjs build script, no type declarations.
import { renderTokenCss } from '../scripts/generate-tokens.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const baseCssPath = resolve(here, '..', 'tokens', 'base.css');
const darkCssPath = resolve(here, '..', 'tokens', 'dark.css');

/** Extract `--var: value;` declarations from a CSS block into a Map (first wins). */
function extractDeclarations(css: string): Map<string, string> {
	const out = new Map<string, string>();
	for (const m of css.matchAll(/(--[a-zA-Z0-9_-]+):\s*([^;\n]+);/g)) {
		const name = m[1].trim();
		const value = m[2].trim();
		if (!out.has(name)) out.set(name, value);
	}
	return out;
}

/** Extract the body of the first block matching a selector header. */
function extractBlock(css: string, selectorPattern: RegExp): string {
	const m = css.match(selectorPattern);
	if (!m) return '';
	const startIdx = m.index! + m[0].length;
	let depth = 1;
	for (let i = startIdx; i < css.length; i++) {
		if (css[i] === '{') depth++;
		else if (css[i] === '}') {
			depth--;
			if (depth === 0) return css.slice(startIdx, i);
		}
	}
	return css.slice(startIdx);
}

describe('Lumina token CSS is generated from src/tokens.ts', () => {
	const { base, dark } = renderTokenCss() as { base: string; dark: string };

	// The generation guarantee that replaces the old hand-authored mirror: the
	// committed CSS must be byte-identical to what `scripts/generate-tokens.mjs`
	// produces from `luminaTokens`. A stale edit to either side fails here.
	it('tokens/base.css matches the generated output (no drift)', () => {
		expect(readFileSync(baseCssPath, 'utf-8')).toBe(base);
	});

	it('tokens/dark.css matches the generated output (no drift)', () => {
		expect(readFileSync(darkCssPath, 'utf-8')).toBe(dark);
	});

	it('emits combined data-theme/data-color-scheme + prefers-color-scheme blocks', () => {
		expect(dark).toContain('[data-theme="dark"], [data-color-scheme="dark"] {');
		expect(dark).toContain('@media (prefers-color-scheme: dark)');
		expect(dark).toContain(':root:not([data-theme="light"])');
	});

	// tint.css re-declares the palette under [data-color-scheme="dark"|"light"]
	// (the scoped scheme override used by preview/tint-mode/sandbox), a hand-kept
	// copy the generator does not reach. Catch value drift on every --rf-* key it
	// shares with the canonical token CSS.
	it('keeps tint.css [data-color-scheme] overrides in sync with the token CSS', () => {
		const tintCss = readFileSync(resolve(here, '..', 'styles', 'runes', 'tint.css'), 'utf-8');
		const baseDecls = extractDeclarations(readFileSync(baseCssPath, 'utf-8'));
		const darkThemeDecls = extractDeclarations(
			extractBlock(darkCssPath ? readFileSync(darkCssPath, 'utf-8') : '', /\[data-theme="dark"\](?:,\s*\[data-color-scheme="dark"\])?\s*\{/),
		);
		const tintDark = extractDeclarations(extractBlock(tintCss, /\[data-color-scheme="dark"\]\s*\{/));
		const tintLight = extractDeclarations(extractBlock(tintCss, /\[data-color-scheme="light"\]\s*\{/));

		const resolveVar = (value: string, decls: Map<string, string>): string => {
			const m = value.match(/^var\(\s*(--[A-Za-z0-9-]+)\s*\)$/);
			return m ? decls.get(m[1]) ?? value : value;
		};
		const drift: { name: string; block: string; tint: string; canonical: string }[] = [];
		const check = (decls: Map<string, string>, canonical: Map<string, string>, block: string) => {
			for (const [name, raw] of decls) {
				if (!name.startsWith('--rf-')) continue;
				const value = resolveVar(raw, decls);
				const want = canonical.get(name);
				if (want !== undefined && want !== value) drift.push({ name, block, tint: value, canonical: want });
			}
		};
		check(tintDark, darkThemeDecls, 'dark');
		check(tintLight, baseDecls, 'light');
		expect(drift, `tint.css scheme overrides drifted: ${JSON.stringify(drift, null, 2)}`).toEqual([]);
	});
});
