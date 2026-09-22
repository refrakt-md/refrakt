import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runMigrateIds } from '../src/commands/migrate-ids.js';

let dir: string;

function write(rel: string, body: string): void {
	const abs = join(dir, rel);
	mkdirSync(join(abs, '..'), { recursive: true });
	writeFileSync(abs, body);
}

const work = (id: string, title: string, extra = '') =>
	`{% work id="${id}" status="ready" priority="low"${extra} %}\n\n# ${title}\n\n## Acceptance Criteria\n\n- [ ] x\n\n{% /work %}\n`;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'refrakt-migrate-ids-'));
	mkdirSync(join(dir, 'work'), { recursive: true });
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

describe('plan migrate ids (SPEC-135 D8 / WORK-582)', () => {
	it('does nothing when there are no duplicates', () => {
		write('work/WORK-001-a.md', work('WORK-001', 'A'));
		write('work/WORK-002-b.md', work('WORK-002', 'B'));

		const result = runMigrateIds({ dir });
		expect(result.planned).toEqual([]);
		expect(result.refused).toEqual([]);
		expect(result.exitCode).toBe(0);
	});

	describe('the provable case — nothing references the colliding ID', () => {
		it('plans a renumber to the next free ID, dry-run by default', () => {
			write('work/WORK-001-alpha.md', work('WORK-001', 'Alpha'));
			write('work/WORK-001-beta.md', work('WORK-001', 'Beta'));

			const result = runMigrateIds({ dir });

			expect(result.mode).toBe('dry-run');
			expect(result.planned).toHaveLength(1);
			expect(result.planned[0]).toMatchObject({
				from: 'WORK-001',
				to: 'WORK-002',
				file: 'work/WORK-001-beta.md',
				toFile: 'work/WORK-002-beta.md',
			});
			// Dry run — nothing on disk moved.
			expect(existsSync(join(dir, 'work/WORK-001-beta.md'))).toBe(true);
			expect(result.applied).toEqual([]);
		});

		it('renumbers the id, the filename and self-references under --apply', () => {
			write('work/WORK-001-alpha.md', work('WORK-001', 'Alpha'));
			write(
				'work/WORK-001-beta.md',
				`{% work id="WORK-001" status="ready" source="SPEC-135" %}\n\n# Beta\n\nSelf: {% ref "WORK-001" /%}\n\n## Acceptance Criteria\n\n- [ ] x\n\n{% /work %}\n`,
			);

			const result = runMigrateIds({ dir, apply: true });

			expect(result.applied).toHaveLength(1);
			expect(existsSync(join(dir, 'work/WORK-001-beta.md'))).toBe(false);

			const moved = readFileSync(join(dir, 'work/WORK-002-beta.md'), 'utf-8');
			expect(moved).toContain('id="WORK-002"');
			expect(moved).toContain('{% ref "WORK-002" /%}');
			// A different entity's ID is left alone.
			expect(moved).toContain('source="SPEC-135"');

			// The kept claimant is untouched.
			expect(readFileSync(join(dir, 'work/WORK-001-alpha.md'), 'utf-8')).toContain('id="WORK-001"');
		});

		// Regression. The rewrite patterns consume the closing quote via a
		// backreference; an earlier version did not put it back, producing
		// `id="WORK-002 status="` — malformed, in every file it touched, and
		// invisible to a dry run because only --apply writes.
		it('keeps quotes balanced in every rewritten reference', () => {
			write('work/WORK-001-alpha.md', work('WORK-001', 'Alpha'));
			write(
				'work/WORK-001-beta.md',
				`{% work id="WORK-001" status="ready" priority="low" %}\n\n# Beta\n\n{% ref "WORK-001" /%} and {% xref "WORK-001" /%}\n\n## Acceptance Criteria\n\n- [ ] x\n\n{% /work %}\n`,
			);

			runMigrateIds({ dir, apply: true });
			const moved = readFileSync(join(dir, 'work/WORK-002-beta.md'), 'utf-8');

			expect(moved).toContain('id="WORK-002"');
			expect(moved).toContain('status="ready"');
			expect(moved).toContain('{% ref "WORK-002" /%}');
			expect(moved).toContain('{% xref "WORK-002" /%}');
			// Every double quote is paired.
			expect((moved.match(/"/g) ?? []).length % 2).toBe(0);
		});

		it('is idempotent — a second run finds nothing', () => {
			write('work/WORK-001-alpha.md', work('WORK-001', 'Alpha'));
			write('work/WORK-001-beta.md', work('WORK-001', 'Beta'));

			runMigrateIds({ dir, apply: true });
			const second = runMigrateIds({ dir });

			expect(second.planned).toEqual([]);
			expect(second.refused).toEqual([]);
		});

		it('picks which file moves deterministically', () => {
			write('work/WORK-001-alpha.md', work('WORK-001', 'Alpha'));
			write('work/WORK-001-beta.md', work('WORK-001', 'Beta'));

			const a = runMigrateIds({ dir });
			const b = runMigrateIds({ dir });
			expect(a.planned[0]!.file).toBe(b.planned[0]!.file);
		});
	});

	// D8 — "resolve only when provable". Once two files share an ID, every
	// reference to it is ambiguous, and repointing one at the wrong entity is
	// silent and permanent.
	describe('refuses rather than guessing', () => {
		it('refuses when another file references the colliding ID', () => {
			write('work/WORK-001-alpha.md', work('WORK-001', 'Alpha'));
			write('work/WORK-001-beta.md', work('WORK-001', 'Beta'));
			write(
				'work/WORK-050-referrer.md',
				work('WORK-050', 'Referrer').replace('- [ ] x', '- [ ] see {% ref "WORK-001" /%}'),
			);

			const result = runMigrateIds({ dir });

			expect(result.planned).toEqual([]);
			expect(result.refused).toHaveLength(1);
			expect(result.exitCode).toBe(1);
		});

		it('names the references that blocked it, with file and line', () => {
			write('work/WORK-001-alpha.md', work('WORK-001', 'Alpha'));
			write('work/WORK-001-beta.md', work('WORK-001', 'Beta'));
			write(
				'work/WORK-050-referrer.md',
				work('WORK-050', 'Referrer').replace('- [ ] x', '- [ ] see {% ref "WORK-001" /%}'),
			);

			const { refused } = runMigrateIds({ dir });
			const blocked = refused[0]!.ambiguousRefs;

			expect(blocked).toHaveLength(1);
			expect(blocked[0]!.file).toBe('work/WORK-050-referrer.md');
			expect(typeof blocked[0]!.line).toBe('number');
			expect(blocked[0]!.text).toContain('WORK-001');
		});

		it('counts a `source=` attribute as an ambiguous reference', () => {
			write('work/WORK-001-alpha.md', work('WORK-001', 'Alpha'));
			write('work/WORK-001-beta.md', work('WORK-001', 'Beta'));
			write('work/WORK-050-child.md', work('WORK-050', 'Child', ' source="WORK-001"'));

			const { refused, planned } = runMigrateIds({ dir });
			expect(planned).toEqual([]);
			expect(refused[0]!.ambiguousRefs[0]!.text).toContain('source="WORK-001"');
		});

		it('changes nothing on disk when it refuses, even under --apply', () => {
			write('work/WORK-001-alpha.md', work('WORK-001', 'Alpha'));
			write('work/WORK-001-beta.md', work('WORK-001', 'Beta'));
			write(
				'work/WORK-050-referrer.md',
				work('WORK-050', 'Referrer').replace('- [ ] x', '- [ ] see {% ref "WORK-001" /%}'),
			);

			runMigrateIds({ dir, apply: true });

			expect(existsSync(join(dir, 'work/WORK-001-beta.md'))).toBe(true);
			expect(readFileSync(join(dir, 'work/WORK-001-beta.md'), 'utf-8')).toContain('id="WORK-001"');
		});
	});
});
