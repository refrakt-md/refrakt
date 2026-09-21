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
	return { error: undefined, collisions: collisionsFrom(index.refIds, entities, 'plan') };
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
	it('catches an ID the base spends on a different file', () => {
		unlinkSync(join(repo, 'plan/work/WORK-001-alpha.md'));
		write('plan/work/WORK-001-something-else.md', work('WORK-001', 'Something else'));

		const { collisions: found } = collisions('main');

		expect(found).toHaveLength(1);
		expect(found[0]).toMatchObject({
			id: 'WORK-001',
			file: 'work/WORK-001-something-else.md',
			refFile: 'work/WORK-001-alpha.md',
		});
	});

	it('does not flag a file that merely changed content', () => {
		write('plan/work/WORK-001-alpha.md', work('WORK-001', 'Alpha, revised'));

		const { collisions: found } = collisions('main');
		expect(found).toEqual([]);
	});

	// A slug rename is the same entity moving, not a second claimant. Flagging
	// it would make the check cry wolf on ordinary editing.
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
		unlinkSync(join(repo, 'plan/work/WORK-001-alpha.md'));
		write('plan/work/WORK-001-other.md', work('WORK-001', 'Other'));

		const { collisions: found } = collisions(sha);
		expect(found).toHaveLength(1);
	});
});
