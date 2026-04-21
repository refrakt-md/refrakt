import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { runCreate } from '../src/commands/create.js';
import { runMigrateFilenames } from '../src/commands/migrate.js';

const TMP = join(import.meta.dirname, '.tmp-migrate-test');

beforeEach(() => {
	mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

/**
 * Write a plan file with the given filename and frontmatter id. Uses a
 * minimal but valid rune so the scanner picks it up.
 */
function seedFile(relPath: string, runeType: string, id: string, title = 'Example'): void {
	const full = join(TMP, relPath);
	mkdirSync(join(TMP, relPath, '..'), { recursive: true });
	writeFileSync(full, `{% ${runeType} id="${id}" %}\n\n# ${title}\n\n{% /${runeType} %}\n`);
}

describe('plan migrate filenames — dry run (default)', () => {
	it('plans renames for every unprefixed auto-ID file', () => {
		seedFile('work/plan-validate-command.md', 'work', 'WORK-033');
		seedFile('specs/cross-page-pipeline.md', 'spec', 'SPEC-024');
		seedFile('decisions/rune-package-layouts.md', 'decision', 'ADR-005');

		const result = runMigrateFilenames({ dir: TMP });

		expect(result.mode).toBe('dry-run');
		expect(result.scanned).toBe(3);
		expect(result.planned).toHaveLength(3);
		expect(result.applied).toHaveLength(0);
		expect(result.planned.map(p => p.to).sort()).toEqual([
			'decisions/ADR-005-rune-package-layouts.md',
			'specs/SPEC-024-cross-page-pipeline.md',
			'work/WORK-033-plan-validate-command.md',
		]);

		// Dry run must not touch the filesystem.
		expect(existsSync(join(TMP, 'work/plan-validate-command.md'))).toBe(true);
		expect(existsSync(join(TMP, 'work/WORK-033-plan-validate-command.md'))).toBe(false);
	});

	it('skips files already matching the convention', () => {
		seedFile('work/WORK-001-already-prefixed.md', 'work', 'WORK-001');

		const result = runMigrateFilenames({ dir: TMP });

		expect(result.planned).toHaveLength(0);
		expect(result.skipped.alreadyCorrect).toBe(1);
	});

	it('skips milestones entirely (they use semver names)', () => {
		writeFileSync(join(TMP, 'v1.0.0.md'), `{% milestone name="v1.0.0" status="active" %}\n# v1.0\n{% /milestone %}\n`);
		mkdirSync(join(TMP, 'milestones'), { recursive: true });
		writeFileSync(
			join(TMP, 'milestones/v2.0.0.md'),
			`{% milestone name="v2.0.0" status="planning" %}\n# v2.0\n{% /milestone %}\n`
		);

		const result = runMigrateFilenames({ dir: TMP });

		expect(result.planned).toHaveLength(0);
		expect(result.skipped.milestones).toBe(2);
	});

	it('re-prefixes files with a wrong ID prefix in their name', () => {
		seedFile('work/WORK-999-mislabeled.md', 'work', 'WORK-012');

		const result = runMigrateFilenames({ dir: TMP });

		expect(result.planned).toEqual([
			{ id: 'WORK-012', from: 'work/WORK-999-mislabeled.md', to: 'work/WORK-012-mislabeled.md' },
		]);
	});

	it('reports files with missing frontmatter IDs', () => {
		mkdirSync(join(TMP, 'work'), { recursive: true });
		writeFileSync(join(TMP, 'work/orphan.md'), `{% work status="draft" %}\n# Orphan\n{% /work %}\n`);

		const result = runMigrateFilenames({ dir: TMP });

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].reason).toContain('missing frontmatter id');
		expect(result.exitCode).toBe(1);
	});

	it('flags collisions between planned renames', () => {
		seedFile('work/WORK-900-a-foo.md', 'work', 'WORK-001');
		seedFile('work/WORK-901-a-foo.md', 'work', 'WORK-001');

		const result = runMigrateFilenames({ dir: TMP });

		// First rename is planned, second collides with the first's target.
		expect(result.planned).toHaveLength(1);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].reason).toContain('collides');
		expect(result.exitCode).toBe(1);
	});
});

describe('plan migrate filenames — apply', () => {
	it('renames files on disk when --apply is set', () => {
		seedFile('work/plan-validate-command.md', 'work', 'WORK-033');
		seedFile('specs/cross-page-pipeline.md', 'spec', 'SPEC-024');

		const result = runMigrateFilenames({ dir: TMP, apply: true });

		expect(result.mode).toBe('apply');
		expect(result.applied).toHaveLength(2);
		expect(result.errors).toHaveLength(0);

		expect(existsSync(join(TMP, 'work/plan-validate-command.md'))).toBe(false);
		expect(existsSync(join(TMP, 'work/WORK-033-plan-validate-command.md'))).toBe(true);
		expect(existsSync(join(TMP, 'specs/cross-page-pipeline.md'))).toBe(false);
		expect(existsSync(join(TMP, 'specs/SPEC-024-cross-page-pipeline.md'))).toBe(true);
	});

	it('preserves file contents across rename', () => {
		const body = `{% work id="WORK-077" %}\n\n# Keep Me\n\n## Approach\nStuff.\n\n{% /work %}\n`;
		mkdirSync(join(TMP, 'work'), { recursive: true });
		writeFileSync(join(TMP, 'work/keep-me.md'), body);

		runMigrateFilenames({ dir: TMP, apply: true });

		const renamed = readFileSync(join(TMP, 'work/WORK-077-keep-me.md'), 'utf-8');
		expect(renamed).toBe(body);
	});

	it('handles a mix of prefixed, unprefixed, and milestone files', () => {
		seedFile('work/WORK-010-already-good.md', 'work', 'WORK-010');
		seedFile('work/needs-renaming.md', 'work', 'WORK-011');
		writeFileSync(
			join(TMP, 'v1.md'),
			`{% milestone name="v1" status="active" %}\n# v1\n{% /milestone %}\n`
		);

		const result = runMigrateFilenames({ dir: TMP, apply: true });

		expect(result.applied).toHaveLength(1);
		expect(result.applied[0].to).toBe('work/WORK-011-needs-renaming.md');
		expect(result.skipped.alreadyCorrect).toBe(1);
		expect(result.skipped.milestones).toBe(1);
	});
});

describe('plan migrate filenames — git mode', () => {
	function initGitRepo(dir: string): void {
		execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
		execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
		execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
		execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir });
	}

	it('uses git mv to preserve history when --git is set', () => {
		initGitRepo(TMP);
		seedFile('work/plan-validate-command.md', 'work', 'WORK-033');
		execFileSync('git', ['add', '.'], { cwd: TMP });
		execFileSync('git', ['commit', '-q', '-m', 'initial'], { cwd: TMP });

		const result = runMigrateFilenames({ dir: TMP, apply: true, useGit: true });

		expect(result.errors).toEqual([]);
		expect(result.applied).toHaveLength(1);
		expect(existsSync(join(TMP, 'work/WORK-033-plan-validate-command.md'))).toBe(true);

		// git should report the change as a rename (with `-M` threshold).
		const status = execFileSync('git', ['status', '--porcelain'], { cwd: TMP }).toString();
		expect(status).toMatch(/^R/m);
	});
});
