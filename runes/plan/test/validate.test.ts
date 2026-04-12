import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { runValidate } from '../src/commands/validate.js';

const TMP = join(import.meta.dirname, '.tmp-validate-test');

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

describe('validate — broken refs', () => {
	it('detects broken ref links', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n\n{% ref "SPEC-999" /%}\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const broken = result.issues.filter(i => i.type === 'broken-ref');
		expect(broken).toHaveLength(1);
		expect(broken[0].severity).toBe('error');
		expect(broken[0].source).toBe('WORK-001');
		expect(broken[0].target).toBe('SPEC-999');
	});

	it('does not report valid refs', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n\n{% ref "SPEC-001" /%}\n{% /work %}');
		writeMd('spec/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		const result = runValidate({ dir: TMP });
		const broken = result.issues.filter(i => i.type === 'broken-ref');
		expect(broken).toHaveLength(0);
	});
});

describe('validate — duplicate IDs', () => {
	it('detects duplicate IDs', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-001" status="done" %}\n# B\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const dupes = result.issues.filter(i => i.type === 'duplicate-id');
		expect(dupes).toHaveLength(1);
		expect(dupes[0].severity).toBe('error');
	});

	it('does not flag unique IDs', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="done" %}\n# B\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const dupes = result.issues.filter(i => i.type === 'duplicate-id');
		expect(dupes).toHaveLength(0);
	});
});

describe('validate — invalid attributes', () => {
	it('detects invalid status for work item', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="working" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const invalid = result.issues.filter(i => i.type === 'invalid-status');
		expect(invalid).toHaveLength(1);
		expect(invalid[0].severity).toBe('error');
		expect(invalid[0].message).toContain('working');
	});

	it('detects invalid status for bug', () => {
		writeMd('bug/a.md', '{% bug id="BUG-001" status="open" severity="major" %}\n# B\n{% /bug %}');
		const result = runValidate({ dir: TMP });
		const invalid = result.issues.filter(i => i.type === 'invalid-status');
		expect(invalid).toHaveLength(1);
	});

	it('detects invalid status for spec', () => {
		writeMd('spec/a.md', '{% spec id="SPEC-001" status="approved" %}\n# S\n{% /spec %}');
		const result = runValidate({ dir: TMP });
		const invalid = result.issues.filter(i => i.type === 'invalid-status');
		expect(invalid).toHaveLength(1);
	});

	it('detects invalid priority', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" priority="urgent" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const invalid = result.issues.filter(i => i.type === 'invalid-priority');
		expect(invalid).toHaveLength(1);
		expect(invalid[0].severity).toBe('error');
	});

	it('detects invalid severity', () => {
		writeMd('bug/a.md', '{% bug id="BUG-001" status="reported" severity="blocker" %}\n# B\n{% /bug %}');
		const result = runValidate({ dir: TMP });
		const invalid = result.issues.filter(i => i.type === 'invalid-severity');
		expect(invalid).toHaveLength(1);
		expect(invalid[0].severity).toBe('error');
	});

	it('accepts cosmetic severity (not trivial)', () => {
		writeMd('bug/a.md', '{% bug id="BUG-001" status="reported" severity="cosmetic" %}\n# B\n{% /bug %}');
		const result = runValidate({ dir: TMP });
		const invalid = result.issues.filter(i => i.type === 'invalid-severity');
		expect(invalid).toHaveLength(0);
	});

	it('detects invalid complexity', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" complexity="high" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const invalid = result.issues.filter(i => i.type === 'invalid-complexity');
		expect(invalid).toHaveLength(1);
		expect(invalid[0].severity).toBe('error');
		expect(invalid[0].message).toContain('high');
	});

	it('accepts valid complexity values', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" complexity="moderate" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const invalid = result.issues.filter(i => i.type === 'invalid-complexity');
		expect(invalid).toHaveLength(0);
	});

	it('accepts pending status for work items', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="pending" milestone="v1.0" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const invalid = result.issues.filter(i => i.type === 'invalid-status');
		expect(invalid).toHaveLength(0);
	});

	it('accepts valid attributes', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" priority="high" %}\n# A\n{% /work %}');
		writeMd('bug/b.md', '{% bug id="BUG-001" status="confirmed" severity="major" %}\n# B\n{% /bug %}');
		writeMd('spec/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('decision/d.md', '{% decision id="ADR-001" status="proposed" %}\n# D\n{% /decision %}');
		const result = runValidate({ dir: TMP });
		const invalid = result.issues.filter(i =>
			i.type === 'invalid-status' || i.type === 'invalid-priority' || i.type === 'invalid-severity'
		);
		expect(invalid).toHaveLength(0);
	});
});

describe('validate — source references', () => {
	it('detects broken source references', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" source="SPEC-999" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const broken = result.issues.filter(i => i.type === 'broken-source');
		expect(broken).toHaveLength(1);
		expect(broken[0].severity).toBe('error');
		expect(broken[0].target).toBe('SPEC-999');
	});

	it('validates comma-separated source IDs individually', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" source="SPEC-001,ADR-999" %}\n# A\n{% /work %}');
		writeMd('spec/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		const result = runValidate({ dir: TMP });
		const broken = result.issues.filter(i => i.type === 'broken-source');
		expect(broken).toHaveLength(1);
		expect(broken[0].target).toBe('ADR-999');
	});

	it('does not report valid source references', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" source="SPEC-001,ADR-001" %}\n# A\n{% /work %}');
		writeMd('spec/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('decision/d.md', '{% decision id="ADR-001" status="accepted" %}\n# D\n{% /decision %}');
		const result = runValidate({ dir: TMP });
		const broken = result.issues.filter(i => i.type === 'broken-source');
		expect(broken).toHaveLength(0);
	});
});

describe('validate — milestone references', () => {
	it('warns about references to non-existent milestones', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" milestone="v99.0" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'unknown-milestone');
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe('warning');
		expect(issues[0].target).toBe('v99.0');
	});

	it('does not warn when milestone exists', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" milestone="v1.0" %}\n# A\n{% /work %}');
		writeMd('milestone/m.md', '{% milestone name="v1.0" status="active" %}\n# v1.0\n{% /milestone %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'unknown-milestone');
		expect(issues).toHaveLength(0);
	});
});

describe('validate — circular dependencies', () => {
	it('detects circular dependency between two items', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n\n{% ref "WORK-002" /%}\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="ready" %}\n# B\n\n{% ref "WORK-001" /%}\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const circular = result.issues.filter(i => i.type === 'circular-dependency');
		expect(circular).toHaveLength(1);
		expect(circular[0].severity).toBe('error');
		expect(circular[0].message).toContain('Circular dependency');
	});

	it('detects three-way circular dependency', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n\n{% ref "WORK-002" /%}\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="ready" %}\n# B\n\n{% ref "WORK-003" /%}\n{% /work %}');
		writeMd('work/c.md', '{% work id="WORK-003" status="ready" %}\n# C\n\n{% ref "WORK-001" /%}\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const circular = result.issues.filter(i => i.type === 'circular-dependency');
		expect(circular.length).toBeGreaterThanOrEqual(1);
	});

	it('does not flag acyclic dependencies', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n\n{% ref "WORK-002" /%}\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="done" %}\n# B\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const circular = result.issues.filter(i => i.type === 'circular-dependency');
		expect(circular).toHaveLength(0);
	});
});

describe('validate — orphaned work items', () => {
	it('warns about work items with no milestone', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const orphaned = result.issues.filter(i => i.type === 'no-milestone');
		expect(orphaned).toHaveLength(1);
		expect(orphaned[0].severity).toBe('warning');
	});

	it('does not warn about done items without milestone', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="done" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const orphaned = result.issues.filter(i => i.type === 'no-milestone');
		expect(orphaned).toHaveLength(0);
	});

	it('does not warn when milestone is set', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" milestone="v1.0" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const orphaned = result.issues.filter(i => i.type === 'no-milestone');
		expect(orphaned).toHaveLength(0);
	});
});

describe('validate — completed milestones with open items', () => {
	it('warns about complete milestone with open work', () => {
		writeMd('milestone/m.md', '{% milestone name="v1.0" status="complete" %}\n# v1.0\n{% /milestone %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="in-progress" milestone="v1.0" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'complete-milestone-open-item');
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe('warning');
		expect(issues[0].message).toContain('v1.0');
		expect(issues[0].message).toContain('WORK-001');
	});

	it('does not warn when all items are done', () => {
		writeMd('milestone/m.md', '{% milestone name="v1.0" status="complete" %}\n# v1.0\n{% /milestone %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" milestone="v1.0" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'complete-milestone-open-item');
		expect(issues).toHaveLength(0);
	});
});

describe('validate — resolution checks', () => {
	it('reports info when done item has no resolution', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="done" milestone="v1.0" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'done-without-resolution');
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe('info');
	});

	it('does not report info when done item has resolution', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="done" milestone="v1.0" %}\n# A\n\n## Resolution\n\nCompleted: 2026-03-24\n\nDid the thing.\n\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'done-without-resolution');
		expect(issues).toHaveLength(0);
	});

	it('warns when resolution exists but item is not done', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="in-progress" milestone="v1.0" %}\n# A\n\n## Resolution\n\nCompleted: 2026-03-24\n\nStarted work.\n\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'resolution-not-done');
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe('warning');
	});

	it('warns when file has multiple Resolution sections', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="done" milestone="v1.0" %}\n# A\n\n## Resolution\n\nFirst.\n\n## Resolution\n\nSecond.\n\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'multiple-resolutions');
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe('warning');
	});

	it('does not check resolutions on non-work/bug types', () => {
		writeMd('spec/a.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'done-without-resolution');
		expect(issues).toHaveLength(0);
	});
});

describe('validate — required sections', () => {
	it('warns when ready work item has no Acceptance Criteria', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" milestone="v1.0" %}\n# A\n\n## Approach\nSome notes.\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'missing-section' && i.message.includes('Acceptance Criteria'));
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe('warning');
	});

	it('does not warn when work item has Acceptance Criteria', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" milestone="v1.0" %}\n# A\n\n## Acceptance Criteria\n- [ ] Done\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'missing-section' && i.message.includes('Acceptance Criteria'));
		expect(issues).toHaveLength(0);
	});

	it('recognises aliases like AC for Acceptance Criteria', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" milestone="v1.0" %}\n# A\n\n## AC\n- [ ] Done\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'missing-section' && i.message.includes('Acceptance Criteria'));
		expect(issues).toHaveLength(0);
	});

	it('does not warn for draft work items', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="draft" milestone="v1.0" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'missing-section');
		expect(issues).toHaveLength(0);
	});

	it('warns when confirmed bug is missing required sections', () => {
		writeMd('bug/a.md', '{% bug id="BUG-001" status="confirmed" severity="major" milestone="v1.0" %}\n# B\n{% /bug %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'missing-section');
		expect(issues).toHaveLength(3); // Steps to Reproduce, Expected, Actual
	});

	it('warns when accepted decision is missing required sections', () => {
		writeMd('decision/a.md', '{% decision id="ADR-001" status="accepted" %}\n# D\n{% /decision %}');
		const result = runValidate({ dir: TMP });
		const issues = result.issues.filter(i => i.type === 'missing-section');
		expect(issues).toHaveLength(2); // Context, Decision
	});
});

describe('validate — strict mode', () => {
	it('promotes warnings to errors in strict mode', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP, strict: true });
		const orphaned = result.issues.filter(i => i.type === 'no-milestone');
		expect(orphaned).toHaveLength(1);
		expect(orphaned[0].severity).toBe('error');
		expect(result.counts.errors).toBeGreaterThan(0);
		expect(result.counts.warnings).toBe(0);
		expect(result.exitCode).toBe(1);
	});
});

describe('validate — exit codes', () => {
	it('returns 0 when no errors', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="done" milestone="v1.0" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		expect(result.exitCode).toBe(0);
	});

	it('returns 1 when errors found', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="working" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		expect(result.exitCode).toBe(1);
	});

	it('returns 0 with warnings only (non-strict)', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		expect(result.counts.warnings).toBeGreaterThan(0);
		expect(result.exitCode).toBe(0);
	});
});

describe('validate — counts', () => {
	it('correctly counts scanned files', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="done" milestone="v1.0" %}\n# A\n{% /work %}');
		writeMd('spec/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('decision/d.md', '{% decision id="ADR-001" status="accepted" %}\n# D\n{% /decision %}');
		const result = runValidate({ dir: TMP });
		expect(result.scanned).toBe(3);
	});

	it('handles empty directory', () => {
		const result = runValidate({ dir: TMP });
		expect(result.scanned).toBe(0);
		expect(result.exitCode).toBe(0);
	});
});
