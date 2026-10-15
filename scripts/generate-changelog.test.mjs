import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	stripCodeFences,
	stripTables,
	parseChangelog,
	renderIndex,
	renderIndexEntry,
	renderReleasePage,
	hasPage,
	plainRefs,
	summaryFor,
	readNotes,
	readMilestones,
	milestoneSummary,
	drawerRefs,
	declaredPlanIds,
	unresolvedRefs,
	releaseRefFindings,
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

// SPEC-176 — each entry opens with a summary and folds the changeset detail.
const MILESTONE = `{% milestone name="v1.2.0" status="complete" %}

# v1.2.0 — Faster builds

Builds reuse their cache ({% ref "SPEC-9001" /%}), and the CLI reports what
it skipped.

## Why

Not part of the summary.

{% /milestone %}
`;

describe('index entries carry no drawers', () => {
	const release = {
		version: '1.2.0',
		date: 'May 1, 2026',
		summary: 'Faster ({% ref "SPEC-9001" preview="drawer" /%}).',
		changes: ['- One', '- Two'],
	};

	it('shows the summary with refs flattened, then links the release page', () => {
		expect(renderIndexEntry(release)).toBe(
			'## v1.2.0 - May 1, 2026\n\nFaster (SPEC-9001).\n\n[All 2 changes in v1.2.0 →](/releases/v1.2.0)',
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
	it('keeps drawer refs and lists every change', () => {
		const page = renderReleasePage({
			version: '1.2.0',
			date: 'May 1, 2026',
			summary: 'Faster ({% ref "SPEC-9001" preview="drawer" /%}).',
			changes: ['- One', '- Two'],
		});
		expect(page).toBe(
			'---\ntitle: v1.2.0\ndescription: What changed in refrakt.md v1.2.0\n---\n\n# v1.2.0\n\nReleased May 1, 2026 · [All releases](/releases)\n\nFaster ({% ref "SPEC-9001" preview="drawer" /%}).\n\n## Changes\n\n- One\n- Two\n',
		);
	});

	it('exists only when there is a summary or a change', () => {
		expect(hasPage({ summary: null, changes: [] })).toBe(false);
		expect(hasPage({ summary: 'x', changes: [] })).toBe(true);
		expect(hasPage({ summary: null, changes: ['- y'] })).toBe(true);
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
	it('bolds the title after the dash and appends the first paragraph', () => {
		expect(milestoneSummary(MILESTONE)).toBe(
			'**Faster builds.** Builds reuse their cache ({% ref "SPEC-9001" preview="drawer" /%}), and the CLI reports what\nit skipped.',
		);
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
		expect(milestoneSummary(source)).toBe('**Lists first.** The paragraph.');
	});

	it('keeps a paragraph that opens with an inline ref', () => {
		const source = '# v1.4.0 — X\n\n{% ref "SPEC-9002" /%} lands here.\n';
		expect(milestoneSummary(source)).toBe(
			'**X.** {% ref "SPEC-9002" preview="drawer" /%} lands here.',
		);
	});

	it('falls back to the title alone when there is no paragraph', () => {
		expect(milestoneSummary('# v1.5.0 — Only a title\n\n- a list\n')).toBe('**Only a title.**');
	});

	it('does not add a second stop to a title that ends in punctuation', () => {
		expect(milestoneSummary('# v1.6.0 — Ready?\n')).toBe('**Ready?**');
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
		expect([...readNotes(join(dir, 'notes'))]).toEqual([['1.2.0', 'The note.']]);
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
		expect(readNotes(join(dir, 'notes')).get('1.2.0')).toContain('## not a heading');
	});

	it('keys milestones by their name attribute, not the filename', () => {
		write('milestones/faster-builds.md', MILESTONE);
		expect([...readMilestones(join(dir, 'milestones')).keys()]).toEqual(['v1.2.0']);
	});
});

describe('summaryFor', () => {
	const milestones = new Map([['v1.2.0', MILESTONE]]);

	it('prefers a handwritten note over the milestone', () => {
		expect(summaryFor('1.2.0', new Map([['1.2.0', 'Handwritten.']]), milestones)).toBe(
			'Handwritten.',
		);
	});

	it('falls back to the milestone opening', () => {
		expect(summaryFor('1.2.0', new Map(), milestones)).toMatch(/^\*\*Faster builds\.\*\*/);
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
