import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generateThemeStylesheet } from '@refrakt-md/transform';
import { luminaTokens } from '../src/tokens.js';

const here = dirname(fileURLToPath(import.meta.url));
const baseCssPath = resolve(here, '..', 'tokens', 'base.css');
const darkCssPath = resolve(here, '..', 'tokens', 'dark.css');

/** Extract `--var: value;` declarations from a single CSS block (selector + body)
 *  into a Map. Returns the *first* occurrence's value — useful for the base
 *  `:root` block whose declarations get duplicated by mode media-query blocks. */
function extractDeclarations(css: string): Map<string, string> {
	const out = new Map<string, string>();
	for (const m of css.matchAll(/(--[a-zA-Z0-9_-]+):\s*([^;\n]+);/g)) {
		const name = m[1].trim();
		const value = m[2].trim();
		if (!out.has(name)) out.set(name, value);
	}
	return out;
}

/** Extract just the body of the first block matching the given selector header,
 *  so we can compare base vs dark independently. */
function extractBlock(css: string, selectorPattern: RegExp): string {
	const m = css.match(selectorPattern);
	if (!m) return '';
	const startIdx = m.index! + m[0].length;
	// Walk braces to find the matching close.
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

describe('luminaTokens coverage vs hand-authored CSS', () => {
	const generated = generateThemeStylesheet(luminaTokens);
	const baseCss = readFileSync(baseCssPath, 'utf-8');
	const darkCss = readFileSync(darkCssPath, 'utf-8');

	// Generator emits combined `:root, [data-color-scheme="light"]` so base
	// tokens also apply to subtrees forced to light scheme.
	const generatedBaseBlock = extractBlock(
		generated,
		/:root(?:,\s*\[data-color-scheme="light"\])?\s*\{/,
	);
	// Generator emits combined `[data-theme="dark"], [data-color-scheme="dark"]`
	// so per-mode overrides apply to subtrees forced to a scheme too.
	const generatedDarkBlock = extractBlock(
		generated,
		/\[data-theme="dark"\](?:,\s*\[data-color-scheme="dark"\])?\s*\{/,
	);
	const generatedBaseDecls = extractDeclarations(generatedBaseBlock);
	const generatedDarkDecls = extractDeclarations(generatedDarkBlock);

	it('covers every --rf-* declaration in base.css with the same value', () => {
		const baseDecls = extractDeclarations(baseCss);
		const missing: string[] = [];
		const mismatched: { name: string; expected: string; got: string | undefined }[] = [];
		for (const [name, expected] of baseDecls) {
			const got = generatedBaseDecls.get(name);
			if (got === undefined) missing.push(name);
			else if (got !== expected) mismatched.push({ name, expected, got });
		}
		expect(missing, `missing in generated base block: ${missing.join(', ')}`).toEqual([]);
		expect(mismatched, `value mismatch: ${JSON.stringify(mismatched, null, 2)}`).toEqual([]);
	});

	it('covers every --rf-* declaration in dark.css with the same value', () => {
		const darkBlock = extractBlock(darkCss, /\[data-theme="dark"\]\s*\{/);
		const darkDecls = extractDeclarations(darkBlock);
		const missing: string[] = [];
		const mismatched: { name: string; expected: string; got: string | undefined }[] = [];
		for (const [name, expected] of darkDecls) {
			const got = generatedDarkDecls.get(name);
			if (got === undefined) missing.push(name);
			else if (got !== expected) mismatched.push({ name, expected, got });
		}
		expect(missing, `missing in generated dark block: ${missing.join(', ')}`).toEqual([]);
		expect(mismatched, `value mismatch: ${JSON.stringify(mismatched, null, 2)}`).toEqual([]);
	});

	it('emits both [data-theme="dark"] and @media (prefers-color-scheme: dark) blocks', () => {
		// Combined selector lets per-mode overrides apply to subtrees forced
		// to a scheme via data-color-scheme (preview canvas, sandboxes).
		expect(generated).toContain('[data-theme="dark"], [data-color-scheme="dark"] {');
		expect(generated).toContain('@media (prefers-color-scheme: dark)');
		// Matches Lumina's hand-authored dark.css selector — same specificity
		// so source order resolves preset overrides correctly.
		expect(generated).toContain(':root:not([data-theme="light"])');
	});

	it('emits font, scale, radius, spacing, inset, shadow, and code tokens in the base block', () => {
		const must = [
			'--rf-font-sans',
			'--rf-font-mono',
			'--rf-font-display',            // SPEC-094 — heading/display family
			'--rf-text',                    // text.base → no suffix per contract rule
			'--rf-text-sm',
			'--rf-text-2xl',
			'--rf-weight-semibold',
			'--rf-leading-normal',
			'--rf-tracking-wide',
			'--rf-color-primary',
			'--rf-color-primary-bg',
			'--rf-color-bg',
			'--rf-color-text',
			'--rf-color-surface',           // base → no suffix per contract rule
			'--rf-color-surface-hover',
			'--rf-color-info',              // sentiment base → no suffix
			'--rf-color-info-bg',
			'--rf-color-info-border',
			'--rf-radius-md',
			'--rf-spacing-section',         // section.base → no suffix
			'--rf-spacing-section-loose',
			'--rf-inset-loose',
			'--rf-shadow-md',
			'--rf-color-code-bg',
			'--rf-color-code-text',
			'--rf-color-code-inline-bg',    // new canonical name
			'--rf-color-inline-code-bg',    // legacy alias via `extra`
			'--rf-syntax-keyword',          // contract surface
			'--rf-syntax-token-keyword',    // Shiki alias via `extra`
			'--rf-syntax-foreground',       // Shiki bg/fg via `extra`
		];
		for (const name of must) {
			expect(generatedBaseDecls.has(name), `missing ${name} in generated base block`).toBe(true);
		}
	});

	// tint.css re-declares the palette under [data-color-scheme="dark"|"light"]
	// (the scoped scheme override used by preview/tint-mode/sandbox), a hand-kept
	// copy the other coverage above does not reach. Catch value drift on every
	// --rf-* key it shares with the canonical token CSS.
	it('keeps tint.css [data-color-scheme] overrides in sync with the token CSS', () => {
		const tintCss = readFileSync(resolve(here, '..', 'styles', 'runes', 'tint.css'), 'utf-8');
		const baseDecls = extractDeclarations(baseCss);
		const darkThemeDecls = extractDeclarations(extractBlock(darkCss, /\[data-theme="dark"\]\s*\{/));
		const tintDark = extractDeclarations(extractBlock(tintCss, /\[data-color-scheme="dark"\]\s*\{/));
		const tintLight = extractDeclarations(extractBlock(tintCss, /\[data-color-scheme="light"\]\s*\{/));

		// tint routes some tokens through a one-hop alias (--rf-color-surface:
		// var(--cs-surface)); resolve that single indirection from the block's own
		// --cs-* declarations before comparing to the canonical literal.
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
