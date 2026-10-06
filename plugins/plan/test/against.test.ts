import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRefIds, collisionsFrom } from '../src/commands/against.js';
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
	const entities = scanPlanFiles(join(repo, 'plan'), { cache: false });
	return { error: undefined, collisions: collisionsFrom(index.refIds, entities, 'plan', repo) };
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
});
