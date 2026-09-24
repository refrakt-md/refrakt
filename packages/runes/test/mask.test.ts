/**
 * WORK-597 — the masker and the language table (SPEC-131 step 1).
 *
 * Two of these tests pin hazards rather than assert correctness, and are
 * labelled as such: the regex-literal gap (D8) and the CSS `#` selector (D10).
 */

import { describe, expect, it } from 'vitest';
import {
	BASE_LANGUAGES,
	type LanguageDefinition,
	mergeLanguages,
	resolveLanguage,
} from '../src/lib/languages.js';
import {
	docHeadStart,
	escapeRegExp,
	isMasked,
	isRangeMasked,
	maskSource,
	symbolAnchorPattern,
} from '../src/lib/mask.js';

const ts = BASE_LANGUAGES.typescript;
const css = BASE_LANGUAGES.css;

/** Positions the masker blanked, as a set of indices. */
function maskedIndices(source: string, lang: LanguageDefinition | undefined): Set<number> {
	const masked = maskSource(source, lang);
	const out = new Set<number>();
	for (let i = 0; i < source.length; i++) {
		if (isMasked(source, masked, i)) out.add(i);
	}
	return out;
}

describe('maskSource — comment and literal forms', () => {
	it('blanks line comments to end of line, leaving the next line intact', () => {
		const src = 'const a = 1; // a { brace\nconst b = 2;';
		const masked = maskSource(src, ts);
		expect(masked).toContain('const a = 1;');
		expect(masked).not.toContain('brace');
		expect(masked).toContain('const b = 2;');
	});

	it('blanks block comments including across lines', () => {
		const src = 'a;\n/* hidden {\n   still hidden } */\nb;';
		const masked = maskSource(src, ts);
		expect(masked).not.toContain('hidden');
		expect(masked).toContain('a;');
		expect(masked).toContain('b;');
	});

	it('blanks single- and double-quoted strings', () => {
		const src = `const a = "{"; const b = '}';`;
		const masked = maskSource(src, ts);
		expect(masked).not.toContain('{');
		expect(masked).not.toContain('}');
		expect(masked).toContain('const a =');
	});

	it('respects escapes inside strings', () => {
		const src = 'const a = "he said \\" then { "; const after = 1;';
		const masked = maskSource(src, ts);
		// The escaped quote must not close the string early, so the `{` inside
		// it stays masked and `after` stays visible.
		expect(masked).not.toContain('{');
		expect(masked).toContain('const after = 1;');
	});

	it('does not let an unterminated single-line string swallow the file', () => {
		const src = 'const a = "oops\nconst b = 2;';
		const masked = maskSource(src, ts);
		expect(masked).toContain('const b = 2;');
	});

	it('blanks template literals', () => {
		const src = 'const a = `plain { text`;';
		const masked = maskSource(src, ts);
		expect(masked).not.toContain('{');
		expect(masked).toContain('const a =');
	});

	it('returns to code state inside ${} and back to template at the match', () => {
		const src = 'const a = `x ${ y } z { masked`; const after = 1;';
		const masked = maskSource(src, ts);
		// `y` is interpolated code and survives; `z { masked` is template text.
		expect(masked).toContain('y');
		expect(masked).not.toContain('masked');
		expect(masked).toContain('const after = 1;');
	});

	it('tracks nested braces inside an interpolation', () => {
		const src = 'const a = `${ fn({ k: 1 }) } tail`; const after = 2;';
		const masked = maskSource(src, ts);
		// The inner `}` of the object literal must not be mistaken for the end
		// of the interpolation, or `tail` would be treated as code.
		expect(masked).toContain('fn(');
		expect(masked).not.toContain('tail');
		expect(masked).toContain('const after = 2;');
	});

	it('handles a template nested inside an interpolation', () => {
		const src = 'const a = `${ `inner { x` } outer`; const after = 3;';
		const masked = maskSource(src, ts);
		expect(masked).not.toContain('inner');
		expect(masked).not.toContain('outer');
		expect(masked).toContain('const after = 3;');
	});
});

describe('maskSource — the newline invariant', () => {
	it('preserves length, line count and line offsets', () => {
		const src = [
			'const a = 1; // trailing',
			'/* block',
			'   spanning',
			'   lines */',
			'const b = `tpl',
			'multi ${ x } line`;',
			'const c = "str";',
		].join('\n');

		const masked = maskSource(src, ts);

		expect(masked.length).toBe(src.length);
		expect(masked.split('\n').length).toBe(src.split('\n').length);

		// Every newline sits at exactly the same index.
		for (let i = 0; i < src.length; i++) {
			if (src[i] === '\n') expect(masked[i]).toBe('\n');
		}
	});

	it('keeps per-line lengths identical', () => {
		const src = 'a; /* x */\nbb; // yy\nccc;';
		const maskedLines = maskSource(src, ts).split('\n');
		const srcLines = src.split('\n');
		expect(maskedLines.map((line) => line.length)).toEqual(srcLines.map((line) => line.length));
	});
});

describe('maskSource — table-driven, with no per-language branching', () => {
	it('D10: a CSS id selector is not a comment', () => {
		// The hazard D10 names. A union `^\s*(//|#|\*|/\*)` prefix walk eats
		// this rule, and a head absorbing it would silently swallow real CSS.
		const src = '#header { color: red; }\n.rf-hint { color: blue; }';
		const masked = maskSource(src, css);

		expect(masked).toBe(src);
		expect(maskedIndices(src, css).size).toBe(0);
	});

	it('still blanks a real CSS block comment', () => {
		const src = '/* note { */\n.rf-hint { color: blue; }';
		const masked = maskSource(src, css);
		expect(masked).not.toContain('note');
		expect(masked).toContain('.rf-hint { color: blue; }');
	});

	it('does not treat // as a comment in JSON', () => {
		const src = '{ "url": "https://example.com/x" }\n{ "next": 1 }';
		const masked = maskSource(src, BASE_LANGUAGES.json);

		// The `//` inside the URL is string content. JSON declares no line
		// comment, so it must not blank the rest of the line — the structural
		// punctuation after the string survives on both lines.
		//
		// Written as "every quoted run blanked, everything else kept" rather
		// than as a literal space-counted string, which is unreadable and easy
		// to get wrong by hand.
		const expected = src.replace(/"[^"]*"/g, (m) => ' '.repeat(m.length));

		expect(masked).toBe(expected);
		expect(masked).toContain('}');
		expect(masked).toContain(': 1 }');
	});

	it('treats # as a line comment in YAML but not in CSS', () => {
		const src = '# comment\nkey: value';
		expect(maskSource(src, BASE_LANGUAGES.yaml)).not.toContain('comment');
		expect(maskSource(src, css)).toContain('comment');
	});
});

describe('maskSource — a language absent from the table', () => {
	it('returns the source unchanged rather than guessing', () => {
		const src = '# not necessarily a comment\nSOMETHING { }';
		expect(maskSource(src, resolveLanguage('file.unknown-ext'))).toBe(src);
	});

	it('gets no head absorption', () => {
		const lines = ['# looks like a comment', '# so does this', 'TARGET'];
		const lang = resolveLanguage('file.unknown-ext');

		expect(lang).toBeUndefined();
		// The declaration line itself — nothing above it is absorbed, because
		// the table says nothing about what a comment looks like here.
		expect(docHeadStart(lines, 2, lang)).toBe(2);
	});

	it('offers no symbol anchor', () => {
		expect(symbolAnchorPattern('Thing', resolveLanguage('file.unknown-ext'))).toBeUndefined();
	});
});

describe('D8 — regex literals are not lexed (pinned, not endorsed)', () => {
	it('counts braces inside a regex literal as code', () => {
		// This is the known gap. A `/…/` containing an unbalanced brace throws
		// the depth count off, and it is the cause of the single silent-wrong
		// case in SPEC-131's measurement. WORK-590 picks it up only if the
		// migration surfaces refusals that need it.
		//
		// The assertion records what the masker does today. It is NOT a claim
		// that this is correct — when regex lexing lands, this test should flip
		// to expecting the brace masked.
		const src = 'const re = /[{]/; const after = 1;';
		const masked = maskSource(src, ts);

		expect(masked).toContain('/[{]/');
		expect(maskedIndices(src, ts).size).toBe(0);
	});

	it('leaves a quote inside a regex able to open a string', () => {
		// The same gap seen from its other side, and the reason the error it
		// produces is usually the *safe* kind: a stray quote opens a string
		// that terminates at the newline, so the damage is contained to the
		// line that carries the regex.
		const src = `const re = /it's/;\nconst after = 1;`;
		const masked = maskSource(src, ts);
		const [first, second] = masked.split('\n');

		// Line 1 is corrupted from the apostrophe onward — pinned, not endorsed.
		expect(first).not.toBe(`const re = /it's/;`);
		// Line 2 is untouched, which is why this failure mode is survivable.
		expect(second).toBe('const after = 1;');
	});
});

describe('isMasked / isRangeMasked', () => {
	it('distinguishes a real space from a masked one', () => {
		const src = 'a = 1; // x';
		const masked = maskSource(src, ts);
		// Index 1 is a genuine space in the source, not something blanked.
		expect(src[1]).toBe(' ');
		expect(isMasked(src, masked, 1)).toBe(false);
		expect(isMasked(src, masked, src.indexOf('x'))).toBe(true);
	});

	it('rejects a match that runs from code into a comment', () => {
		const src = 'const a = 1; /* .rf-hint { */';
		const masked = maskSource(src, ts);
		const start = src.indexOf('.rf-hint');
		expect(isRangeMasked(src, masked, start, start + '.rf-hint {'.length)).toBe(true);
	});

	it('accepts a match entirely in code', () => {
		const src = '.rf-hint { color: red; }';
		const masked = maskSource(src, css);
		expect(isRangeMasked(src, masked, 0, '.rf-hint {'.length)).toBe(false);
	});
});

describe('docHeadStart', () => {
	it('absorbs a contiguous block comment above the declaration', () => {
		const lines = ['/** Doc. */', 'export interface A {', '}'];
		expect(docHeadStart(lines, 1, ts)).toBe(0);
	});

	it('absorbs a multi-line block with * continuations', () => {
		const lines = ['/**', ' * Doc.', ' */', 'export interface A {'];
		expect(docHeadStart(lines, 3, ts)).toBe(0);
	});

	it('stops at a blank line', () => {
		const lines = ['/** File header. */', '', '/** Doc. */', 'export interface A {'];
		expect(docHeadStart(lines, 3, ts)).toBe(2);
	});

	it('returns the line itself when nothing precedes it', () => {
		expect(docHeadStart(['export interface A {'], 0, ts)).toBe(0);
	});

	it('does not treat a * continuation as a comment in a language with no block comment', () => {
		const lines = ['* not a comment here', 'key: value'];
		expect(docHeadStart(lines, 1, BASE_LANGUAGES.yaml)).toBe(1);
	});
});

describe('symbolAnchorPattern', () => {
	it('matches a declaration with modifiers', () => {
		const pattern = symbolAnchorPattern('SiteConfig', ts);
		expect(pattern).toBeDefined();
		const re = new RegExp(pattern as string, 'm');
		expect(re.test('export interface SiteConfig {')).toBe(true);
		expect(re.test('interface SiteConfig {')).toBe(true);
		expect(re.test('export default abstract class SiteConfig {')).toBe(true);
	});

	it('does not match a different symbol with a shared prefix', () => {
		const re = new RegExp(symbolAnchorPattern('SiteConfig', ts) as string, 'm');
		expect(re.test('export interface SiteConfigExtra {')).toBe(false);
	});

	it('escapes the interpolated name', () => {
		// A name carrying regex metacharacters is content, not a pattern.
		const re = new RegExp(symbolAnchorPattern('a.b(c', ts) as string, 'm');
		expect(re.test('const a.b(c ')).toBe(true);
		expect(re.test('const axbxc ')).toBe(false);
	});

	it('uses each language’s own keywords', () => {
		const re = new RegExp(symbolAnchorPattern('build', BASE_LANGUAGES.python) as string, 'm');
		expect(re.test('def build(self):')).toBe(true);
		expect(re.test('async def build(self):')).toBe(true);
		expect(re.test('function build() {')).toBe(false);
	});
});

describe('escapeRegExp', () => {
	it('escapes every metacharacter it claims to', () => {
		const escaped = escapeRegExp('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o');
		expect(new RegExp(`^${escaped}$`).test('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o')).toBe(true);
	});
});

describe('the table carries WORK-588’s data', () => {
	it('declares heading shapes whose capture gives the level', () => {
		const [heading] = BASE_LANGUAGES.markdoc.headings;
		expect(heading).toBeDefined();
		const m = new RegExp(heading.pattern).exec('### Install');
		expect(m?.[1].length).toBe(3);
	});

	it('declares token pairs in all three shapes', () => {
		const shapes = new Set(BASE_LANGUAGES.markdoc.tokenPairs.map((p) => p.shape));
		expect(shapes).toEqual(new Set(['asymmetric', 'symmetric', 'selfClosing']));
	});

	it('declares a tab width per language', () => {
		expect(BASE_LANGUAGES.python.tabWidth).toBe(4);
		expect(BASE_LANGUAGES.go.tabWidth).toBe(8);
		expect(BASE_LANGUAGES.css.tabWidth).toBe(2);
	});

	it('leaves Markdown masking to WORK-588', () => {
		// `markdoc` declares the shapes `section` and `paired` need, but the
		// recursive fence / inline-code masking is not this item's.
		const src = '```\n{% tabs %}\n```\n{% tabs %}';
		expect(maskSource(src, BASE_LANGUAGES.markdoc)).toBe(src);
	});
});

describe('mergeLanguages', () => {
	it('returns the base table untouched when there are no overrides', () => {
		expect(mergeLanguages(BASE_LANGUAGES, {})).toEqual(BASE_LANGUAGES);
	});

	it('does not mutate the base table', () => {
		const before = BASE_LANGUAGES.css.lineComments.length;
		mergeLanguages(BASE_LANGUAGES, { css: { lineComments: ['//'] } });
		expect(BASE_LANGUAGES.css.lineComments.length).toBe(before);
	});

	it('merges field by field over an existing language', () => {
		const merged = mergeLanguages(BASE_LANGUAGES, { css: { lineComments: ['//'] } });
		expect(merged.css.lineComments).toEqual(['//']);
		// Untouched fields survive.
		expect(merged.css.blockComments).toEqual(BASE_LANGUAGES.css.blockComments);
	});

	it('replaces arrays rather than concatenating, so a prefix can be removed', () => {
		const merged = mergeLanguages(BASE_LANGUAGES, { yaml: { lineComments: [] } });
		expect(merged.yaml.lineComments).toEqual([]);
		expect(maskSource('# x\nk: v', merged.yaml)).toContain('# x');
	});

	it('takes a newly declared language whole, filling absent fields as empty', () => {
		const merged = mergeLanguages(BASE_LANGUAGES, {
			terraform: { lineComments: ['#'], keywords: ['resource'] },
		});
		expect(merged.terraform.lineComments).toEqual(['#']);
		expect(merged.terraform.keywords).toEqual(['resource']);
		// Not inherited from some unrelated language.
		expect(merged.terraform.blockComments).toEqual([]);
		expect(merged.terraform.templates).toEqual([]);
		expect(merged.terraform.tabWidth).toBe(4);
	});

	it('drives the masker through the seam', () => {
		const merged = mergeLanguages(BASE_LANGUAGES, {
			terraform: { lineComments: ['#'], escape: '\\', strings: [{ delim: '"' }] },
		});
		const masked = maskSource('# note {\nresource "aws" {', merged.terraform);
		expect(masked).not.toContain('note');
		expect(masked).toContain('resource');
	});
});

describe('resolveLanguage', () => {
	it('resolves by path, by extension and by language id', () => {
		expect(resolveLanguage('packages/types/src/config.ts')).toBe(BASE_LANGUAGES.typescript);
		expect(resolveLanguage('.css')).toBe(BASE_LANGUAGES.css);
		expect(resolveLanguage('python')).toBe(BASE_LANGUAGES.python);
	});

	it('returns undefined for a language with no table entry', () => {
		expect(resolveLanguage('archive.tar')).toBeUndefined();
		expect(resolveLanguage('')).toBeUndefined();
	});

	it('reads through a merged table when given one', () => {
		const merged = mergeLanguages(BASE_LANGUAGES, { terraform: { lineComments: ['#'] } });
		expect(resolveLanguage('terraform', merged)?.lineComments).toEqual(['#']);
	});
});
