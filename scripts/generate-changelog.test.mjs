import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	stripCodeFences,
	stripTables,
	parseChangelog,
	renderIndex,
	releaseHeading,
	renderIndexEntry,
	renderReleasePage,
	hasPage,
	plainRefs,
	indexSummary,
	summaryFor,
	readNotes,
	readMilestones,
	milestoneSummary,
	drawerRefs,
	declaredPlanIds,
	unresolvedRefs,
	releaseRefFindings,
	recordedDate,
} from './generate-changelog.mjs';
import { fileURLToPath } from 'node:url';

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
		const lines = entriesFor(BODY).flatMap((e) => e.split('\n'));
		expect(lines).toContain(
			'  - The first one, whose explanation is long enough that the line wraps onto a second line and then a third.',
		);
		expect(lines).toContain('  - The second one, which also wraps onto another line.');
		expect(lines).toContain('  - A short one.');
	});

	it('invents no entry out of the orphaned tails', () => {
		// The shape of the old bug: a bullet built from continuation text alone.
		for (const line of entriesFor(BODY).flatMap((e) => e.split('\n'))) {
			expect(line, `"${line}" begins mid-sentence`).not.toMatch(/^\s*- (wraps|onto) /);
		}
	});

	it('still unwraps a plain wrapped paragraph into one entry', () => {
		const entries = entriesFor('A title\n\nA paragraph that wraps\nacross two lines.');
		expect(entries).toContain('- A paragraph that wraps across two lines.');
	});
});

describe('parseChangelog — sub-bullets stay with the sentence that introduces them', () => {
	it("nests a changeset's list under its lead, as one entry", () => {
		const entries = entriesFor(`Composed runes can now say more:

- **Zones** split content on \`---\`.
- **Lists** can be iterated.

A closing paragraph.`);
		expect(entries).toEqual([
			'- Composed runes can now say more:\n  - **Zones** split content on `---`.\n  - **Lists** can be iterated.',
			'- A closing paragraph.',
		]);
	});

	it('keeps a list with no sentence before it as entries of their own', () => {
		const versions = new Map();
		parseChangelog(
			[
				'## 0.35.0',
				'',
				'### Minor Changes',
				'',
				'- ### Editor',
				'  - One thing.',
				'  - Another.',
			].join('\n'),
			versions,
		);
		expect([...versions.get('0.35.0')]).toEqual(['- One thing.', '- Another.']);
	});
});

describe('parseChangelog — a sentence introducing a dropped example', () => {
	it('ends with a full stop instead of a colon pointing at nothing', () => {
		const entries = entriesFor(`Content may be indented, to show its nesting:

\`\`\`md
{% card %}
\t{% hint %}x{% /hint %}
{% /card %}
\`\`\`

Fences are unaffected.`);
		expect(entries).toEqual([
			'- Content may be indented, to show its nesting.',
			'- Fences are unaffected.',
		]);
	});
});

describe('recordedDate', () => {
	let dir;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'rf-release-date-'));
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it('reads the date a previous run wrote on the release page', () => {
		const page = join(dir, 'v0.37.0.md');
		writeFileSync(
			page,
			renderReleasePage({ version: '0.37.0', date: 'October 6, 2026', changes: ['- x'] }),
		);
		expect(recordedDate(page)).toBe('October 6, 2026');
	});

	it('is empty for an undated page or no page', () => {
		const page = join(dir, 'v0.38.0.md');
		writeFileSync(page, renderReleasePage({ version: '0.38.0', date: '', changes: ['- x'] }));
		expect(recordedDate(page)).toBe('');
		expect(recordedDate(join(dir, 'missing.md'))).toBe('');
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

// SPEC-176 — each release has a title in its heading and a summary under it.
const MILESTONE = `{% milestone name="v1.2.0" status="complete" %}

# v1.2.0 — Faster builds

Builds reuse their cache ({% ref "SPEC-9001" /%}), and the CLI reports what
it skipped.

## Why

Not part of the summary.

{% /milestone %}
`;

describe('releaseHeading', () => {
	it('puts the title after the version and the date after a dash', () => {
		expect(releaseHeading('1.2.0', 'Faster builds', 'May 1, 2026')).toBe(
			'v1.2.0 · Faster builds - May 1, 2026',
		);
	});

	it('omits whichever of title and date is missing', () => {
		expect(releaseHeading('1.2.0', '', 'May 1, 2026')).toBe('v1.2.0 - May 1, 2026');
		expect(releaseHeading('1.2.0', 'Faster builds', '')).toBe('v1.2.0 · Faster builds');
		expect(releaseHeading('1.2.0', '', '')).toBe('v1.2.0');
	});

	it('keeps a hyphenated title and rejects one with a spaced dash', () => {
		expect(releaseHeading('1.2.0', 'render-stack removal', '')).toBe(
			'v1.2.0 · render-stack removal',
		);
		expect(() => releaseHeading('1.2.0', 'Before - after', '')).toThrow('v1.2.0');
	});
});

describe('index entries carry no drawers', () => {
	const release = {
		version: '1.2.0',
		date: 'May 1, 2026',
		summary: { title: 'Faster builds', body: 'Faster ({% ref "SPEC-9001" preview="drawer" /%}).' },
		changes: ['- One', '- Two'],
	};

	it('heads the entry with the title, flattens refs, then links the release page', () => {
		expect(renderIndexEntry(release)).toBe(
			'## v1.2.0 · Faster builds - May 1, 2026\n\nFaster (SPEC-9001).\n\n[All 2 changes in v1.2.0 →](/releases/v1.2.0)',
		);
	});

	it('says "1 change" for a single change, and omits the date when untagged', () => {
		expect(
			renderIndexEntry({ version: '1.2.1', date: '', summary: null, changes: ['- Fix'] }),
		).toBe('## v1.2.1\n\n[All 1 change in v1.2.1 →](/releases/v1.2.1)');
	});

	it('links a summary-only release as "More about"', () => {
		expect(renderIndexEntry({ ...release, changes: [] })).toMatch(
			/\[More about v1\.2\.0 →\]\(\/releases\/v1\.2\.0\)$/,
		);
	});

	it('wraps the entries in the changelog rune', () => {
		const index = renderIndex(['## v1.2.0', '## v1.1.0']);
		expect(index).toContain('{% changelog %}\n## v1.2.0\n\n## v1.1.0\n{% /changelog %}');
		expect(index).toMatch(/^---\ntitle: Changelog\n/);
	});
});

describe('release pages', () => {
	it('titles the page with version and title, keeps drawer refs and lists every change', () => {
		const page = renderReleasePage({
			version: '1.2.0',
			date: 'May 1, 2026',
			summary: {
				title: 'Faster builds',
				body: 'Faster ({% ref "SPEC-9001" preview="drawer" /%}).',
			},
			changes: ['- One', '- Two'],
		});
		expect(page).toBe(
			'---\ntitle: "v1.2.0 · Faster builds"\ndescription: What changed in refrakt.md v1.2.0\n---\n\n# v1.2.0 · Faster builds\n\nReleased May 1, 2026 · [All releases](/releases)\n\nFaster ({% ref "SPEC-9001" preview="drawer" /%}).\n\n## Changes\n\n- One\n- Two\n',
		);
	});

	it('exists only when there is a summary body or a change', () => {
		expect(hasPage({ summary: null, changes: [] })).toBe(false);
		expect(hasPage({ summary: { title: 'T', body: '' }, changes: [] })).toBe(false);
		expect(hasPage({ summary: { title: '', body: 'x' }, changes: [] })).toBe(true);
		expect(hasPage({ summary: null, changes: ['- y'] })).toBe(true);
	});
});

describe('indexSummary', () => {
	it('drops the Background paragraph and flattens the rest', () => {
		const note =
			'See {% ref "SPEC-1" preview="drawer" /%}.\n\nBackground: {% ref "v1.0.0" preview="drawer" label="the milestone" /%} ·\n{% ref "SPEC-1" preview="drawer" /%}';
		expect(indexSummary(note)).toBe('See SPEC-1.');
	});

	it('keeps an action-needed block', () => {
		const note = 'Intro.\n\n{% hint type="warning" %}\n**Action needed:** x\n{% /hint %}';
		expect(indexSummary(note)).toBe(note);
	});
});

describe('plainRefs', () => {
	it('turns a ref into its target, or its label when it has one', () => {
		expect(
			plainRefs(
				'{% ref "SPEC-1" preview="drawer" /%} and {% xref "v1.0.0" label="the milestone" /%}',
			),
		).toBe('SPEC-1 and the milestone');
	});

	it('keeps a file-ref link but drops its drawer preview', () => {
		expect(plainRefs('{% file-ref path="a.ts" preview="drawer" /%}')).toBe(
			'{% file-ref path="a.ts" /%}',
		);
	});
});

describe('milestoneSummary', () => {
	it('takes the title after the dash and the first paragraph as the body', () => {
		expect(milestoneSummary(MILESTONE)).toEqual({
			title: 'Faster builds',
			body: 'Builds reuse their cache ({% ref "SPEC-9001" preview="drawer" /%}), and the CLI reports what\nit skipped.',
		});
	});

	it('skips a list, a fence and a tag-only line to reach the first paragraph', () => {
		const source = `{% milestone name="v1.3.0" %}

# v1.3.0 — Lists first

- a goal
- another

\`\`\`
code
\`\`\`

{% backlog milestone="v1.3.0" /%}

The paragraph.

{% /milestone %}`;
		expect(milestoneSummary(source)).toEqual({ title: 'Lists first', body: 'The paragraph.' });
	});

	it('keeps a paragraph that opens with an inline ref', () => {
		const source = '# v1.4.0 — X\n\n{% ref "SPEC-9002" /%} lands here.\n';
		expect(milestoneSummary(source).body).toBe(
			'{% ref "SPEC-9002" preview="drawer" /%} lands here.',
		);
	});

	it('has an empty body when there is no paragraph', () => {
		expect(milestoneSummary('# v1.5.0 — Only a title\n\n- a list\n')).toEqual({
			title: 'Only a title',
			body: '',
		});
	});
});

describe('drawerRefs', () => {
	it('adds preview="drawer" to ref and xref without a preview', () => {
		expect(drawerRefs('{% ref "A-1" /%} and {% xref "B-2" label="b" /%}')).toBe(
			'{% ref "A-1" preview="drawer" /%} and {% xref "B-2" label="b" preview="drawer" /%}',
		);
	});

	it('leaves a ref that already sets preview alone', () => {
		const text = '{% ref "A-1" preview="inline" /%}';
		expect(drawerRefs(text)).toBe(text);
	});
});

describe('reading notes and milestones from disk', () => {
	let dir;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'refrakt-changelog-'));
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	const write = (rel, body) => {
		mkdirSync(join(dir, rel, '..'), { recursive: true });
		writeFileSync(join(dir, rel), body);
	};

	it('reads notes keyed by version, ignoring other files', () => {
		write('notes/v1.2.0.md', 'The note.\n');
		write('notes/README.md', 'not a note');
		expect([...readNotes(join(dir, 'notes'))]).toEqual([
			['1.2.0', { title: '', body: 'The note.' }],
		]);
	});

	it('reads a title from frontmatter, quoted or not, and keeps it out of the body', () => {
		write('notes/v1.2.0.md', '---\ntitle: "Faster: builds"\n---\n\nThe note.\n');
		write('notes/v1.3.0.md', '---\ntitle: Plain title\n---\nBody.\n');
		const notes = readNotes(join(dir, 'notes'));
		expect(notes.get('1.2.0')).toEqual({ title: 'Faster: builds', body: 'The note.' });
		expect(notes.get('1.3.0')).toEqual({ title: 'Plain title', body: 'Body.' });
	});

	it('returns no notes when the directory does not exist', () => {
		expect(readNotes(join(dir, 'missing')).size).toBe(0);
	});

	it('rejects a note with a ## heading, naming the file', () => {
		write('notes/v1.2.0.md', 'Intro.\n\n## Details\n');
		expect(() => readNotes(join(dir, 'notes'))).toThrow('v1.2.0.md');
	});

	it('allows a heading inside a code fence in a note', () => {
		write('notes/v1.2.0.md', 'Intro.\n\n```md\n## not a heading\n```\n');
		expect(readNotes(join(dir, 'notes')).get('1.2.0').body).toContain('## not a heading');
	});

	it('keys milestones by their name attribute, not the filename', () => {
		write('milestones/faster-builds.md', MILESTONE);
		expect([...readMilestones(join(dir, 'milestones')).keys()]).toEqual(['v1.2.0']);
	});
});

describe('summaryFor', () => {
	const milestones = new Map([['v1.2.0', MILESTONE]]);
	const note = (title, body) => new Map([['1.2.0', { title, body }]]);

	it("prefers a note's body, and borrows the milestone's title when the note has none", () => {
		expect(summaryFor('1.2.0', note('', 'Handwritten.'), milestones)).toEqual({
			title: 'Faster builds',
			body: 'Handwritten.',
		});
	});

	it("lets a note's frontmatter title override the milestone's", () => {
		expect(summaryFor('1.2.0', note('Quicker builds', 'Handwritten.'), milestones).title).toBe(
			'Quicker builds',
		);
	});

	it('falls back to the milestone opening', () => {
		expect(summaryFor('1.2.0', new Map(), milestones)).toEqual(milestoneSummary(MILESTONE));
	});

	it('returns null with neither', () => {
		expect(summaryFor('1.2.1', new Map(), milestones)).toBeNull();
	});
});

// SPEC-176 D6 — a mistyped ID in a release note fails here, not as a dead
// drawer. `refrakt validate --deep` does not report it.
describe('every ref in a release summary resolves', () => {
	let dir;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'refrakt-release-refs-'));
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	const write = (rel, body) => {
		mkdirSync(join(dir, rel, '..'), { recursive: true });
		writeFileSync(join(dir, rel), body);
	};

	it('collects IDs and milestone names, skipping fenced examples', () => {
		write(
			'plan/specs/SPEC-001-a.md',
			'{% spec id="SPEC-001" status="draft" %}\n\n# A\n\n```\n{% work id="WORK-999" %}\n```\n',
		);
		write('plan/milestones/v1.0.0.md', '{% milestone name="v1.0.0" %}\n# v1.0.0 — One\n');
		expect([...declaredPlanIds(join(dir, 'plan'))].sort()).toEqual(['SPEC-001', 'v1.0.0']);
	});

	it('reports an unknown target with its line, and accepts known ones', () => {
		const text = 'See {% ref "SPEC-001" /%}.\n\nAnd {% xref "SPEC-404" preview="drawer" /%}.';
		expect(unresolvedRefs(text, new Set(['SPEC-001']))).toEqual([{ line: 3, target: 'SPEC-404' }]);
	});

	it('names the note file, the line and the unknown ID', () => {
		write('plan/specs/SPEC-001-a.md', '{% spec id="SPEC-001" %}\n');
		write(
			'releases/notes/v1.0.0.md',
			'Intro {% ref "SPEC-001" /%}.\n\nTypo {% ref "SPEC-010" /%}.\n',
		);
		expect(releaseRefFindings(dir)).toEqual([
			'releases/notes/v1.0.0.md:3: SPEC-010 is not declared in plan/',
		]);
	});

	it('does not count a declaration that only appears in a fence as declared', () => {
		write(
			'plan/specs/SPEC-001-a.md',
			'{% spec id="SPEC-001" %}\n\n```\n{% spec id="SPEC-002" %}\n```\n',
		);
		write('releases/notes/v1.0.0.md', '{% ref "SPEC-002" /%}\n');
		expect(releaseRefFindings(dir)).toEqual([
			'releases/notes/v1.0.0.md:1: SPEC-002 is not declared in plan/',
		]);
	});

	it('checks the milestone opening the generator falls back to', () => {
		write(
			'plan/milestones/v1.0.0.md',
			'{% milestone name="v1.0.0" %}\n\n# v1.0.0 — One\n\nDelivers {% ref "SPEC-777" /%}.\n',
		);
		expect(releaseRefFindings(dir)).toEqual([
			'v1.0.0 milestone opening: SPEC-777 is not declared in plan/',
		]);
	});

	it("passes over this repository's notes and milestones", () => {
		const repo = join(fileURLToPath(new URL('.', import.meta.url)), '..');
		expect(releaseRefFindings(repo)).toEqual([]);
	});
});
