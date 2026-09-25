/**
 * WORK-594 — the edge index, the git scan, and the ranking.
 *
 * The `--full-history` test is the important one: a pathspec makes git apply
 * history simplification, which inflates every edge out of a file and deflates
 * every edge into it, and the report still renders and still looks plausible.
 */

import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatMarker, hashSlice } from '@refrakt-md/runes';
import {
	buildEdgeIndex,
	edgesTouching,
	GitScanRefusal,
	globMatcher,
	globToRegExp,
	indexEdges,
	rankEdges,
	resolveStaleSettings,
	scanHistory,
	StaleConfigRefusal,
} from '../src/edges/index.js';
import {
	dedupeEdges,
	extractDeclaredEdges,
	extractDescribedLinkEdges,
	extractEmbeddedEdges,
	extractProseEdges,
} from '../src/edges/extract.js';

describe('embedded-source extraction', () => {
	it('extracts path= from snippet, file-ref and expand', () => {
		const src = [
			'{% snippet path="a.ts" lines="1-5" /%}',
			'{% file-ref path="b.ts" symbol="X" /%}',
			'{% expand path="c.md" /%}',
		].join('\n');
		const edges = extractEmbeddedEdges('page.md', src);
		expect(edges.map((e) => e.target)).toEqual(['a.ts', 'b.ts', 'c.md']);
		expect(edges.map((e) => e.line)).toEqual([1, 2, 3]);
		expect(edges.every((e) => e.class === 'embedded')).toBe(true);
	});

	it('ignores an invocation inside a fenced block', () => {
		// A `{% snippet %}` inside a ```markdoc fence is an *example* of the
		// syntax, not a reference to that file. On this repository's own
		// corpus, counting those inflated the index by 4 of 10.
		const src = [
			'{% snippet path="real.ts" /%}',
			'',
			'```markdoc',
			'{% snippet path="example.ts" /%}',
			'```',
		].join('\n');
		const edges = extractEmbeddedEdges('page.md', src);
		expect(edges.map((e) => e.target)).toEqual(['real.ts']);
	});

	it('ignores an invocation inside an inline code span', () => {
		const src = 'Write `{% snippet path="example.ts" /%}` to embed a file.';
		expect(extractEmbeddedEdges('page.md', src)).toEqual([]);
	});

	it('reports line numbers in the unmasked frame', () => {
		const src = ['```', 'fenced', '```', '{% snippet path="a.ts" /%}'].join('\n');
		expect(extractEmbeddedEdges('page.md', src)[0].line).toBe(4);
	});

	it('carries a reviewed marker when one is present', () => {
		const src = '{% snippet path="a.ts" symbol="X" reviewed="a3f91c4e" /%}';
		expect(extractEmbeddedEdges('p.md', src)[0].reviewed).toBe('a3f91c4e');
	});

	it('dedupes by referrer and target, keeping the earliest line', () => {
		const edges = dedupeEdges([
			{ referrer: 'p.md', line: 9, target: 'a.ts', class: 'embedded' },
			{ referrer: 'p.md', line: 3, target: 'a.ts', class: 'embedded' },
			{ referrer: 'p.md', line: 5, target: 'b.ts', class: 'embedded' },
		]);
		expect(edges).toHaveLength(2);
		expect(edges.find((e) => e.target === 'a.ts')?.line).toBe(3);
	});

	it('collapses the same claim reached by two classes, keeping the precise one', () => {
		// A page that *declares* a file and also mentions it in prose is making
		// one claim, not two. Keying on the class produced duplicate rows in
		// the ranked report the moment the first `documents:` entry landed.
		const edges = dedupeEdges([
			{ referrer: 'p.md', line: 40, target: 'a.ts', class: 'prose' },
			{ referrer: 'p.md', line: 1, target: 'a.ts', class: 'declared' },
		]);
		expect(edges).toHaveLength(1);
		expect(edges[0].class).toBe('declared');
	});

	it('does not let a prose mention displace a declared edge, whatever the order', () => {
		const declaredFirst = dedupeEdges([
			{ referrer: 'p.md', line: 1, target: 'a.ts', class: 'declared' },
			{ referrer: 'p.md', line: 40, target: 'a.ts', class: 'prose' },
		]);
		expect(declaredFirst[0].class).toBe('declared');
	});
});

describe('the index is addressable in both directions', () => {
	const index = indexEdges([
		{ referrer: 'one.md', line: 1, target: 'a.ts', class: 'embedded' },
		{ referrer: 'two.md', line: 2, target: 'a.ts', class: 'embedded' },
		{ referrer: 'one.md', line: 3, target: 'b.ts', class: 'embedded' },
	]);

	it('answers referrer → targets', () => {
		expect(index.byReferrer.get('one.md')?.map((e) => e.target)).toEqual(['a.ts', 'b.ts']);
	});

	it('answers target → referrers, which is the touching direction', () => {
		expect(index.byTarget.get('a.ts')?.map((e) => e.referrer)).toEqual(['one.md', 'two.md']);
	});

	it('edgesTouching returns every match, unbounded', () => {
		const hits = edgesTouching(index, ['a.ts', 'b.ts']);
		expect(hits).toHaveLength(3);
	});

	it('edgesTouching answers for a path with no history at all', () => {
		// No git scan involved — this is what lets an agent ask about a file it
		// created in the working tree and never committed.
		const fresh = indexEdges([
			{ referrer: 'p.md', line: 1, target: 'brand-new.ts', class: 'embedded' },
		]);
		expect(edgesTouching(fresh, ['brand-new.ts'])).toHaveLength(1);
	});
});

describe('the git scan', () => {
	let repo: string;

	beforeEach(() => {
		repo = mkdtempSync(join(tmpdir(), 'refrakt-edges-'));
		clock = 0;
		const run = (cmd: string) => execSync(cmd, { cwd: repo, stdio: 'pipe' });
		run('git init -q');
		run('git config user.email t@example.com');
		run('git config user.name Test');
		run('git config commit.gpgsign false');
	});

	afterEach(() => {
		rmSync(repo, { recursive: true, force: true });
	});

	// A fake clock advancing one hour per commit. Without it every commit in a
	// test lands in the same wall-clock second, and the measure — which counts
	// commits *strictly after* the referrer's last change — sees none of them.
	// Real history does not have that problem; a fixture built in 80ms does.
	let clock = 0;
	const commit = (file: string, content: string, message: string) => {
		const dir = join(repo, file).split('/').slice(0, -1).join('/');
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(repo, file), content, 'utf8');
		clock += 3600;
		const when = new Date((1_700_000_000 + clock) * 1000).toISOString();
		execSync(`git add -A && git commit -q -m "${message}"`, {
			cwd: repo,
			stdio: 'pipe',
			env: { ...process.env, GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when },
		});
	};

	it('refuses a non-git tree rather than reporting a clean corpus', () => {
		const plain = mkdtempSync(join(tmpdir(), 'refrakt-plain-'));
		try {
			expect(() => scanHistory(plain)).toThrow(GitScanRefusal);
			expect(() => scanHistory(plain)).toThrow(/not a git repository/);
		} finally {
			rmSync(plain, { recursive: true, force: true });
		}
	});

	it('collects every commit touching a path, newest first', () => {
		commit('a.ts', 'one', 'first');
		commit('a.ts', 'two', 'second');
		commit('a.ts', 'three', 'third');

		const history = scanHistory(repo);
		const commits = history.byPath.get('a.ts');
		expect(commits).toHaveLength(3);
		expect(commits?.[0].subject).toBe('third');
		expect(commits?.[2].subject).toBe('first');
	});

	it('pins a file whose simplified and full histories differ', () => {
		// The test this feature most needs. A pathspec makes git apply history
		// simplification, and this command does *arithmetic* on the resulting
		// timestamps — so a simplified history inflates every edge out of a
		// file and deflates every edge into it, while the report still renders,
		// still ranks, and looks entirely plausible.
		//
		// A merge that discards the side's version of the file is where the two
		// answers diverge: the side's commit is not reachable through any
		// change to the merge result, so simplification prunes it as
		// uninteresting while the full history keeps it.
		const run = (cmd: string) => execSync(cmd, { cwd: repo, stdio: 'pipe' });

		commit('page.md', 'v1', 'add page');
		commit('target.ts', 'base\n', 'add target');

		run('git checkout -q -b side');
		commit('target.ts', 'side\n', 'side branch edits target');

		run('git checkout -q -');
		commit('target.ts', 'main\n', 'main edits target');

		clock += 3600;
		const when = new Date((1_700_000_000 + clock) * 1000).toISOString();
		execSync('git merge -q -s ours -m "merge side, keeping ours" side', {
			cwd: repo,
			stdio: 'pipe',
			env: { ...process.env, GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when },
		});

		// What a *simplified* history reports for this path:
		const simplified = execSync('git log --format=%H --name-only -- target.ts', {
			cwd: repo,
			encoding: 'utf-8',
		})
			.split('\n')
			.filter((l) => /^[0-9a-f]{40}$/.test(l)).length;

		const history = scanHistory(repo);
		const full = history.byPath.get('target.ts')?.length ?? 0;

		// The scan must report the full answer, and the two must actually
		// differ — otherwise this test would pass without proving anything.
		expect(full).toBeGreaterThan(simplified);
		expect(full).toBe(3);
	});

	it('does the arithmetic on the full history', () => {
		commit('page.md', 'v1', 'add page');
		commit('target.ts', 'v1', 'add target');
		commit('target.ts', 'v2', 'change target once');
		commit('target.ts', 'v3', 'change target twice');

		const history = scanHistory(repo);
		const index = indexEdges([
			{ referrer: 'page.md', line: 1, target: 'target.ts', class: 'embedded' },
		]);
		const { ranked } = rankEdges(index, history);
		expect(ranked).toHaveLength(1);
		expect(ranked[0].score).toBe(3);
		expect(ranked[0].commits.map((c) => c.subject)).toContain('change target twice');
	});

	it('reproduces the measured case: more commits ranks higher', () => {
		commit('hot.md', 'v1', 'add hot page');
		commit('cold.md', 'v1', 'add cold page');
		commit('cold-target.ts', 'v1', 'add cold target');
		commit('hot-target.ts', 'v1', 'add hot target');
		commit('hot-target.ts', 'v2', 'hot change one');
		commit('hot-target.ts', 'v3', 'hot change two');

		const index = indexEdges([
			{ referrer: 'hot.md', line: 1, target: 'hot-target.ts', class: 'embedded' },
			{ referrer: 'cold.md', line: 1, target: 'cold-target.ts', class: 'embedded' },
		]);
		const { ranked } = rankEdges(index, scanHistory(repo));

		expect(ranked[0].edge.referrer).toBe('hot.md');
		expect(ranked[0].score).toBeGreaterThan(0);
	});

	it('scores zero and omits an edge whose referrer is newer than its target', () => {
		commit('target.ts', 'v1', 'add target');
		commit('page.md', 'v1', 'add page after the target');

		const index = indexEdges([
			{ referrer: 'page.md', line: 1, target: 'target.ts', class: 'embedded' },
		]);
		expect(rankEdges(index, scanHistory(repo)).ranked).toEqual([]);
	});

	it('honours --min', () => {
		commit('page.md', 'v1', 'add page');
		commit('target.ts', 'v1', 'one');
		commit('target.ts', 'v2', 'two');

		const index = indexEdges([
			{ referrer: 'page.md', line: 1, target: 'target.ts', class: 'embedded' },
		]);
		const history = scanHistory(repo);
		expect(rankEdges(index, history, { min: 2 }).ranked).toHaveLength(1);
		expect(rankEdges(index, history, { min: 5 }).ranked).toEqual([]);
	});

	it('honours --class', () => {
		commit('page.md', 'v1', 'add page');
		commit('target.ts', 'v1', 'one');
		commit('target.ts', 'v2', 'two');

		const index = indexEdges([
			{ referrer: 'page.md', line: 1, target: 'target.ts', class: 'embedded' },
			{ referrer: 'page.md', line: 2, target: 'target.ts', class: 'prose' },
		]);
		const history = scanHistory(repo);
		expect(rankEdges(index, history, { edgeClass: 'prose' }).ranked).toHaveLength(1);
		expect(rankEdges(index, history, { edgeClass: 'prose' }).ranked[0].edge.class).toBe('prose');
	});

	it('reports a per-class base rate', () => {
		commit('page.md', 'v1', 'add page');
		commit('stale.ts', 'v1', 'one');
		commit('stale.ts', 'v2', 'two');
		commit('fresh.ts', 'v1', 'fresh');
		commit('page.md', 'v2', 'touch page last');

		const index = indexEdges([
			{ referrer: 'page.md', line: 1, target: 'stale.ts', class: 'embedded' },
			{ referrer: 'page.md', line: 2, target: 'fresh.ts', class: 'embedded' },
		]);
		const { baseRates } = rankEdges(index, scanHistory(repo));
		const embedded = baseRates.find((r) => r.class === 'embedded');
		expect(embedded?.scanned).toBe(2);
		// Both targets predate the page's last edit, so neither is stale.
		expect(embedded?.nonZero).toBe(0);
	});

	it('a reviewed marker scores zero regardless of commit count (D3)', () => {
		commit('page.md', 'v1', 'add page');
		commit('target.ts', 'v1', 'one');
		commit('target.ts', 'v2', 'two');

		const index = indexEdges([
			{
				referrer: 'page.md',
				line: 1,
				target: 'target.ts',
				class: 'embedded',
				reviewed: 'a3f91c4e',
			},
		]);
		// A marker is a stronger statement than a commit count, so where one
		// exists it wins.
		expect(rankEdges(index, scanHistory(repo)).ranked).toEqual([]);
	});

	it('a marker the target has outgrown does not score zero', () => {
		// The half of D3 that is easy to get backwards. A marker suppresses the
		// count because a human said the prose still holds *for that content*;
		// once the content moves on, the statement has expired and the count is
		// the best evidence again. Suppressing on the mere presence of the
		// attribute would make a stale marker permanently silence the edge —
		// worse than no marker at all.
		commit('page.md', 'v1', 'add page');
		commit('target.ts', 'v1', 'one');
		commit('target.ts', 'v2', 'two');

		const index = indexEdges([
			{
				referrer: 'page.md',
				line: 1,
				target: 'target.ts',
				class: 'embedded',
				reviewed: 'a3f91c4e',
				markerStale: true,
			},
		]);
		expect(rankEdges(index, scanHistory(repo)).ranked).toHaveLength(1);
	});

	it('decides marker currency against the same slice the review tool hashes', () => {
		const body = 'export function keep() {\n\treturn 1;\n}\n';
		commit('src/a.ts', body, 'add source');

		const marker = formatMarker(hashSlice(body.trimEnd()));
		commit(
			'site/content/page.md',
			`{% snippet path="src/a.ts" reviewed="${marker}" /%}\n`,
			'add page',
		);

		const fresh = buildEdgeIndex({ repoRoot: repo, contentDirs: ['site/content'] });
		expect(fresh.edges[0].reviewed).toBe(marker);
		expect(fresh.edges[0].markerStale).toBe(false);

		// The target moves on; the marker now certifies content that is gone.
		commit('src/a.ts', 'export function keep() {\n\treturn 2;\n}\n', 'change source');
		const after = buildEdgeIndex({ repoRoot: repo, contentDirs: ['site/content'] });
		expect(after.edges[0].markerStale).toBe(true);
	});

	it('builds an index from a content directory', () => {
		commit('site/content/page.md', '{% snippet path="src/a.ts" /%}', 'add page');
		commit('src/a.ts', 'x', 'add source');

		const index = buildEdgeIndex({ repoRoot: repo, contentDirs: ['site/content'] });
		expect(index.edges).toHaveLength(1);
		expect(index.edges[0].referrer).toBe('site/content/page.md');
		expect(index.edges[0].target).toBe('src/a.ts');
	});
});

describe('declared edges — the documents: field (D13)', () => {
	const exists = (p: string) => ['src/a.ts', 'src/b.ts'].includes(p);

	it('produces an edge per entry', () => {
		const { edges, errors } = extractDeclaredEdges(
			'page.md',
			{ documents: ['src/a.ts', 'src/b.ts'] },
			exists,
		);
		expect(edges.map((e) => e.target)).toEqual(['src/a.ts', 'src/b.ts']);
		expect(edges.every((e) => e.class === 'declared')).toBe(true);
		expect(errors).toEqual([]);
	});

	it('reports an entry that resolves to nothing as an error, not a skip (D14)', () => {
		// The asymmetry is the point: inferred edges fail quietly, declared
		// edges fail loudly. The author asserted the relationship, so a miss
		// means the file moved and the declaration did not.
		const { edges, errors } = extractDeclaredEdges(
			'page.md',
			{ documents: ['src/gone.ts'] },
			exists,
		);
		expect(edges).toEqual([]);
		expect(errors).toHaveLength(1);
		expect(errors[0].entry).toBe('src/gone.ts');
		expect(errors[0].message).toContain('resolves to no existing file');
	});

	it('rejects absolute paths and traversal escapes', () => {
		const { errors } = extractDeclaredEdges(
			'page.md',
			{ documents: ['/etc/passwd', '../outside.ts'] },
			exists,
		);
		expect(errors).toHaveLength(2);
		for (const e of errors) expect(e.message).toContain('repo-root-relative');
	});

	it('reports a non-list value', () => {
		const { errors } = extractDeclaredEdges('page.md', { documents: 'src/a.ts' }, exists);
		expect(errors[0].message).toContain('must be a list');
	});

	it('is absent when the field is', () => {
		expect(extractDeclaredEdges('page.md', {}, exists)).toEqual({ edges: [], errors: [] });
	});
});

describe('described-link edges (D16)', () => {
	const resolve = (href: string) =>
		({ '/runes/xref': 'site/content/runes/xref.md', '/docs/cli': 'site/content/docs/cli.md' })[
			href
		];

	it('extracts a table row whose neighbouring cell is prose', () => {
		const src = '| [validate](/docs/cli) | Validate theme config and manifest |';
		const edges = extractDescribedLinkEdges('p.md', src, resolve);
		expect(edges.map((e) => e.target)).toEqual(['site/content/docs/cli.md']);
	});

	it('extracts a list item whose link is followed by a dash and prose', () => {
		const src = '- [xref](/runes/xref) — id-based sibling. Same `preview` attribute.';
		expect(extractDescribedLinkEdges('p.md', src, resolve)).toHaveLength(1);
	});

	it('produces nothing for a bare list item', () => {
		// A link says "go here". It asserts nothing.
		expect(extractDescribedLinkEdges('p.md', '- [xref](/runes/xref)', resolve)).toEqual([]);
	});

	it('produces nothing for a link in a paragraph', () => {
		const src = 'See [xref](/runes/xref) for the details of how this works.';
		expect(extractDescribedLinkEdges('p.md', src, resolve)).toEqual([]);
	});

	it('produces nothing for a table row of links with no prose cell', () => {
		const src = '| [xref](/runes/xref) | [validate](/docs/cli) |';
		expect(extractDescribedLinkEdges('p.md', src, resolve)).toEqual([]);
	});

	it('skips an external link', () => {
		const src = '| [github](https://github.com/x) | The repository |';
		expect(extractDescribedLinkEdges('p.md', src, resolve)).toEqual([]);
	});

	it('skips a target that does not resolve to a content page', () => {
		// An inferred edge, so it fails quietly.
		const src = '| [nope](/does/not/exist) | Some description |';
		expect(extractDescribedLinkEdges('p.md', src, resolve)).toEqual([]);
	});

	it('strips an anchor before resolving', () => {
		const src = '| [validate](/docs/cli#refrakt-validate) | Validate the thing |';
		expect(extractDescribedLinkEdges('p.md', src, resolve)).toHaveLength(1);
	});

	it('ignores a fenced example', () => {
		const src = ['```markdoc', '| [xref](/runes/xref) | A description |', '```'].join('\n');
		expect(extractDescribedLinkEdges('p.md', src, resolve)).toEqual([]);
	});
});

describe('prose path mentions (D7)', () => {
	const exists = (p: string) => ['packages/runes/src/config.ts', 'refrakt.config.json'].includes(p);

	it('extracts a backticked path that resolves', () => {
		const src = 'The engine config lives in `packages/runes/src/config.ts` today.';
		const edges = extractProseEdges('p.md', src, exists);
		expect(edges.map((e) => e.target)).toEqual(['packages/runes/src/config.ts']);
		expect(edges[0].class).toBe('prose');
	});

	it('skips a bare root-level filename', () => {
		// The rule the first corpus run forced. Four near-identical rows for
		// `refrakt.config.json` reached the top ten — a file mentioned in
		// passing by unrelated pages and changing for reasons none of them are
		// about. It resolves, and it is still not a claim.
		const src = 'Config lives in `refrakt.config.json` at the root.';
		expect(extractProseEdges('p.md', src, exists)).toEqual([]);
	});

	it('skips a path that does not resolve', () => {
		// The likeliest explanation is that the extractor misfired on something
		// that was never a path. Silence is right there.
		const src = 'Something about `not/a/real/file.ts` here.';
		expect(extractProseEdges('p.md', src, exists)).toEqual([]);
	});

	it('skips an unbackticked path', () => {
		const src = 'See packages/runes/src/config.ts for details.';
		expect(extractProseEdges('p.md', src, exists)).toEqual([]);
	});

	it('ignores a fenced block but keeps inline spans', () => {
		// The distinction that makes this class work at all: the full Markdown
		// mask blanks inline code spans, which is exactly where the path lives.
		const src = [
			'```ts',
			'import x from `packages/runes/src/config.ts`;',
			'```',
			'Prose about `packages/runes/src/config.ts`.',
		].join('\n');
		const edges = extractProseEdges('p.md', src, exists);
		expect(edges).toHaveLength(1);
		expect(edges[0].line).toBe(4);
	});
});

describe('project-configured exclusions (WORK-596)', () => {
	let repo: string;

	beforeEach(() => {
		repo = mkdtempSync(join(tmpdir(), 'refrakt-exclude-'));
		mkdirSync(join(repo, 'site/content/docs/migration'), { recursive: true });
		mkdirSync(join(repo, 'src'), { recursive: true });
		writeFileSync(join(repo, 'src/a.ts'), 'x', 'utf8');
		writeFileSync(join(repo, 'CHANGELOG.md'), '# changes', 'utf8');
		writeFileSync(
			join(repo, 'site/content/guide.md'),
			'{% snippet path="src/a.ts" /%}\n{% snippet path="CHANGELOG.md" /%}\n',
			'utf8',
		);
		writeFileSync(
			join(repo, 'site/content/docs/migration/v1.md'),
			'{% snippet path="src/a.ts" /%}\n',
			'utf8',
		);
	});

	afterEach(() => rmSync(repo, { recursive: true, force: true }));

	const build = (stale: { archival?: string[]; generated?: string[] } = {}) =>
		buildEdgeIndex({ repoRoot: repo, contentDirs: ['site/content'], ...stale });

	it('excludes nothing by default', () => {
		// The whole point of the config surface: no folder convention is
		// compiled in, so an unconfigured project sees every edge.
		const index = build();
		expect(index.edges).toHaveLength(3);
		expect(index.excluded).toEqual({ archivalPages: 0, generatedTargets: 0 });
	});

	it('drops every edge out of an archival page, and its touching answer with it', () => {
		const index = build({ archival: ['site/content/docs/migration/**'] });
		expect(index.edges.map((e) => e.referrer)).toEqual([
			'site/content/guide.md',
			'site/content/guide.md',
		]);
		expect(index.excluded.archivalPages).toBe(1);
		// Not merely filtered out of the ranking: "what documents src/a.ts"
		// must not answer with a record of what was once true.
		expect(edgesTouching(index, ['src/a.ts']).map((e) => e.referrer)).toEqual([
			'site/content/guide.md',
		]);
	});

	it('drops edges into a generated target but not out of it', () => {
		const index = build({ generated: ['CHANGELOG.md'] });
		expect(index.edges.map((e) => e.target)).toEqual(['src/a.ts', 'src/a.ts']);
		expect(index.excluded.generatedTargets).toBe(1);
	});

	it('counts what it removed, so the exclusions cannot grow silently', () => {
		const index = build({
			archival: ['site/content/docs/migration/'],
			generated: ['CHANGELOG.md'],
		});
		expect(index.excluded).toEqual({ archivalPages: 1, generatedTargets: 1 });
		expect(index.edges).toHaveLength(1);
	});
});

describe('the glob subset', () => {
	const m = (glob: string, path: string) => globToRegExp(glob).test(path);

	it('keeps * inside one segment', () => {
		expect(m('docs/*.md', 'docs/a.md')).toBe(true);
		expect(m('docs/*.md', 'docs/nested/a.md')).toBe(false);
	});

	it('spans segments with **', () => {
		expect(m('docs/**', 'docs/nested/deep/a.md')).toBe(true);
		expect(m('**/*.generated.json', 'a/b/c.generated.json')).toBe(true);
		// `**/` matches zero segments too, so the pattern still fires at the root.
		expect(m('**/*.generated.json', 'c.generated.json')).toBe(true);
	});

	it('reads a trailing slash as "everything beneath"', () => {
		expect(m('blog/', 'blog/2024/post.md')).toBe(true);
		expect(m('blog/', 'blog')).toBe(false);
	});

	it('treats regex metacharacters literally', () => {
		expect(m('a.ts', 'axts')).toBe(false);
		expect(m('a.ts', 'a.ts')).toBe(true);
	});

	it('matches nothing for an empty list', () => {
		// The dangerous default would be the other way round.
		expect(globMatcher([])('anything')).toBe(false);
		expect(globMatcher(undefined)('anything')).toBe(false);
	});
});

describe('resolveStaleSettings', () => {
	let repo: string;

	beforeEach(() => {
		repo = mkdtempSync(join(tmpdir(), 'refrakt-settings-'));
	});
	afterEach(() => rmSync(repo, { recursive: true, force: true }));

	const writeConfig = (config: unknown) =>
		writeFileSync(join(repo, 'refrakt.config.json'), JSON.stringify(config), 'utf8');

	it('takes content roots from every declared site', () => {
		writeConfig({
			sites: {
				main: { contentDir: './site/content', theme: 'lumina' },
				plan: { contentDir: './plan-site/content', theme: 'lumina' },
			},
		});
		expect(resolveStaleSettings(repo).contentDirs).toEqual(['site/content', 'plan-site/content']);
	});

	it('reads the singular and flat shapes too', () => {
		writeConfig({ site: { contentDir: 'content', theme: 'lumina' } });
		expect(resolveStaleSettings(repo).contentDirs).toEqual(['content']);
		writeConfig({ contentDir: 'legacy/content', theme: 'lumina' });
		expect(resolveStaleSettings(repo).contentDirs).toEqual(['legacy/content']);
	});

	it('defaults both exclusion lists to empty', () => {
		writeConfig({ site: { contentDir: 'content', theme: 'lumina' } });
		const settings = resolveStaleSettings(repo);
		expect(settings.archival).toEqual([]);
		expect(settings.generated).toEqual([]);
	});

	it('carries the stale section through', () => {
		writeConfig({
			site: { contentDir: 'content', theme: 'lumina' },
			stale: { archival: ['blog/**'], generated: ['CHANGELOG.md'] },
		});
		const settings = resolveStaleSettings(repo);
		expect(settings.archival).toEqual(['blog/**']);
		expect(settings.generated).toEqual(['CHANGELOG.md']);
	});

	it('refuses rather than guessing where content lives', () => {
		// "I could not look" and "nothing to report" are different answers.
		expect(() => resolveStaleSettings(repo)).toThrow(StaleConfigRefusal);
		writeConfig({ plan: { dir: 'plan' } });
		expect(() => resolveStaleSettings(repo)).toThrow(/no site with a contentDir/);
	});
});
