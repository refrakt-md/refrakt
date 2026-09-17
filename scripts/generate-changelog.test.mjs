import { describe, it, expect } from 'vitest';
import { stripCodeFences, stripTables, parseChangelog } from './generate-changelog.mjs';

describe('stripCodeFences', () => {
	it('removes a fenced block and its markers', () => {
		const lines = ['before', '```markdoc', '{% snippet path="a.ts" /%}', '```', 'after'];
		expect(stripCodeFences(lines)).toEqual(['before', 'after']);
	});

	it('handles indented fences (changeset bodies nest under a bullet)', () => {
		const lines = ['  prose', '  ```ts', '  type X = 1;', '  ```', '  more prose'];
		expect(stripCodeFences(lines)).toEqual(['  prose', '  more prose']);
	});

	it('keeps blank lines that fall inside a fence out of the output', () => {
		const lines = ['```', 'a', '', 'b', '```'];
		expect(stripCodeFences(lines)).toEqual([]);
	});

	it('leaves inline code spans untouched', () => {
		const lines = ['use `{% snippet %}` like this'];
		expect(stripCodeFences(lines)).toEqual(['use `{% snippet %}` like this']);
	});
});

describe('parseChangelog — rune examples never leak as live tags', () => {
	// The changelog is rendered through Markdoc (`{% changelog %}` in
	// releases.md), so any bare `{% ... %}` in an entry parses as a LIVE rune.
	// A `{% snippet %}` example in a changeset's fenced code block must not
	// survive into the flattened changelog — snippet throws at transform time
	// by design, which previously broke the site build (see the SPEC-062 fix).
	it('drops a fenced snippet example, keeping the surrounding prose', () => {
		const changelog = [
			'# @refrakt-md/runes',
			'',
			'## 0.15.0',
			'',
			'### Minor Changes',
			'',
			'- Snippet rune: embed a project file as a code block.',
			'',
			'  ```markdoc',
			'  {% snippet path="src/lib/foo.ts" /%}',
			'',
			'  {% codegroup %}',
			'  {% snippet path="examples/button.svelte" /%}',
			'  {% /codegroup %}',
			'  ```',
			'',
			'  Inline mentions like `{% snippet %}` stay readable.',
			'',
		].join('\n');

		const versions = new Map();
		parseChangelog(changelog, versions);
		const entries = [...(versions.get('0.15.0') ?? [])];
		const joined = entries.join('\n');

		// No bare (un-backticked) Markdoc tag should appear.
		expect(joined).not.toMatch(/(^|[^`]){%\s*snippet/);
		expect(joined).not.toMatch(/(^|[^`]){%\s*codegroup/);

		// Prose either side of the fence survives.
		expect(joined).toContain('Snippet rune: embed a project file');
		expect(joined).toContain('Inline mentions like `{% snippet %}` stay readable.');
	});
});

/** A package CHANGELOG as `changeset version` writes one, from a changeset body. */
function changelogFor(body) {
	const [first, ...rest] = body.trim().split('\n');
	return [
		'# @refrakt-md/probe',
		'',
		'## 0.35.0',
		'',
		'### Minor Changes',
		'',
		`- abc1234: ${first}`,
		...rest.map((l) => (l.trim() === '' ? '' : `  ${l}`)),
		'',
	].join('\n');
}

function entriesFor(body) {
	const versions = new Map([['0.35.0', new Set()]]);
	parseChangelog(changelogFor(body), versions);
	return [...versions.get('0.35.0')];
}

describe('stripTables', () => {
	it('drops table rows, keeping the prose around them', () => {
		const lines = ['before', '| a | b |', '|---|---|', '| 1 | 2 |', 'after'];
		expect(stripTables(lines)).toEqual(['before', 'after']);
	});

	it('handles the indentation a changeset body carries', () => {
		expect(stripTables(['  | a | b |', '  text'])).toEqual(['  text']);
	});

	it('leaves a line that merely contains a pipe alone', () => {
		// `caution | check | note` is prose, not a row: no leading or trailing pipe.
		const prose = ['one of `caution | check | note | warning`'];
		expect(stripTables(prose)).toEqual(prose);
	});
});

describe('parseChangelog — a wrapped sub-bullet stays one entry', () => {
	// The defect this covers shipped in v0.34.0. A sub-bullet that wraps onto
	// indented continuation lines had those lines classified as prose, so every
	// bullet was truncated at its first line and the orphaned tails were joined
	// into a single sentence — three unrelated half-thoughts run together.
	const BODY = `Something changed

**Three defects this found**, all of the same class:

- The first one, whose explanation is long enough that the line
  wraps onto a second line and then a third.
- The second one, which also wraps
  onto another line.
- A short one.`;

	it('keeps each bullet whole, with its continuation attached', () => {
		const entries = entriesFor(BODY);
		expect(entries).toContain(
			'- The first one, whose explanation is long enough that the line wraps onto a second line and then a third.',
		);
		expect(entries).toContain('- The second one, which also wraps onto another line.');
		expect(entries).toContain('- A short one.');
	});

	it('invents no entry out of the orphaned tails', () => {
		// The shape of the old bug: a bullet built from continuation text alone.
		for (const entry of entriesFor(BODY)) {
			expect(entry, `"${entry}" begins mid-sentence`).not.toMatch(/^- (wraps|onto) /);
		}
	});

	it('still unwraps a plain wrapped paragraph into one entry', () => {
		const entries = entriesFor('A title\n\nA paragraph that wraps\nacross two lines.');
		expect(entries).toContain('- A paragraph that wraps across two lines.');
	});
});

describe('parseChangelog — a table never becomes a line of pipes', () => {
	it('drops the table and keeps the sentences around it', () => {
		const entries = entriesFor(`A title

Before the table.

| \`type\` | publishes |
|--------|-----------|
| album  | MusicAlbum |

After the table.`);
		expect(entries).toContain('- Before the table.');
		expect(entries).toContain('- After the table.');
		expect(entries.some((e) => e.includes('|'))).toBe(false);
	});
});
