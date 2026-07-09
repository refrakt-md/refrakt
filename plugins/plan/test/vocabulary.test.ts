import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import {
	VALID_STATUS,
	TERMINAL_STATUSES,
	ACHIEVING_STATUSES,
	ACTIONABLE_STATUSES,
	DONE_STATUS_SET,
	TERMINAL_STATUS_UNION,
	isTerminal,
	isAchieving,
	isActionable,
} from '../src/commands/enums.js';
import { config } from '../src/config.js';
import { STATUS_ORDER_BY_TYPE, STATUS_LABELS_DISPLAY, STATUS_ORDER } from '../src/commands/render-pipeline.js';
import { runValidate } from '../src/commands/validate.js';
import { runNext } from '../src/commands/next.js';
import type { PlanRuneType } from '../src/types.js';

const RUNE_TYPES: PlanRuneType[] = ['spec', 'work', 'bug', 'decision', 'milestone'];

// --- WORK-492: consolidated vocabulary is the single source of truth ---

describe('vocabulary — derived lifecycle sets (SPEC-117)', () => {
	it('terminal/achieving/actionable sets only contain canonical statuses', () => {
		for (const type of RUNE_TYPES) {
			const valid = new Set(VALID_STATUS[type]);
			for (const s of TERMINAL_STATUSES[type]) expect(valid.has(s), `${type} terminal "${s}"`).toBe(true);
			for (const s of ACHIEVING_STATUSES[type]) expect(valid.has(s), `${type} achieving "${s}"`).toBe(true);
			for (const s of ACTIONABLE_STATUSES[type]) expect(valid.has(s), `${type} actionable "${s}"`).toBe(true);
		}
	});

	it('every achieving status is also terminal', () => {
		for (const type of RUNE_TYPES) {
			for (const s of ACHIEVING_STATUSES[type]) {
				expect(TERMINAL_STATUSES[type].has(s), `${type} achieving "${s}" must be terminal`).toBe(true);
			}
		}
	});

	it('helpers agree with the underlying sets', () => {
		expect(isTerminal('work', 'done')).toBe(true);
		expect(isTerminal('work', 'cancelled')).toBe(true);
		expect(isTerminal('work', 'superseded')).toBe(true);
		expect(isTerminal('work', 'ready')).toBe(false);
		expect(isAchieving('work', 'done')).toBe(true);
		expect(isAchieving('work', 'cancelled')).toBe(false);
		expect(isAchieving('work', 'superseded')).toBe(false);
		expect(isActionable('work', 'ready')).toBe(true);
		expect(isActionable('bug', 'confirmed')).toBe(true);
		expect(isActionable('work', 'done')).toBe(false);
	});

	it('DONE_STATUS_SET stays scoped to work/bug completion', () => {
		expect([...DONE_STATUS_SET].sort()).toEqual(['done', 'fixed']);
	});

	it('TERMINAL_STATUS_UNION covers every per-type terminal status', () => {
		for (const type of RUNE_TYPES) {
			for (const s of TERMINAL_STATUSES[type]) expect(TERMINAL_STATUS_UNION.has(s)).toBe(true);
		}
	});
});

// --- WORK-492: exhaustiveness — drift becomes a build failure ---

describe('vocabulary — exhaustiveness against config + orderings', () => {
	it('every canonical status has a sentimentMap entry', () => {
		const configByType: Record<PlanRuneType, string> = {
			spec: 'Spec', work: 'Work', bug: 'Bug', decision: 'Decision', milestone: 'Milestone',
		};
		for (const type of RUNE_TYPES) {
			const runeConfig = config[configByType[type]] as any;
			const sentimentMap = runeConfig.metaFields.status.sentimentMap as Record<string, string>;
			for (const status of VALID_STATUS[type]) {
				expect(sentimentMap[status], `${type} status "${status}" missing sentimentMap entry`).toBeDefined();
			}
		}
	});

	it('every canonical status has a per-type ordering entry', () => {
		for (const type of RUNE_TYPES) {
			const order = STATUS_ORDER_BY_TYPE[type] ?? [];
			for (const status of VALID_STATUS[type]) {
				expect(order.includes(status), `${type} status "${status}" missing from STATUS_ORDER_BY_TYPE`).toBe(true);
			}
		}
	});

	it('every canonical status has a display label and global order', () => {
		for (const type of RUNE_TYPES) {
			for (const status of VALID_STATUS[type]) {
				expect(STATUS_LABELS_DISPLAY[status], `label for "${status}"`).toBeDefined();
				expect(STATUS_ORDER[status], `order for "${status}"`).toBeDefined();
			}
		}
	});
});

// --- WORK-493: cancelled / superseded terminal work states ---

const TMP = join(import.meta.dirname, '.tmp-vocab-test');

function writeMd(relPath: string, content: string) {
	const full = join(TMP, relPath);
	mkdirSync(full.substring(0, full.lastIndexOf('/')), { recursive: true });
	writeFileSync(full, content);
}

describe('terminal work states (WORK-493)', () => {
	beforeEachClean();

	it('validate accepts cancelled and superseded work statuses', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="cancelled" %}\n# A\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="superseded" supersedes="WORK-001" %}\n# B\n{% /work %}');
		const result = runValidate({ dir: TMP });
		expect(result.issues.filter(i => i.type === 'invalid-status')).toHaveLength(0);
	});

	it('cancelled / superseded items are excluded from plan next', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" priority="high" %}\n# Ready\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="cancelled" priority="high" %}\n# Cancelled\n{% /work %}');
		writeMd('work/c.md', '{% work id="WORK-003" status="superseded" priority="high" supersedes="WORK-001" %}\n# Superseded\n{% /work %}');
		const result = runNext({ dir: TMP, count: 10 });
		const ids = result.items.map(i => i.id);
		expect(ids).toContain('WORK-001');
		expect(ids).not.toContain('WORK-002');
		expect(ids).not.toContain('WORK-003');
	});

	it('warns on a superseded work item with no supersedes target', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="superseded" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const warn = result.issues.filter(i => i.type === 'superseded-without-target');
		expect(warn).toHaveLength(1);
		expect(warn[0].severity).toBe('warning');
	});

	it('does not warn about supersedes when the target is present and known', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="done" %}\n# A\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="superseded" supersedes="WORK-001" %}\n# B\n{% /work %}');
		const result = runValidate({ dir: TMP });
		expect(result.issues.filter(i => i.type === 'superseded-without-target')).toHaveLength(0);
		expect(result.issues.filter(i => i.type === 'broken-supersedes')).toHaveLength(0);
	});

	it('warns when supersedes points at an unknown entity', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="superseded" supersedes="WORK-999" %}\n# A\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const warn = result.issues.filter(i => i.type === 'broken-supersedes');
		expect(warn).toHaveLength(1);
		expect(warn[0].target).toBe('WORK-999');
	});

	it('allows a ## Resolution on cancelled / superseded work (no resolution-not-done warning)', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="cancelled" %}\n# A\n\n## Resolution\n\nCompleted: 2026-01-01\n\nAbandoned in favour of a simpler approach.\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="superseded" supersedes="WORK-003" %}\n# B\n\n## Resolution\n\nCompleted: 2026-01-01\n\nReplaced by WORK-003.\n{% /work %}');
		writeMd('work/c.md', '{% work id="WORK-003" status="ready" %}\n# C\n{% /work %}');
		const result = runValidate({ dir: TMP });
		const warns = result.issues.filter(i => i.type === 'resolution-not-done');
		expect(warns).toHaveLength(0);
	});

	it('still warns about a ## Resolution on a non-terminal item', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="in-progress" %}\n# A\n\n## Resolution\n\nCompleted: 2026-01-01\n\nDone-ish.\n{% /work %}');
		const result = runValidate({ dir: TMP });
		expect(result.issues.filter(i => i.type === 'resolution-not-done')).toHaveLength(1);
	});
});

function beforeEachClean() {
	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(TMP, { recursive: true });
	});
	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});
}
