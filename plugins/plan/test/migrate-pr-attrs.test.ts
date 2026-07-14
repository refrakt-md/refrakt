import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { runMigratePrAttrs } from '../src/commands/migrate.js';

const TMP = join(import.meta.dirname, '.tmp-pr-attrs-test');

function git(...args: string[]): string {
	return execFileSync('git', args, { cwd: TMP, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
}

function writeWork(id: string, status: string, extra = ''): void {
	mkdirSync(join(TMP, 'work'), { recursive: true });
	writeFileSync(
		join(TMP, 'work', `${id}.md`),
		`{% work id="${id}" status="${status}"${extra} %}\n\n# ${id}\n\n{% /work %}\n`,
	);
}

beforeEach(() => {
	rmSync(TMP, { recursive: true, force: true });
	mkdirSync(TMP, { recursive: true });
	git('init', '-q', '-b', 'main');
	git('config', 'user.email', 'test@example.com');
	git('config', 'user.name', 'Test');
	git('remote', 'add', 'origin', 'git@github.com:acme/widget.git');
});

afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

/** Land a work item as done via a feature branch merged with a PR-style merge
 *  commit, mirroring GitHub's default merge message. */
function landViaPr(id: string, prNumber: number): void {
	const branch = `feat-${id}-${prNumber}`;
	git('checkout', '-q', '-b', branch);
	writeWork(id, 'done');
	git('add', '-A');
	git('commit', '-q', '-m', `${id}: done`);
	git('checkout', '-q', 'main');
	git('merge', '--no-ff', '-q', '-m', `Merge pull request #${prNumber} from acme/${branch}`, branch);
}

describe('migrate pr-attrs — git backfill (WORK-498)', () => {
	it('resolves a PR merge and reports the mapping (dry-run)', () => {
		writeWork('WORK-001', 'ready');
		git('add', '-A');
		git('commit', '-q', '-m', 'seed WORK-001');
		landViaPr('WORK-001', 42);

		const result = runMigratePrAttrs({ dir: TMP });
		expect(result.mode).toBe('dry-run');
		expect(result.repoSlug).toBe('acme/widget');
		expect(result.resolved).toEqual([
			{ id: 'WORK-001', file: 'work/WORK-001.md', pr: 'acme/widget#42' },
		]);
		expect(result.applied).toHaveLength(0);
		// Dry run must not touch the file.
		expect(readFileSync(join(TMP, 'work/WORK-001.md'), 'utf8')).not.toContain('pr=');
	});

	it('writes the pr attribute on --apply', () => {
		writeWork('WORK-002', 'ready');
		git('add', '-A');
		git('commit', '-q', '-m', 'seed WORK-002');
		landViaPr('WORK-002', 7);

		const result = runMigratePrAttrs({ dir: TMP, apply: true });
		expect(result.applied).toEqual([
			{ id: 'WORK-002', file: 'work/WORK-002.md', pr: 'acme/widget#7' },
		]);
		const content = readFileSync(join(TMP, 'work/WORK-002.md'), 'utf8');
		expect(content).toContain('pr="acme/widget#7"');
		expect(content).toMatch(/id="WORK-002"\s+pr="acme\/widget#7"/);
	});

	it('leaves items already carrying a pr untouched', () => {
		writeWork('WORK-003', 'done', ' pr="acme/widget#1"');
		git('add', '-A');
		git('commit', '-q', '-m', 'seed WORK-003 with pr');

		const result = runMigratePrAttrs({ dir: TMP });
		expect(result.resolved).toHaveLength(0);
		expect(result.unresolved).toHaveLength(0);
	});

	it('reports a direct-to-main done flip as unresolved', () => {
		writeWork('WORK-004', 'ready');
		git('add', '-A');
		git('commit', '-q', '-m', 'seed WORK-004');
		writeWork('WORK-004', 'done'); // flipped directly on main, no PR merge
		git('add', '-A');
		git('commit', '-q', '-m', 'WORK-004: done directly');

		const result = runMigratePrAttrs({ dir: TMP });
		expect(result.resolved).toHaveLength(0);
		expect(result.unresolved.map(u => u.id)).toContain('WORK-004');
	});

	it('skips an item flipped to done via two different PRs (ambiguous)', () => {
		writeWork('WORK-005', 'ready');
		git('add', '-A');
		git('commit', '-q', '-m', 'seed WORK-005');
		landViaPr('WORK-005', 101);
		// Reopen on main, then land as done again via a different PR.
		writeWork('WORK-005', 'ready');
		git('add', '-A');
		git('commit', '-q', '-m', 'WORK-005: reopen');
		landViaPr('WORK-005', 102);

		const result = runMigratePrAttrs({ dir: TMP });
		expect(result.resolved).toHaveLength(0);
		expect(result.skipped.map(s => s.id)).toContain('WORK-005');
	});

	it('reports no origin remote gracefully', () => {
		writeWork('WORK-006', 'done');
		git('add', '-A');
		git('commit', '-q', '-m', 'seed');
		git('remote', 'remove', 'origin');

		const result = runMigratePrAttrs({ dir: TMP });
		expect(result.repoSlug).toBeNull();
		expect(result.unresolved.map(u => u.id)).toContain('WORK-006');
	});
});
