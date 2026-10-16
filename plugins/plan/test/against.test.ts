import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRefIds, collisionsFrom, branchPointPaths } from '../src/commands/against.js';
import { scanPlanFiles } from '../src/scanner.js';

let repo: string;

function git(...args: string[]): string {
	return execFileSync('git', args, {
		cwd: repo,
		encoding: 'utf-8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
}

function write(rel: string, body: string): void {
	const abs = join(repo, rel);
	mkdirSync(join(abs, '..'), { recursive: true });
	writeFileSync(abs, body);
}

const work = (id: string, title: string) =>
	`{% work id="${id}" status="ready" priority="low" %}\n\n# ${title}\n\n## Acceptance Criteria\n\n- [ ] x\n\n{% /work %}\n`;

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), 'refrakt-against-'));
	git('init', '-q', '-b', 'main');
	git('config', 'user.email', 'test@example.com');
	git('config', 'user.name', 'Test');
	write('plan/work/WORK-001-alpha.md', work('WORK-001', 'Alpha'));
	write('plan/work/WORK-002-beta.md', work('WORK-002', 'Beta'));
	git('add', '-A');
	git('commit', '-qm', 'base');
});

afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
});

function collisions(ref: string) {
	const index = readRefIds('plan', ref, repo);
	if (index.error) return { error: index.error, collisions: [] };
	const branchPoint = branchPointPaths('plan', ref, repo);
	if (branchPoint.error !== undefined) return { error: branchPoint.error, collisions: [] };
	const entities = scanPlanFiles(join(repo, 'plan'), { cache: false });
	return {
		error: undefined,
		collisions: collisionsFrom(index.refIds, entities, 'plan', branchPoint.paths, repo),
	};
}

describe('plan validate --against <ref> (SPEC-135 D8 / WORK-582)', () => {
	it('reports nothing when the branch adds no colliding ID', () => {
		write('plan/work/WORK-003-gamma.md', work('WORK-003', 'Gamma'));

		const { collisions: found } = collisions('main');
		expect(found).toEqual([]);
	});

	// The case plain duplicate detection cannot see: only ONE file claims the ID
	// in the working tree, so there is no local duplicate — the collision only
	// exists relative to the base, and only becomes a duplicate on merge.
	//
	// The base's file must still be there: two claimants surviving the merge is
	// what makes a reference ambiguous, and is this check's whole contract.
	it('catches an ID the base spends on a different surviving file', () => {
		write('plan/work/WORK-001-something-else.md', work('WORK-001', 'Something else'));

		const { collisions: found } = collisions('main');

		expect(found).toHaveLength(1);
		expect(found[0]).toMatchObject({
			id: 'WORK-001',
			file: 'work/WORK-001-something-else.md',
			refFile: 'work/WORK-001-alpha.md',
		});
	});

	// Previously flagged, and wrongly: the base's claimant is deleted, so the
	// merge leaves one file holding the ID and no reference is ambiguous. The old
	// rule compared slugs, so it fired on every title edit — the common case,
	// since the slug is derived from the title — and on `plan migrate filenames`
	// wholesale. Regression test for the real WORK-603 rename that hit it.
	it('does not flag a rename that changes the slug', () => {
		unlinkSync(join(repo, 'plan/work/WORK-001-alpha.md'));
		write('plan/work/WORK-001-alpha-revised-title.md', work('WORK-001', 'Alpha, revised title'));

		const { collisions: found } = collisions('main');
		expect(found).toEqual([]);
	});

	// An ID reused for a different entity also leaves one claimant, so it is not
	// a collision. It silently repoints every reference, which is a real hazard —
	// but one needing content rather than paths to detect, and not a merge
	// blocker. Pinned so the distinction is deliberate rather than incidental.
	it('does not flag an ID reused for a different entity', () => {
		unlinkSync(join(repo, 'plan/work/WORK-001-alpha.md'));
		write('plan/work/WORK-001-unrelated-thing.md', work('WORK-001', 'An unrelated thing'));

		const { collisions: found } = collisions('main');
		expect(found).toEqual([]);
	});

	it('does not flag a file that merely changed content', () => {
		write('plan/work/WORK-001-alpha.md', work('WORK-001', 'Alpha, revised'));

		const { collisions: found } = collisions('main');
		expect(found).toEqual([]);
	});

	// Subsumed by the base-path test above — kept because a directory move is a
	// distinct shape from a slug change and both must stay quiet.
	it('does not flag a renamed-but-same-slug file', () => {
		unlinkSync(join(repo, 'plan/work/WORK-001-alpha.md'));
		write('plan/specs/WORK-001-alpha.md', work('WORK-001', 'Alpha'));

		const { collisions: found } = collisions('main');
		expect(found).toEqual([]);
	});

	// "No collisions" and "I could not look" must never render the same way.
	// That conflation is the failure this whole milestone is about.
	it('fails loudly on a ref that does not resolve', () => {
		const { error, collisions: found } = collisions('no/such/ref');

		expect(error).toBeDefined();
		expect(error).toContain('Cannot resolve git ref');
		expect(error).toContain('Nothing was compared');
		expect(found).toEqual([]);
	});

	it('suggests fetching when the ref looks remote', () => {
		const { error } = collisions('origin/main');
		expect(error).toContain('git fetch origin main');
	});

	it('compares against an arbitrary ref, not just a branch name', () => {
		const sha = git('rev-parse', 'HEAD').trim();
		write('plan/work/WORK-001-other.md', work('WORK-001', 'Other'));

		const { collisions: found } = collisions(sha);
		expect(found).toHaveLength(1);
	});

	// BUG-040. Every test above compares against the branch's own base commit,
	// where a base file missing from the tree can only be one the branch
	// deleted. These advance the base after the branch point.
	describe('when the base moved on after the branch point', () => {
		function branchFromMain() {
			git('checkout', '-q', '-b', 'feature');
		}
		function onMain(fn: () => void, message: string) {
			git('checkout', '-q', 'main');
			fn();
			git('add', '-A');
			git('commit', '-qm', message);
			git('checkout', '-q', 'feature');
		}

		it('catches an ID both sides took after the branch point', () => {
			branchFromMain();
			write('plan/work/WORK-003-from-branch.md', work('WORK-003', 'From the branch'));
			git('add', '-A');
			git('commit', '-qm', 'branch takes WORK-003');
			onMain(
				() => write('plan/work/WORK-003-from-main.md', work('WORK-003', 'From main')),
				'main takes WORK-003',
			);

			const { error, collisions: found } = collisions('main');
			expect(error).toBeUndefined();
			expect(found).toEqual([
				{
					id: 'WORK-003',
					file: 'work/WORK-003-from-branch.md',
					refFile: 'work/WORK-003-from-main.md',
				},
			]);
		});

		it('catches it while the branch file is still uncommitted', () => {
			branchFromMain();
			onMain(
				() => write('plan/work/WORK-003-from-main.md', work('WORK-003', 'From main')),
				'main takes WORK-003',
			);
			write('plan/work/WORK-003-from-branch.md', work('WORK-003', 'From the branch'));

			expect(collisions('main').collisions).toHaveLength(1);
		});

		it('does not flag a file the base renamed after the branch point', () => {
			branchFromMain();
			onMain(() => {
				unlinkSync(join(repo, 'plan/work/WORK-001-alpha.md'));
				write('plan/work/WORK-001-alpha-renamed.md', work('WORK-001', 'Alpha'));
			}, 'main renames WORK-001');

			expect(collisions('main').collisions).toEqual([]);
		});

		it('does not flag a file the base deleted after the branch point', () => {
			branchFromMain();
			onMain(() => unlinkSync(join(repo, 'plan/work/WORK-002-beta.md')), 'main deletes WORK-002');

			expect(collisions('main').collisions).toEqual([]);
		});

		it('still forgives a rename on the branch while the base moved on', () => {
			branchFromMain();
			unlinkSync(join(repo, 'plan/work/WORK-001-alpha.md'));
			write('plan/work/WORK-001-alpha-retitled.md', work('WORK-001', 'Alpha, retitled'));
			onMain(
				() => write('plan/work/WORK-004-delta.md', work('WORK-004', 'Delta')),
				'main adds WORK-004',
			);

			expect(collisions('main').collisions).toEqual([]);
		});
	});

	it('fails loudly when the ref shares no history with HEAD', () => {
		git('checkout', '-q', '--orphan', 'unrelated');
		git('rm', '-rqf', '.');
		write('plan/work/WORK-001-x.md', work('WORK-001', 'X'));
		git('add', '-A');
		git('commit', '-qm', 'unrelated root');
		git('checkout', '-q', 'main');

		const { error, collisions: found } = collisions('unrelated');
		expect(error).toContain('No merge-base');
		expect(found).toEqual([]);
	});
});
