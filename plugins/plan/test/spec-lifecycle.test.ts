import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { runValidate } from '../src/commands/validate.js';
import { runStatus } from '../src/commands/status.js';
import {
	VALID_STATUS,
	TERMINAL_STATUSES,
	ACHIEVING_STATUSES,
	PR_REF_RE,
	RELEASED_IN_RE,
} from '../src/commands/enums.js';
import { config } from '../src/config.js';

const TMP = join(import.meta.dirname, '.tmp-lifecycle-test');

function writeMd(relPath: string, content: string) {
	const full = join(TMP, relPath);
	mkdirSync(full.substring(0, full.lastIndexOf('/')), { recursive: true });
	writeFileSync(full, content);
}

beforeEach(() => {
	rmSync(TMP, { recursive: true, force: true });
	mkdirSync(TMP, { recursive: true });
});
afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

// --- WORK-495: spec implemented/shipped + ADR rejected ---

describe('spec/decision lifecycle statuses (WORK-495)', () => {
	it('enums register the new statuses as terminal/achieving', () => {
		expect(VALID_STATUS.spec).toEqual(expect.arrayContaining(['implemented', 'shipped']));
		expect(VALID_STATUS.decision).toContain('rejected');
		expect(TERMINAL_STATUSES.spec.has('implemented')).toBe(true);
		expect(TERMINAL_STATUSES.spec.has('shipped')).toBe(true);
		expect(ACHIEVING_STATUSES.spec.has('implemented')).toBe(true);
		expect(ACHIEVING_STATUSES.spec.has('shipped')).toBe(true);
		expect(TERMINAL_STATUSES.decision.has('rejected')).toBe(true);
		expect(ACHIEVING_STATUSES.decision.has('rejected')).toBe(false);
	});

	it('validate accepts implemented/shipped specs and rejected decisions', () => {
		writeMd('specs/a.md', '{% spec id="SPEC-001" status="implemented" %}\n# A\n{% /spec %}');
		writeMd('specs/b.md', '{% spec id="SPEC-002" status="shipped" released-in="v0.12.0" %}\n# B\n{% /spec %}');
		writeMd('decisions/d.md', '{% decision id="ADR-001" status="rejected" %}\n# D\n\n## Context\nx\n\n## Decision\ny\n{% /decision %}');
		const result = runValidate({ dir: TMP });
		expect(result.issues.filter(i => i.type === 'invalid-status')).toHaveLength(0);
	});

	it('errors on a shipped spec without released-in', () => {
		writeMd('specs/a.md', '{% spec id="SPEC-001" status="shipped" %}\n# A\n{% /spec %}');
		const result = runValidate({ dir: TMP });
		const errs = result.issues.filter(i => i.type === 'shipped-without-release');
		expect(errs).toHaveLength(1);
		expect(errs[0].severity).toBe('error');
	});

	it('errors on a malformed released-in', () => {
		writeMd('specs/a.md', '{% spec id="SPEC-001" status="shipped" released-in="soon" %}\n# A\n{% /spec %}');
		const result = runValidate({ dir: TMP });
		expect(result.issues.filter(i => i.type === 'invalid-released-in')).toHaveLength(1);
	});

	it('badge sentiment maps the new statuses', () => {
		const specSentiment = (config.Spec as any).metaFields.status.sentimentMap;
		expect(specSentiment.implemented).toBe('positive');
		expect(specSentiment.shipped).toBe('positive');
		const decisionSentiment = (config.Decision as any).metaFields.status.sentimentMap;
		expect(decisionSentiment.rejected).toBe('negative');
	});

	it('RELEASED_IN_RE accepts semver with/without leading v', () => {
		expect(RELEASED_IN_RE.test('v0.11.4')).toBe(true);
		expect(RELEASED_IN_RE.test('1.2.3')).toBe(true);
		expect(RELEASED_IN_RE.test('v1')).toBe(false);
	});
});

// --- WORK-496: pr attribute ---

describe('pr attribute (WORK-496)', () => {
	it('PR_REF_RE matches <org>/<repo>#<number>', () => {
		expect(PR_REF_RE.test('refrakt-md/refrakt#142')).toBe(true);
		expect(PR_REF_RE.test('owner/repo#1')).toBe(true);
		expect(PR_REF_RE.test('refrakt#142')).toBe(false);
		expect(PR_REF_RE.test('refrakt-md/refrakt')).toBe(false);
	});

	it('errors on a malformed pr value', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="done" pr="not-a-pr" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		expect(result.issues.filter(i => i.type === 'invalid-pr')).toHaveLength(1);
	});

	it('accepts a multi-valued pr and does not warn on a missing pr', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="done" pr="refrakt-md/refrakt#1,refrakt-md/refrakt#2" %}\n# A\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="done" %}\n# B\n{% /work %}');
		const result = runValidate({ dir: TMP });
		expect(result.issues.filter(i => i.type === 'invalid-pr')).toHaveLength(0);
		// No "missing pr" warning type exists in v1.
		expect(result.issues.filter(i => i.type.includes('pr') && i.severity === 'warning')).toHaveLength(0);
	});
});

// --- WORK-497: status rollups + implemented-flip suggestion ---

describe('plan status PR rollups (WORK-497)', () => {
	it('rolls up unique PRs per spec, deduping shared PRs', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" source="SPEC-001" pr="refrakt-md/refrakt#10" %}\n# A\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="done" source="SPEC-001" pr="refrakt-md/refrakt#10,refrakt-md/refrakt#11" %}\n# B\n{% /work %}');
		const result = runStatus({ dir: TMP });
		const rollup = result.specRollups.find(r => r.id === 'SPEC-001');
		expect(rollup).toBeDefined();
		expect(rollup!.prs.sort()).toEqual(['refrakt-md/refrakt#10', 'refrakt-md/refrakt#11']);
		expect(rollup!.implementedBy.sort()).toEqual(['WORK-001', 'WORK-002']);
	});

	it('suggests the implemented flip when all linked work is done', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" source="SPEC-001" %}\n# A\n{% /work %}');
		const result = runStatus({ dir: TMP });
		expect(result.specRollups.find(r => r.id === 'SPEC-001')!.suggestImplemented).toBe(true);
	});

	it('does not suggest the flip while linked work is unfinished', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" source="SPEC-001" %}\n# A\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="in-progress" source="SPEC-001" %}\n# B\n{% /work %}');
		const result = runStatus({ dir: TMP });
		expect(result.specRollups.find(r => r.id === 'SPEC-001')!.suggestImplemented).toBe(false);
	});

	it('falls back to the legacy PR: resolution line when no pr attribute is set', () => {
		writeMd('specs/s.md', '{% spec id="SPEC-001" status="accepted" %}\n# S\n{% /spec %}');
		writeMd('work/a.md', '{% work id="WORK-001" status="done" source="SPEC-001" %}\n# A\n\n## Resolution\n\nCompleted: 2026-01-01\nPR: refrakt-md/refrakt#99\n\nDone.\n{% /work %}');
		const result = runStatus({ dir: TMP });
		expect(result.specRollups.find(r => r.id === 'SPEC-001')!.prs).toEqual(['refrakt-md/refrakt#99']);
	});
});
