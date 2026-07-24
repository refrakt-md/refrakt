import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { runValidate } from '../src/commands/validate.js';
import { runStatus } from '../src/commands/status.js';
import { specStatusLags, SPEC_PRE_IMPLEMENTED_STATUSES, SPEC_IMPLEMENTED_STATUSES } from '../src/commands/enums.js';

// Lifecycle-drift validation (SPEC-119): `plan validate` flags entities whose
// status contradicts the terminal evidence around them, and shares its
// spec-drift predicate with `plan status`'s `suggestImplemented` hint.

const TMP = join(import.meta.dirname, '.tmp-drift-test');

function writeMd(relPath: string, content: string) {
	const full = join(TMP, relPath);
	mkdirSync(full.substring(0, full.lastIndexOf('/')), { recursive: true });
	writeFileSync(full, content);
}

function typesOf(dir: string, type: string) {
	return runValidate({ dir }).issues.filter(i => i.type === type);
}

beforeEach(() => {
	rmSync(TMP, { recursive: true, force: true });
	mkdirSync(TMP, { recursive: true });
});
afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

// --- Shared predicate (the anchor: status and validate must agree) ---

describe('specStatusLags predicate (SPEC-119)', () => {
	it('is true for a pre-implemented spec whose linked work is all achieving-terminal', () => {
		expect(specStatusLags('accepted', ['done', 'fixed'])).toBe(true);
		expect(specStatusLags('draft', ['done'])).toBe(true);
		expect(specStatusLags('review', ['done'])).toBe(true);
	});
	it('is false when any linked work is non-terminal', () => {
		expect(specStatusLags('accepted', ['done', 'in-progress'])).toBe(false);
	});
	it('is false when work is retired (cancelled/superseded), not achieving', () => {
		expect(specStatusLags('accepted', ['cancelled'])).toBe(false);
		expect(specStatusLags('accepted', ['done', 'superseded'])).toBe(false);
	});
	it('is false with zero linked work (no evidence is not a contradiction)', () => {
		expect(specStatusLags('accepted', [])).toBe(false);
	});
	it('is false once the spec is already implemented/shipped', () => {
		expect(specStatusLags('implemented', ['done'])).toBe(false);
		expect(specStatusLags('shipped', ['done'])).toBe(false);
	});
	it('the pre/post status sets are disjoint and cover the lifecycle boundary', () => {
		for (const s of SPEC_PRE_IMPLEMENTED_STATUSES) expect(SPEC_IMPLEMENTED_STATUSES.has(s)).toBe(false);
	});
});

describe('status.suggestImplemented shares the predicate', () => {
	it('suggests the flip for a draft spec whose work is all done', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="draft" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" source="SPEC-001" %}\n# A\n{% /work %}');
		const rollup = runStatus({ dir: TMP }).specRollups.find(r => r.id === 'SPEC-001');
		expect(rollup!.suggestImplemented).toBe(true);
		// …and validate flags the same spec as a contradiction.
		expect(typesOf(TMP, 'spec-status-lag')).toHaveLength(1);
	});
});

// --- spec-status-lag (warning, v1) ---

describe('spec-status-lag', () => {
	it('warns when a non-terminal spec has all-achieving linked work', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" source="SPEC-001" %}\n# A\n{% /work %}');
		const issues = typesOf(TMP, 'spec-status-lag');
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe('warning');
		expect(issues[0].source).toBe('SPEC-001');
	});
	it('does not warn while a linked work item is unfinished', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" source="SPEC-001" %}\n# A\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="in-progress" source="SPEC-001" %}\n# B\n{% /work %}');
		expect(typesOf(TMP, 'spec-status-lag')).toHaveLength(0);
	});
	it('does not warn for a spec with zero linked work (no evidence)', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		expect(typesOf(TMP, 'spec-status-lag')).toHaveLength(0);
	});
	it('does not warn when linked work is entirely cancelled/superseded', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="cancelled" source="SPEC-001" %}\n# A\n{% /work %}');
		expect(typesOf(TMP, 'spec-status-lag')).toHaveLength(0);
	});
});

// --- spec-started-in-draft (info, v1) ---

describe('spec-started-in-draft', () => {
	it('reports info for a draft spec with started work', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="draft" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="in-progress" source="SPEC-001" %}\n# A\n{% /work %}');
		const issues = typesOf(TMP, 'spec-started-in-draft');
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe('info');
	});
	it('does not report for a draft spec whose work has not started', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="draft" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" source="SPEC-001" %}\n# A\n{% /work %}');
		expect(typesOf(TMP, 'spec-started-in-draft')).toHaveLength(0);
	});
	it('does not report for a non-draft spec', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="in-progress" source="SPEC-001" %}\n# A\n{% /work %}');
		expect(typesOf(TMP, 'spec-started-in-draft')).toHaveLength(0);
	});
});

// --- spec-status-ahead (warning, v1) ---

describe('spec-status-ahead', () => {
	it('warns for an implemented spec with a non-terminal linked work item', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="implemented" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="in-progress" source="SPEC-001" %}\n# A\n{% /work %}');
		const issues = typesOf(TMP, 'spec-status-ahead');
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe('warning');
	});
	it('warns for a shipped spec with an unfinished linked work item', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="shipped" released-in="v1.0.0" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" source="SPEC-001" %}\n# A\n{% /work %}');
		expect(typesOf(TMP, 'spec-status-ahead')).toHaveLength(1);
	});
	it('does not warn when all linked work is terminal', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="implemented" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" source="SPEC-001" %}\n# A\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="cancelled" source="SPEC-001" %}\n# B\n{% /work %}');
		expect(typesOf(TMP, 'spec-status-ahead')).toHaveLength(0);
	});
});

// --- released-in-without-shipped (warning, v1) ---

describe('released-in-without-shipped', () => {
	it('warns when released-in is set on a non-shipped spec', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="implemented" released-in="v1.0.0" %}\n# S\n{% /spec %}');
		const issues = typesOf(TMP, 'released-in-without-shipped');
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe('warning');
	});
	it('does not warn when the spec is shipped', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="shipped" released-in="v1.0.0" %}\n# S\n{% /spec %}');
		expect(typesOf(TMP, 'released-in-without-shipped')).toHaveLength(0);
	});
});

// --- stale-blocked (warning, v1) ---

describe('stale-blocked', () => {
	it('warns when a blocked item has all blockers done', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="blocked" %}\n# A\n\n## Blocked by\n\n- {% ref "WORK-002" /%}\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="done" %}\n# B\n{% /work %}');
		const issues = typesOf(TMP, 'stale-blocked');
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe('warning');
		expect(issues[0].source).toBe('WORK-001');
	});
	it('does not warn while a blocker is still open', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="blocked" %}\n# A\n\n## Blocked by\n\n- {% ref "WORK-002" /%}\n- {% ref "WORK-003" /%}\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="done" %}\n# B\n{% /work %}');
		writeMd('work/c.md', '{% work id="WORK-003" status="in-progress" %}\n# C\n{% /work %}');
		expect(typesOf(TMP, 'stale-blocked')).toHaveLength(0);
	});
	it('does not warn for a blocked item with no Blocked by targets', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="blocked" %}\n# A\n{% /work %}');
		expect(typesOf(TMP, 'stale-blocked')).toHaveLength(0);
	});
	it('ignores prose refs — only the directed Blocked by graph counts', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="blocked" %}\n# A\n\nSee {% ref "WORK-002" /%} for context.\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="done" %}\n# B\n{% /work %}');
		expect(typesOf(TMP, 'stale-blocked')).toHaveLength(0);
	});
});

// --- --strict promotes the new warnings to errors ---

describe('--strict promotes lifecycle-drift warnings to errors', () => {
	it('spec-status-lag becomes an error under --strict', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" source="SPEC-001" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP, strict: true });
		const issue = result.issues.find(i => i.type === 'spec-status-lag');
		expect(issue!.severity).toBe('error');
		expect(result.exitCode).toBe(1);
	});
});
