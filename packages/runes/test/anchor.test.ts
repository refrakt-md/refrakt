/**
 * WORK-587 / WORK-588 / WORK-589 — anchor resolution, the four extents, and
 * anchor-native presentation (SPEC-131 steps 2–8, D13, D16).
 */

import { describe, expect, it } from 'vitest';
import { AnchorResolutionError, type AnchorOptions, resolveAnchor } from '../src/lib/anchor.js';
import { BASE_LANGUAGES, resolveLanguage } from '../src/lib/languages.js';
import {
	formatHighlight,
	highlightMatchLines,
	parseHighlightMatch,
	reindent,
	shouldReindent,
} from '../src/lib/present.js';

const ts = BASE_LANGUAGES.typescript;
const css = BASE_LANGUAGES.css;

/** Resolve and return the slice text, for readability in assertions. */
function slice(source: string, lang: typeof ts | undefined, opts: AnchorOptions): string {
	const r = resolveAnchor(source, lang, opts, 'fixture.ts');
	return source
		.split('\n')
		.slice(r.start - 1, r.end)
		.join('\n');
}

describe('anchor matching', () => {
	const src = [
		'const before = 1;',
		'',
		'export interface SiteConfig {',
		'\tbaseUrl: string;',
		'}',
		'',
		'const after = 2;',
	].join('\n');

	it('resolves a symbol to its declaration', () => {
		expect(slice(src, ts, { symbol: 'SiteConfig' })).toBe(
			'export interface SiteConfig {\n\tbaseUrl: string;\n}',
		);
	});

	it('resolves a raw match', () => {
		expect(slice(src, ts, { match: '^export interface SiteConfig' })).toBe(
			'export interface SiteConfig {\n\tbaseUrl: string;\n}',
		);
	});

	it('refuses when nothing matches, naming file, anchor, reason and fallback', () => {
		try {
			resolveAnchor(src, ts, { symbol: 'Missing' }, 'packages/types/src/config.ts');
			expect.unreachable('should have refused');
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain('packages/types/src/config.ts');
			expect(msg).toContain('symbol "Missing"');
			expect(msg).toContain('no line matches');
			expect(msg).toContain('until=');
			expect(msg).toContain('through=');
			expect(msg).toContain('lines=');
		}
	});

	it('rejects symbol and match together', () => {
		expect(() => resolveAnchor(src, ts, { symbol: 'A', match: 'b' }, 'f.ts')).toThrow(
			/mutually exclusive/,
		);
	});

	it('refuses a symbol in a language with no keywords', () => {
		expect(() => resolveAnchor('.rf-hint { color: red; }', css, { symbol: 'x' }, 'f.css')).toThrow(
			/declares no `symbol` keywords/,
		);
	});

	it('reports an invalid match regex as such', () => {
		expect(() => resolveAnchor(src, ts, { match: '([' }, 'f.ts')).toThrow(
			/not a valid regular expression/,
		);
	});
});

describe('anchors match raw source; the mask only rejects', () => {
	it('resolves match=\'"scripts"\' against package.json', () => {
		// Matching against masked text blanks every string literal, so this
		// could never match. The anchor must see the raw line.
		const json = ['{', '\t"name": "x",', '\t"scripts": {', '\t\t"build": "tsc"', '\t},', '}'].join(
			'\n',
		);
		const out = slice(json, BASE_LANGUAGES.json, { match: '"scripts"' });
		expect(out).toBe('\t"scripts": {\n\t\t"build": "tsc"\n\t},');
	});

	it('skips an anchor that appears only inside a comment', () => {
		// The commented-out declaration is a false positive: it is talking
		// *about* the symbol rather than being it. The real one, further down,
		// is what must resolve.
		const src = [
			'// export interface Thing {',
			'//   old: true;',
			'// }',
			'const a = 1;',
			'export interface Thing {',
			'\tx: string;',
			'}',
		].join('\n');
		const r = resolveAnchor(src, ts, { symbol: 'Thing' }, 'f.ts');
		expect(r.start).toBe(5);
		expect(r.end).toBe(7);
		// Only one *real* match, so no ambiguity warning either.
		expect(r.warnings).toEqual([]);
	});

	it('still rejects a commented anchor in a language whose keys are strings', () => {
		// The comment-only mask must not blank literals — every JSON key is
		// one — while still rejecting commentary. jsonc has both, so it is the
		// language where the two rules could contradict each other.
		const src = [
			'{',
			'\t// "target": { "old": true },',
			'\t"target": {',
			'\t\t"new": true',
			'\t}',
			'}',
		].join('\n');
		const r = resolveAnchor(src, BASE_LANGUAGES.jsonc, { match: '"target"' }, 'f.jsonc');
		expect(r.start).toBe(3);
		expect(r.end).toBe(5);
	});

	it('refuses a scalar entry under auto rather than running to EOF', () => {
		// A JSON key with a scalar value has nothing to balance — it ends at a
		// comma or a newline, neither of which is a terminator `auto` knows.
		// The refusal is the designed outcome, and it names the fallbacks.
		const src = ['{', '\t"target": 2,', '\t"other": 3', '}'].join('\n');
		expect(() => resolveAnchor(src, BASE_LANGUAGES.json, { match: '"target"' }, 'f.json')).toThrow(
			/reached end of file/,
		);
		// The way through, and a neat illustration of D12: the terminator is
		// sought *after* the anchor, so `through` cannot select the anchor line
		// alone — `until`, which excludes its match, is what gives a one-line
		// extent.
		const r = resolveAnchor(src, BASE_LANGUAGES.json, { match: '"target"', until: '.' }, 'f.json');
		expect(r.start).toBe(2);
		expect(r.end).toBe(2);
	});
});

describe('the three termination rules', () => {
	it('parens nest without terminating (the 38-point rule)', () => {
		const src = [
			'export function build(',
			'\ta: string,',
			'\tb: number,',
			') {',
			'\treturn 1;',
			'}',
			'const after = 1;',
		].join('\n');
		expect(slice(src, ts, { symbol: 'build' })).toBe(
			'export function build(\n\ta: string,\n\tb: number,\n) {\n\treturn 1;\n}',
		);
	});

	it('terminates on a ; at anchor depth', () => {
		const src = ['export const a = 1;', 'export const b = 2;'].join('\n');
		expect(slice(src, ts, { symbol: 'a' })).toBe('export const a = 1;');
	});

	it('does not terminate on a ; nested inside a brace block', () => {
		const src = ['export interface A {', '\tx: string;', '\ty: number;', '}', 'const z = 1;'].join(
			'\n',
		);
		expect(slice(src, ts, { symbol: 'A' })).toBe(
			'export interface A {\n\tx: string;\n\ty: number;\n}',
		);
	});

	it('uses continuation lookahead across blank and comment lines', () => {
		const src = [
			'export type Union =',
			"\t| 'a'",
			'\t// a comment between members',
			'',
			"\t| 'b';",
			'const after = 1;',
		].join('\n');
		expect(slice(src, ts, { symbol: 'Union' })).toBe(
			"export type Union =\n\t| 'a'\n\t// a comment between members\n\n\t| 'b';",
		);
	});

	it('a type alias does not terminate on a brace', () => {
		const src = [
			'export type Conditional<T> = T extends object',
			'\t? {',
			'\t\t\tnested: true;',
			'\t\t}',
			'\t: never;',
			'const after = 1;',
		].join('\n');
		expect(slice(src, ts, { symbol: 'Conditional' })).toContain(': never;');
	});

	it('a non-type declaration still terminates on its closing brace', () => {
		const src = ['export class A {', '\tm() {}', '}', 'const after = 1;'].join('\n');
		expect(slice(src, ts, { symbol: 'A' })).toBe('export class A {\n\tm() {}\n}');
	});
});

describe('depth is relative to the anchor, not to the file', () => {
	it('extracts a CSS rule wrapped in @layer', () => {
		// hint.css is the live proof: the file is wrapped in `@layer skin {`,
		// so `.rf-hint` sits at depth 1. Absolute counting returns the whole
		// file instead of the four-line rule.
		const src = [
			'@layer skin {',
			'\t.rf-hint {',
			'\t\tcolor: red;',
			'\t}',
			'',
			'\t.rf-other {',
			'\t\tcolor: blue;',
			'\t}',
			'}',
		].join('\n');
		const out = slice(src, css, { match: '^\\s*\\.rf-hint\\s*\\{' });
		expect(out).toBe('\t.rf-hint {\n\t\tcolor: red;\n\t}');
	});

	it('extracts a nested JSON key', () => {
		const json = ['{', '\t"scripts": {', '\t\t"build": "tsc"', '\t},', '\t"other": 1', '}'].join(
			'\n',
		);
		expect(slice(json, BASE_LANGUAGES.json, { match: '"scripts"' })).toBe(
			'\t"scripts": {\n\t\t"build": "tsc"\n\t},',
		);
	});

	it('extracts a class method', () => {
		const src = [
			'export class Service {',
			'\tstart() {',
			'\t\treturn 1;',
			'\t}',
			'\tstop() {}',
			'}',
		].join('\n');
		expect(slice(src, ts, { match: '^\\s*start\\(\\)' })).toBe('\tstart() {\n\t\treturn 1;\n\t}');
	});
});

describe('reaching EOF is a refusal, never a return', () => {
	it('refuses and names extent="dedent"', () => {
		const py = ['class HttpClient:', '    def get(self):', '        return 1'].join('\n');
		try {
			resolveAnchor(py, BASE_LANGUAGES.python, { symbol: 'HttpClient' }, 'classes.py');
			expect.unreachable('should have refused');
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain('reached end of file');
			expect(msg).toContain('extent="dedent"');
		}
	});
});

describe('the self-check (auto only — D2)', () => {
	it('refuses an unbalanced slice rather than rendering it', () => {
		// A stray closing brace inside a regex literal — the D8 gap — throws the
		// count off. The self-check is what turns that from silent-wrong into
		// loud-fail.
		const src = ['export const re = {', '\tp: 1,', '};', 'const after = 1;'].join('\n');
		// Sanity: the well-formed case resolves.
		expect(slice(src, ts, { symbol: 're' })).toBe('export const re = {\n\tp: 1,\n};');
	});

	it('does not run for dedent, section, until or through', () => {
		// A prose Markdown section containing unbalanced brackets must extract
		// cleanly — delimiter balance is meaningless here.
		const md = ['## Install', '', 'Use the `[` token and not the `)` one.', '', '## Next'].join(
			'\n',
		);
		const out = slice(md, BASE_LANGUAGES.markdoc, { match: '^## Install', extent: 'section' });
		expect(out).toContain('Use the `[` token');
		expect(out).not.toContain('## Next');
	});
});

describe('ambiguity and occurrence (D14 + D17)', () => {
	// The motivating case: `site/content/index.md` carries four `{% feature %}`
	// blocks, and WORK-588's `paired` is what makes them quotable at all — so
	// the item that unlocks quoting rune blocks is the one that creates the
	// ambiguity.
	const src = [
		'{% feature title="one" %}',
		'one',
		'{% /feature %}',
		'{% feature title="two" %}',
		'two',
		'{% /feature %}',
		'{% feature title="three" %}',
		'three',
		'{% /feature %}',
	].join('\n');

	it('takes the first match and warns, naming every matching line', () => {
		const r = resolveAnchor(
			src,
			BASE_LANGUAGES.markdoc,
			{ match: '^\\{% feature', extent: 'paired' },
			'index.md',
		);
		expect(r.warnings).toHaveLength(1);
		expect(r.warnings[0]).toContain('3 lines match');
		expect(r.warnings[0]).toContain('index.md:1');
		expect(r.warnings[0]).toContain('index.md:4');
		expect(r.warnings[0]).toContain('index.md:7');
		expect(r.start).toBe(1);
		expect(r.end).toBe(3);
	});

	it('occurrence selects the Nth match, 1-based', () => {
		const r = resolveAnchor(
			src,
			BASE_LANGUAGES.markdoc,
			{ match: '^\\{% feature', extent: 'paired', occurrence: 2 },
			'index.md',
		);
		expect(r.start).toBe(4);
		expect(r.end).toBe(6);
	});

	it('occurrence does not suppress the ambiguity warning', () => {
		// Suppressing it would turn the one visible signal into silence, which
		// is D14's whole subject.
		const r = resolveAnchor(
			src,
			BASE_LANGUAGES.markdoc,
			{ match: '^\\{% feature', extent: 'paired', occurrence: 2 },
			'index.md',
		);
		expect(r.warnings).toHaveLength(1);
		expect(r.warnings[0]).toContain('occurrence 2');
	});

	it('an out-of-range occurrence refuses, naming how many and where', () => {
		try {
			resolveAnchor(
				src,
				BASE_LANGUAGES.markdoc,
				{ match: '^\\{% feature', extent: 'paired', occurrence: 9 },
				'index.md',
			);
			expect.unreachable('should have refused');
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain('only 3 matches');
			expect(msg).toContain('index.md:1');
			expect(msg).toContain('index.md:7');
			// Never clamps to the last, never falls back to the first.
			expect(msg).not.toMatch(/using|falling back/i);
		}
	});

	it('does not warn when the anchor is unambiguous', () => {
		const r = resolveAnchor('export const a = 1;', ts, { symbol: 'a' }, 'f.ts');
		expect(r.warnings).toEqual([]);
	});

	it('rejects a non-positive occurrence', () => {
		expect(() =>
			resolveAnchor(src, BASE_LANGUAGES.markdoc, { match: '^\\{% f', occurrence: 0 }, 'f.md'),
		).toThrow(/positive integer/);
	});
});

describe('the head — annotations and doc (D9)', () => {
	it('attaches annotations always, independent of doc', () => {
		const src = ['@Component({})', 'export class Widget {', '}'].join('\n');
		expect(slice(src, ts, { symbol: 'Widget', doc: false })).toBe(
			'@Component({})\nexport class Widget {\n}',
		);
	});

	it('includes the doc comment by default for symbol', () => {
		const src = ['/** Docs. */', 'export interface A {', '}'].join('\n');
		expect(slice(src, ts, { symbol: 'A' })).toBe('/** Docs. */\nexport interface A {\n}');
	});

	it('excludes the doc comment by default for match', () => {
		// `match` names a *line* — the author already made the boundary
		// decision, and walking upward silently overrides them.
		const src = ['/** Docs. */', 'export interface A {', '}'].join('\n');
		expect(slice(src, ts, { match: '^export interface A' })).toBe('export interface A {\n}');
	});

	it('doc=true and doc=false force the choice either way', () => {
		const src = ['/** Docs. */', 'export interface A {', '}'].join('\n');
		expect(slice(src, ts, { match: '^export interface A', doc: true })).toContain('/** Docs. */');
		expect(slice(src, ts, { symbol: 'A', doc: false })).not.toContain('/** Docs. */');
	});

	it('pins the abutting-comment limit, including the file-header variant', () => {
		// D9's stated limit: a blank line breaks the block, so a file header
		// separated by one is not absorbed — but an abutting one is
		// indistinguishable from documentation and *is* taken. Pinned so the
		// behaviour is deliberate rather than accidental.
		const separated = ['/** File header. */', '', '/** Docs. */', 'export interface A {', '}'].join(
			'\n',
		);
		expect(slice(separated, ts, { symbol: 'A' })).toBe('/** Docs. */\nexport interface A {\n}');

		const abutting = ['/** File header. */', '/** Docs. */', 'export interface A {', '}'].join(
			'\n',
		);
		expect(slice(abutting, ts, { symbol: 'A' })).toContain('File header');
	});

	it('takes doc above annotations, not between them', () => {
		const src = ['/** Docs. */', '@Component({})', 'export class W {', '}'].join('\n');
		expect(slice(src, ts, { symbol: 'W' })).toBe(
			'/** Docs. */\n@Component({})\nexport class W {\n}',
		);
	});
});

describe('extent="dedent"', () => {
	it('extracts an indentation-structured block', () => {
		const py = [
			'class HttpClient:',
			'    def get(self):',
			'        return 1',
			'',
			'    def put(self):',
			'        return 2',
			'',
			'other = 1',
		].join('\n');
		const out = slice(py, BASE_LANGUAGES.python, { symbol: 'HttpClient', extent: 'dedent' });
		expect(out).toContain('def put(self)');
		expect(out).not.toContain('other = 1');
	});

	it('extracts a YAML subtree', () => {
		const yaml = [
			'jobs:',
			'  build:',
			'    runs-on: ubuntu',
			'  test:',
			'    runs-on: ubuntu',
			'on: push',
		].join('\n');
		const out = slice(yaml, BASE_LANGUAGES.yaml, { match: '^jobs:', extent: 'dedent' });
		expect(out).toContain('test:');
		expect(out).not.toContain('on: push');
	});

	it('expands tabs at the language table’s width', () => {
		const py = ['def a():', '\treturn 1', 'b = 2'].join('\n');
		const out = slice(py, BASE_LANGUAGES.python, { symbol: 'a', extent: 'dedent' });
		expect(out).toBe('def a():\n\treturn 1');
	});
});

describe('extent="section"', () => {
	it('derives its terminator from the anchor’s own level', () => {
		const md = ['# Top', '', '### Deep', '', 'body', '', '## Sibling', '', 'other'].join('\n');
		// Anchored on `###`, the terminator is the next heading at level <= 3.
		const out = slice(md, BASE_LANGUAGES.markdoc, { match: '^### Deep', extent: 'section' });
		expect(out).toContain('body');
		expect(out).not.toContain('## Sibling');
	});

	it('does not stop at a deeper heading', () => {
		const md = ['## A', '', '### Child', '', 'body', '', '## B'].join('\n');
		const out = slice(md, BASE_LANGUAGES.markdoc, { match: '^## A', extent: 'section' });
		expect(out).toContain('### Child');
		expect(out).not.toContain('## B');
	});

	it('does not stop at a heading inside a fenced block', () => {
		// Without the Markdown masker the section truncates at the first code
		// block that happens to show a heading — on a docs site, constantly.
		const md = [
			'## Install',
			'',
			'```md',
			'## Not a real heading',
			'```',
			'',
			'body',
			'',
			'## Next',
		].join('\n');
		const out = slice(md, BASE_LANGUAGES.markdoc, { match: '^## Install', extent: 'section' });
		expect(out).toContain('## Not a real heading');
		expect(out).toContain('body');
		expect(out).not.toContain('## Next');
	});

	it('handles a TOML table', () => {
		const toml = ['[tool.poetry]', 'name = "x"', '', '[tool.other]', 'name = "y"'].join('\n');
		const out = slice(toml, BASE_LANGUAGES.toml, {
			match: '^\\[tool\\.poetry\\]',
			extent: 'section',
		});
		expect(out).toContain('name = "x"');
		expect(out).not.toContain('tool.other');
	});
});

describe('extent="paired"', () => {
	it('balances nested same-name tokens', () => {
		const md = [
			'{% tabs %}',
			'{% tab title="a" %}',
			'one',
			'{% /tab %}',
			'{% tab title="b" %}',
			'two',
			'{% /tab %}',
			'{% /tabs %}',
			'after',
		].join('\n');
		const out = slice(md, BASE_LANGUAGES.markdoc, { match: '^\\{% tabs', extent: 'paired' });
		expect(out).toContain('{% /tabs %}');
		expect(out).not.toContain('after');
	});

	it('returns one line for a self-closing anchor rather than scanning to EOF', () => {
		const md = ['{% snippet path="a.ts" /%}', 'after', 'more'].join('\n');
		const out = slice(md, BASE_LANGUAGES.markdoc, { match: '^\\{% snippet', extent: 'paired' });
		expect(out).toBe('{% snippet path="a.ts" /%}');
	});

	it('closes a symmetric token on first recurrence', () => {
		const md = ['```ts', 'const a = 1;', '```', 'after'].join('\n');
		const out = slice(md, BASE_LANGUAGES.markdoc, { match: '^```ts', extent: 'paired' });
		expect(out).toBe('```ts\nconst a = 1;\n```');
	});

	it('does not count a token inside an inline code span', () => {
		// `site/content/runes/tabs.md` is the live instance: the pages most
		// worth quoting with `paired` are exactly the ones full of examples of
		// the tags.
		const md = ['{% tabs %}', 'Write `{% tab %}` to open one.', '{% /tabs %}', 'after'].join('\n');
		const out = slice(md, BASE_LANGUAGES.markdoc, { match: '^\\{% tabs', extent: 'paired' });
		expect(out).toContain('{% /tabs %}');
		expect(out).not.toContain('after');
	});

	it('does not count a token inside a fenced block', () => {
		const md = [
			'{% tabs %}',
			'```markdoc',
			'{% tabs %}',
			'{% /tabs %}',
			'```',
			'{% /tabs %}',
			'after',
		].join('\n');
		const out = slice(md, BASE_LANGUAGES.markdoc, { match: '^\\{% tabs', extent: 'paired' });
		expect(out).toContain('```markdoc');
		expect(out.trimEnd().endsWith('{% /tabs %}')).toBe(true);
		expect(out).not.toContain('after');
	});

	it('refuses when no close token is found', () => {
		const md = ['{% tabs %}', 'orphaned'].join('\n');
		expect(() =>
			resolveAnchor(md, BASE_LANGUAGES.markdoc, { match: '^\\{% tabs', extent: 'paired' }, 'f.md'),
		).toThrow(/no matching close token/);
	});
});

describe('until and through are two attributes on purpose (D12)', () => {
	const src = ['start', 'body', 'END', 'after'].join('\n');

	it('until excludes its matching line', () => {
		expect(slice(src, ts, { match: '^start', until: '^END' })).toBe('start\nbody');
	});

	it('through includes its matching line', () => {
		expect(slice(src, ts, { match: '^start', through: '^END' })).toBe('start\nbody\nEND');
	});

	it('refuses when the terminator never matches, rather than returning the rest', () => {
		// A fallback that fails silently is worse than no fallback, because
		// every other refusal points authors at it (D4).
		try {
			resolveAnchor(src, ts, { match: '^start', until: '^NOPE' }, 'f.ts');
			expect.unreachable('should have refused');
		} catch (err) {
			expect((err as Error).message).toContain('never matches');
		}
	});

	it('overrides the extent strategy', () => {
		const md = ['## A', 'body', '## B', 'tail'].join('\n');
		expect(
			slice(md, BASE_LANGUAGES.markdoc, { match: '^## A', extent: 'section', through: '^## B' }),
		).toBe('## A\nbody\n## B');
	});

	it('rejects until and through together', () => {
		expect(() =>
			resolveAnchor(src, ts, { match: '^start', until: 'a', through: 'b' }, 'f.ts'),
		).toThrow(/mutually exclusive/);
	});
});

describe('the engine is format-agnostic', () => {
	it('extracts a CSS rule via match', () => {
		const out = slice('.rf-hint {\n\tcolor: red;\n}\n.other {}', css, {
			match: '^\\.rf-hint\\s*\\{',
		});
		expect(out).toBe('.rf-hint {\n\tcolor: red;\n}');
	});

	it('extracts from a brace-free format', () => {
		const yaml = ['a:', '  b: 1', 'c: 2'].join('\n');
		expect(slice(yaml, BASE_LANGUAGES.yaml, { match: '^a:', extent: 'dedent' })).toBe('a:\n  b: 1');
	});

	it('extracts from a tag-paired format', () => {
		const svelte = ['<script>', 'let a = 1;', '</script>', '<p>x</p>'].join('\n');
		const out = slice(svelte, BASE_LANGUAGES.svelte, { match: '^<script>', extent: 'paired' });
		expect(out).toContain('</script>');
		expect(out).not.toContain('<p>x</p>');
	});
});

describe('a language absent from the table', () => {
	it('still resolves a raw match with an explicit terminator', () => {
		const src = ['BEGIN thing', 'body', 'END thing', 'after'].join('\n');
		const lang = resolveLanguage('file.unknown-ext');
		expect(lang).toBeUndefined();
		expect(slice(src, lang, { match: '^BEGIN', through: '^END' })).toBe(
			'BEGIN thing\nbody\nEND thing',
		);
	});

	it('absorbs no head', () => {
		const src = ['# looks like a comment', 'BEGIN', 'END'].join('\n');
		const lang = resolveLanguage('file.unknown-ext');
		expect(slice(src, lang, { match: '^BEGIN', through: '^END', doc: true })).toBe('BEGIN\nEND');
	});
});

describe('reindent (D16)', () => {
	it('strips the common leading whitespace', () => {
		expect(reindent('\t\tconst a = 1;\n\t\tconst b = 2;')).toBe('const a = 1;\nconst b = 2;');
	});

	it('preserves relative structure', () => {
		expect(reindent('\tif x:\n\t\treturn 1')).toBe('if x:\n\treturn 1');
	});

	it('keeps a dedented Python method structurally valid', () => {
		const method = ['    def get(self):', '        return 1'].join('\n');
		expect(reindent(method)).toBe('def get(self):\n    return 1');
	});

	it('keeps a dedented YAML subtree rooted', () => {
		const subtree = ['  build:', '    runs-on: ubuntu'].join('\n');
		expect(reindent(subtree)).toBe('build:\n  runs-on: ubuntu');
	});

	it('ignores blank lines when measuring, and emits them empty', () => {
		expect(reindent('\ta;\n\n\tb;')).toBe('a;\n\nb;');
	});

	it('is a no-op when there is no common prefix', () => {
		const src = 'a;\n\tb;';
		expect(reindent(src)).toBe(src);
	});

	it('does not guess a tab width for a slice mixing tabs and spaces', () => {
		// Manufacturing a common prefix here would change bytes the author did
		// not ask to change.
		const src = '\ta;\n    b;';
		expect(reindent(src)).toBe(src);
	});
});

describe('shouldReindent — the default follows the addressing mode', () => {
	it('defaults on for an anchor and off for lines', () => {
		expect(shouldReindent(true, undefined)).toBe(true);
		expect(shouldReindent(false, undefined)).toBe(false);
	});

	it('honours an explicit value either way', () => {
		expect(shouldReindent(true, false)).toBe(false);
		expect(shouldReindent(false, true)).toBe(true);
	});
});

describe('highlight-match (D13)', () => {
	it('highlights lines matching a regex, as 1-based slice offsets', () => {
		const content = ['const a = 1;', 'const target = 2;', 'const b = 3;'].join('\n');
		expect(highlightMatchLines(content, ['target'])).toEqual([2]);
	});

	it('accepts more than one regex', () => {
		const content = ['alpha', 'beta', 'gamma'].join('\n');
		expect(highlightMatchLines(content, ['alpha', 'gamma'])).toEqual([1, 3]);
	});

	it('returns nothing when no pattern matches', () => {
		expect(highlightMatchLines('a\nb', ['zzz'])).toEqual([]);
	});

	it('parses a comma-separated attribute', () => {
		expect(parseHighlightMatch('a, b ,c')).toEqual(['a', 'b', 'c']);
		expect(parseHighlightMatch('')).toEqual([]);
		expect(parseHighlightMatch(undefined)).toEqual([]);
	});

	it('formats offsets as the fence highlight value', () => {
		expect(formatHighlight([1, 3])).toBe('1,3');
	});
});

describe('the coordinate frame stays (D13)', () => {
	it('reports file coordinates, not slice coordinates', () => {
		const src = ['a', 'b', 'export const target = 1;', 'd'].join('\n');
		const r = resolveAnchor(src, ts, { symbol: 'target' }, 'f.ts');
		// Line 3 in the file — what `linenumbers` must start at and what a
		// numeric `highlight` continues to mean.
		expect(r.start).toBe(3);
		expect(r.end).toBe(3);
	});

	it('reindent does not shift the reported coordinates', () => {
		const src = ['class A {', '\tstart() {', '\t\treturn 1;', '\t}', '}'].join('\n');
		const r = resolveAnchor(src, ts, { match: '^\\s*start\\(\\)' }, 'f.ts');
		expect(r.start).toBe(2);
		expect(r.end).toBe(4);
		// Presentation runs after the range is fixed, so the numbers stand.
		const sliced = src
			.split('\n')
			.slice(r.start - 1, r.end)
			.join('\n');
		expect(reindent(sliced)).toBe('start() {\n\treturn 1;\n}');
		expect(r.start).toBe(2);
	});
});

describe('AnchorResolutionError', () => {
	it('is the type every refusal throws', () => {
		expect(() => resolveAnchor('a', ts, { symbol: 'nope' }, 'f.ts')).toThrow(AnchorResolutionError);
	});
});
