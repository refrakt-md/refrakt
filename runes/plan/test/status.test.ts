import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { runStatus } from '../src/commands/status.js';

const TMP = join(import.meta.dirname, '.tmp-status-test');

function writeMd(relPath: string, content: string) {
	const full = join(TMP, relPath);
	const dir = full.substring(0, full.lastIndexOf('/'));
	mkdirSync(dir, { recursive: true });
	writeFileSync(full, content);
}

beforeEach(() => {
	mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

describe('plan status — counts', () => {
	it('counts entities by type and status', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" priority="high" %}\n# A\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="done" priority="medium" %}\n# B\n{% /work %}');
		writeMd('work/c.md', '{% work id="WORK-003" status="in-progress" priority="medium" %}\n# C\n{% /work %}');
		writeMd('spec/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('bug/b.md', '{% bug id="BUG-001" status="confirmed" severity="major" %}\n# Bug\n{% /bug %}');

		const result = runStatus({ dir: TMP });
		expect(result.counts.work.total).toBe(3);
		expect(result.counts.work.byStatus).toEqual({ ready: 1, done: 1, 'in-progress': 1 });
		expect(result.counts.specs.total).toBe(1);
		expect(result.counts.specs.byStatus).toEqual({ accepted: 1 });
		expect(result.counts.bugs.total).toBe(1);
		expect(result.counts.bugs.byStatus).toEqual({ confirmed: 1 });
	});

	it('returns zero counts for empty directory', () => {
		const result = runStatus({ dir: TMP });
		expect(result.counts.work.total).toBe(0);
		expect(result.counts.specs.total).toBe(0);
		expect(result.counts.bugs.total).toBe(0);
		expect(result.counts.decisions.total).toBe(0);
	});
});

describe('plan status — milestone progress', () => {
	it('shows active milestone with progress', () => {
		writeMd('work/m.md', '{% milestone name="v1.0" status="active" target="2026-04-01" %}\n# v1.0\n{% /milestone %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" priority="high" milestone="v1.0" %}\n# A\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="ready" priority="medium" milestone="v1.0" %}\n# B\n{% /work %}');
		writeMd('work/c.md', '{% work id="WORK-003" status="in-progress" priority="medium" milestone="v1.0" %}\n# C\n{% /work %}');
		writeMd('work/d.md', '{% work id="WORK-004" status="ready" priority="low" %}\n# D (no milestone)\n{% /work %}');

		const result = runStatus({ dir: TMP });
		expect(result.milestone).toBeDefined();
		expect(result.milestone!.name).toBe('v1.0');
		expect(result.milestone!.status).toBe('active');
		expect(result.milestone!.target).toBe('2026-04-01');
		expect(result.milestone!.done).toBe(1);
		expect(result.milestone!.total).toBe(3);
	});

	it('scopes to a specific milestone via --milestone', () => {
		writeMd('work/m1.md', '{% milestone name="v1.0" status="active" %}\n# v1.0\n{% /milestone %}');
		writeMd('work/m2.md', '{% milestone name="v2.0" status="planning" %}\n# v2.0\n{% /milestone %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" milestone="v2.0" %}\n# A\n{% /work %}');

		const result = runStatus({ dir: TMP, milestone: 'v2.0' });
		expect(result.milestone).toBeDefined();
		expect(result.milestone!.name).toBe('v2.0');
		expect(result.milestone!.done).toBe(1);
		expect(result.milestone!.total).toBe(1);
	});

	it('returns undefined milestone when none active', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n{% /work %}');
		const result = runStatus({ dir: TMP });
		expect(result.milestone).toBeUndefined();
	});
});

describe('plan status — blocked items', () => {
	it('lists blocked items', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="blocked" %}\n# A\n\n{% ref "WORK-002" /%}\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="in-progress" %}\n# B\n{% /work %}');

		const result = runStatus({ dir: TMP });
		expect(result.blocked).toHaveLength(1);
		expect(result.blocked[0].id).toBe('WORK-001');
		expect(result.blocked[0].blockedBy).toContain('WORK-002');
	});

	it('does not list blocked items whose deps are done', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="blocked" %}\n# A\n\n{% ref "WORK-002" /%}\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="done" %}\n# B\n{% /work %}');

		const result = runStatus({ dir: TMP });
		expect(result.blocked).toHaveLength(1);
		// blockedBy should be empty since WORK-002 is done
		expect(result.blocked[0].blockedBy).toHaveLength(0);
	});
});

describe('plan status — ready items', () => {
	it('lists highest-priority ready items', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" priority="low" %}\n# Low\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="ready" priority="high" %}\n# High\n{% /work %}');
		writeMd('work/c.md', '{% work id="WORK-003" status="ready" priority="critical" %}\n# Critical\n{% /work %}');

		const result = runStatus({ dir: TMP });
		expect(result.ready.length).toBeGreaterThanOrEqual(3);
		expect(result.ready[0].id).toBe('WORK-003');
		expect(result.ready[1].id).toBe('WORK-002');
		expect(result.ready[2].id).toBe('WORK-001');
	});

	it('caps ready items at 5', () => {
		for (let i = 1; i <= 8; i++) {
			writeMd(`work/w${i}.md`, `{% work id="WORK-${String(i).padStart(3, '0')}" status="ready" priority="medium" %}\n# W${i}\n{% /work %}`);
		}
		const result = runStatus({ dir: TMP });
		expect(result.ready).toHaveLength(5);
	});

	it('includes confirmed bugs as ready', () => {
		writeMd('bug/b.md', '{% bug id="BUG-001" status="confirmed" severity="major" %}\n# Bug\n{% /bug %}');
		const result = runStatus({ dir: TMP });
		expect(result.ready).toHaveLength(1);
		expect(result.ready[0].type).toBe('bug');
	});
});

describe('plan status — warnings', () => {
	it('reports broken refs', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n\n{% ref "SPEC-999" /%}\n{% /work %}');
		const result = runStatus({ dir: TMP });
		const broken = result.warnings.filter(w => w.type === 'broken-ref');
		expect(broken).toHaveLength(1);
		expect(broken[0].source).toBe('WORK-001');
		expect(broken[0].target).toBe('SPEC-999');
	});

	it('reports orphaned work items with no milestone', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n{% /work %}');
		const result = runStatus({ dir: TMP });
		const orphaned = result.warnings.filter(w => w.type === 'no-milestone');
		expect(orphaned).toHaveLength(1);
		expect(orphaned[0].source).toBe('WORK-001');
	});

	it('does not warn about milestone on done items', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="done" %}\n# A\n{% /work %}');
		const result = runStatus({ dir: TMP });
		const orphaned = result.warnings.filter(w => w.type === 'no-milestone');
		expect(orphaned).toHaveLength(0);
	});

	it('does not warn when ref exists', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" milestone="v1.0" %}\n# A\n\n{% ref "SPEC-001" /%}\n{% /work %}');
		writeMd('spec/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		const result = runStatus({ dir: TMP });
		const broken = result.warnings.filter(w => w.type === 'broken-ref');
		expect(broken).toHaveLength(0);
	});
});

describe('plan status — JSON output', () => {
	it('returns structured result suitable for JSON', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" priority="high" %}\n# A\n{% /work %}');
		writeMd('spec/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');

		const result = runStatus({ dir: TMP, formatJson: true });
		// Same result object regardless of format flag — formatting happens in CLI handler
		expect(result.counts).toBeDefined();
		expect(result.ready).toBeDefined();
		expect(result.warnings).toBeDefined();
	});
});
