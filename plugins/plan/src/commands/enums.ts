import type { PlanRuneType } from '../types.js';

// Single source of truth for the constrained attribute vocabularies shared by
// `plan create`, `plan update`, `plan validate`, the MCP input schemas, the
// renderer, and the rune schemas. Every consumer imports from here rather than
// re-declaring the value lists — a value accepted at create time is the same
// value validate considers legal, and adding one status can never leave a
// consumer behind (SPEC-117). Sets that carry extra structure — terminal-ness,
// achievement, actionability — are declared below and covered by an
// exhaustiveness test so drift becomes a build failure, not a latent bug.

/** Valid `status` values per rune type. */
export const VALID_STATUS: Record<PlanRuneType, readonly string[]> = {
	spec: ['draft', 'review', 'accepted', 'superseded', 'deprecated'],
	work: ['draft', 'ready', 'in-progress', 'review', 'done', 'blocked', 'pending', 'cancelled', 'superseded'],
	bug: ['reported', 'confirmed', 'in-progress', 'fixed', 'wontfix', 'duplicate'],
	decision: ['proposed', 'accepted', 'superseded', 'deprecated'],
	milestone: ['planning', 'active', 'complete'],
};

export const VALID_PRIORITY: readonly string[] = ['critical', 'high', 'medium', 'low'];
export const VALID_COMPLEXITY: readonly string[] = ['trivial', 'simple', 'moderate', 'complex', 'unknown'];
export const VALID_SEVERITY: readonly string[] = ['critical', 'major', 'minor', 'cosmetic'];

/** Attributes allowed per rune type (all of them, not just the enum-valued ones). */
export const ALLOWED_ATTRS: Record<PlanRuneType, readonly string[]> = {
	work: ['id', 'status', 'priority', 'complexity', 'assignee', 'milestone', 'source', 'supersedes', 'tags'],
	spec: ['id', 'status', 'version', 'supersedes', 'tags'],
	bug: ['id', 'status', 'severity', 'assignee', 'milestone', 'source', 'tags'],
	decision: ['id', 'status', 'date', 'supersedes', 'source', 'tags'],
	milestone: ['name', 'status', 'target'],
};

// --- Derived lifecycle sets (SPEC-117) -----------------------------------
//
// These carry structure beyond membership (which statuses *end* a lifecycle,
// which of those *count as success*, which are *actionable*), so they can't be
// pure derivations of VALID_STATUS. They are keyed off the canonical list and
// an exhaustiveness test asserts every terminal/achieving value is a real
// member of VALID_STATUS — so a typo or a removed status fails CI.

/**
 * Statuses that end an entity's lifecycle. A terminal item is finished /
 * resolved / not-actionable, whether that ending was success or retirement.
 * `next`, `status`, `validate`, and the renderer all ask "is this terminal?"
 * through {@link isTerminal} instead of maintaining private sets.
 */
export const TERMINAL_STATUSES: Record<PlanRuneType, ReadonlySet<string>> = {
	spec: new Set(['accepted', 'superseded', 'deprecated']),
	work: new Set(['done', 'cancelled', 'superseded']),
	bug: new Set(['fixed', 'wontfix', 'duplicate']),
	decision: new Set(['accepted', 'superseded', 'deprecated']),
	milestone: new Set(['complete']),
};

/**
 * The terminal subset that counts as *achievement* — the work actually got
 * done. Drives milestone progress numerators and `plan-progress` counts.
 * Retirement states (`cancelled` / `superseded` / `wontfix` / `duplicate`) are
 * terminal but deliberately excluded: retiring is not completing.
 */
export const ACHIEVING_STATUSES: Record<PlanRuneType, ReadonlySet<string>> = {
	spec: new Set(['accepted']),
	work: new Set(['done']),
	bug: new Set(['fixed']),
	decision: new Set(['accepted']),
	milestone: new Set(['complete']),
};

/** Statuses `plan next` draws from — items ready to be picked up. */
export const ACTIONABLE_STATUSES: Record<PlanRuneType, ReadonlySet<string>> = {
	spec: new Set<string>(),
	work: new Set(['ready']),
	bug: new Set(['confirmed']),
	decision: new Set<string>(),
	milestone: new Set<string>(),
};

/** True when `status` ends `type`'s lifecycle (done, retired, or otherwise). */
export function isTerminal(type: PlanRuneType, status: string): boolean {
	return TERMINAL_STATUSES[type]?.has(status) ?? false;
}

/** True when `status` counts as successful completion for `type`. */
export function isAchieving(type: PlanRuneType, status: string): boolean {
	return ACHIEVING_STATUSES[type]?.has(status) ?? false;
}

/** True when `status` makes a `type` item actionable (`plan next` fodder). */
export function isActionable(type: PlanRuneType, status: string): boolean {
	return ACTIONABLE_STATUSES[type]?.has(status) ?? false;
}

/**
 * Work/bug completion statuses — the cross-type "is this dependency satisfied /
 * is this work item done" check used by `next`, `status`, and `validate`.
 * Equals the old hand-written `{done, fixed}` set, now derived from the
 * canonical achieving sets. Scoped to work + bug deliberately: a spec or
 * milestone reference is not a work dependency and never counted as "done" for
 * this check, even though `accepted` / `complete` are achieving for their types.
 */
export const DONE_STATUS_SET: ReadonlySet<string> = new Set([
	...ACHIEVING_STATUSES.work,
	...ACHIEVING_STATUSES.bug,
]);

/** Union of every terminal status across all types — for cross-type
 *  "is this resolved / collapse it in the sidebar" checks. */
export const TERMINAL_STATUS_UNION: ReadonlySet<string> = new Set(
	Object.values(TERMINAL_STATUSES).flatMap(s => [...s]),
);

/**
 * Dashboard "actionable-first" status display order (SPEC-072). Diverges from
 * each rune's lifecycle order — blocked/in-progress bubble to the top, terminal
 * states sink to the tail. Shared by the plugin's `theme.orderings` and the
 * bespoke `plan build` render-pipeline so collection/aggregate groups land in
 * the same order on both paths. Covers every canonical status so no group is
 * left unsorted.
 */
export const WORK_STATUS_DISPLAY_ORDER: readonly string[] = [
	'blocked', 'in-progress', 'review', 'ready', 'pending', 'draft', 'done', 'cancelled', 'superseded',
];
export const BUG_STATUS_DISPLAY_ORDER: readonly string[] = [
	'in-progress', 'confirmed', 'reported', 'fixed', 'wontfix', 'duplicate',
];

/** Attributes with constrained value sets, by rune type. */
export function getEnumAttrs(type: PlanRuneType): Record<string, readonly string[]> {
	const attrs: Record<string, readonly string[]> = { status: VALID_STATUS[type] };
	if (type === 'work') {
		attrs.priority = VALID_PRIORITY;
		attrs.complexity = VALID_COMPLEXITY;
	}
	if (type === 'bug') {
		attrs.severity = VALID_SEVERITY;
	}
	return attrs;
}

/**
 * Validate a set of provided attributes against a rune type's allowed keys and
 * enum value sets. Throws an `Error` (with `.exitCode` set to `exitCode`) on the
 * first violation. Used by both `create` and `update` so invalid attributes are
 * rejected at write time rather than surfacing later in `validate`.
 *
 * Empty-string values are skipped: `update` uses them to clear an attribute, and
 * `create` never emits them for enum fields.
 */
export function assertValidAttrs(
	type: PlanRuneType,
	attrs: Record<string, string>,
	exitCode: number,
): void {
	const enumAttrs = getEnumAttrs(type);
	const allowed = ALLOWED_ATTRS[type];

	for (const [attr, value] of Object.entries(attrs)) {
		if (attr === 'id' || attr === 'name') {
			throw withExit(new Error(`Cannot set the "${attr}" attribute here`), exitCode);
		}
		if (!allowed.includes(attr)) {
			throw withExit(
				new Error(`Unknown attribute "${attr}" for ${type} rune. Valid: ${allowed.join(', ')}`),
				exitCode,
			);
		}
		if (value === '') continue;
		const valid = enumAttrs[attr];
		if (valid && !valid.includes(value)) {
			throw withExit(
				new Error(`Invalid ${attr} "${value}" for ${type} rune. Valid: ${valid.join(', ')}`),
				exitCode,
			);
		}
	}
}

function withExit(err: Error, exitCode: number): Error {
	(err as Error & { exitCode?: number }).exitCode = exitCode;
	return err;
}
