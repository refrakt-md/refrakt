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
import {
	buildEdgeIndex,
	edgesTouching,
	GitScanRefusal,
	indexEdges,
	rankEdges,
	scanHistory,
} from '../src/edges/index.js';
import { dedupeEdges, extractEmbeddedEdges } from '../src/edges/extract.js';

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
		// exists it wins. Inert until WORK-591 makes markers writable.
		expect(rankEdges(index, scanHistory(repo)).ranked).toEqual([]);
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
