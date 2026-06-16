import type { PlanRuneType } from '../types.js';

// Single source of truth for the constrained attribute vocabularies shared by
// `plan create`, `plan update`, and `plan validate`. Keeping these in one place
// means a value accepted at create time is the same value validate considers
// legal — the three commands can never drift apart.

/** Valid `status` values per rune type. */
export const VALID_STATUS: Record<PlanRuneType, readonly string[]> = {
	spec: ['draft', 'review', 'accepted', 'superseded', 'deprecated'],
	work: ['draft', 'ready', 'in-progress', 'review', 'done', 'blocked', 'pending'],
	bug: ['reported', 'confirmed', 'in-progress', 'fixed', 'wontfix', 'duplicate'],
	decision: ['proposed', 'accepted', 'superseded', 'deprecated'],
	milestone: ['planning', 'active', 'complete'],
};

export const VALID_PRIORITY: readonly string[] = ['critical', 'high', 'medium', 'low'];
export const VALID_COMPLEXITY: readonly string[] = ['trivial', 'simple', 'moderate', 'complex', 'unknown'];
export const VALID_SEVERITY: readonly string[] = ['critical', 'major', 'minor', 'cosmetic'];

/** Attributes allowed per rune type (all of them, not just the enum-valued ones). */
export const ALLOWED_ATTRS: Record<PlanRuneType, readonly string[]> = {
	work: ['id', 'status', 'priority', 'complexity', 'assignee', 'milestone', 'source', 'tags'],
	spec: ['id', 'status', 'version', 'supersedes', 'tags'],
	bug: ['id', 'status', 'severity', 'assignee', 'milestone', 'source', 'tags'],
	decision: ['id', 'status', 'date', 'supersedes', 'source', 'tags'],
	milestone: ['name', 'status', 'target'],
};

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
