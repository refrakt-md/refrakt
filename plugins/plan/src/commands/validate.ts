import { readFileSync } from 'fs';
import { basename, join } from 'path';
import { scanPlanFiles } from '../scanner.js';
import type { PlanEntity, PlanRuneType } from '../types.js';
import { VALID_STATUS, VALID_PRIORITY, VALID_COMPLEXITY, VALID_SEVERITY, DONE_STATUS_SET, isTerminal, PR_REF_RE, RELEASED_IN_RE } from './enums.js';

// --- Valid attribute values per type (sets derived from the shared vocabularies) ---

const VALID_STATUSES: Record<string, Set<string>> = Object.fromEntries(
	Object.entries(VALID_STATUS).map(([type, values]) => [type, new Set(values)]),
);

const VALID_PRIORITIES = new Set(VALID_PRIORITY);
const VALID_SEVERITIES = new Set(VALID_SEVERITY);
const VALID_COMPLEXITIES = new Set(VALID_COMPLEXITY);

/** Cross-type "is this item's work complete" (work→done, bug→fixed). */
const DONE_STATUSES = DONE_STATUS_SET;

// --- Exit codes ---

export const EXIT_SUCCESS = 0;
export const EXIT_ERRORS = 1;
export const EXIT_INVALID_ARGS = 2;

// --- Types ---

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
	severity: IssueSeverity;
	type: string;
	source: string;
	file: string;
	message: string;
	target?: string;
}

export interface ValidateOptions {
	dir: string;
	strict?: boolean;
	formatJson?: boolean;
}

export interface ValidateResult {
	scanned: number;
	issues: ValidationIssue[];
	counts: { errors: number; warnings: number; info: number };
	exitCode: number;
}

// --- Implementation ---

function checkBrokenRefs(entities: PlanEntity[], knownIds: Set<string>): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	for (const e of entities) {
		const id = e.attributes.id || e.attributes.name || e.file;
		for (const ref of e.refs) {
			if (!knownIds.has(ref)) {
				issues.push({
					severity: 'error',
					type: 'broken-ref',
					source: id,
					file: e.file,
					target: ref,
					message: `${id} references ${ref} — entity not found`,
				});
			}
		}
	}
	return issues;
}

function checkDuplicateIds(entities: PlanEntity[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const seen = new Map<string, PlanEntity>();
	for (const e of entities) {
		const id = e.attributes.id || e.attributes.name;
		if (!id) continue;
		const existing = seen.get(id);
		if (existing) {
			issues.push({
				severity: 'error',
				type: 'duplicate-id',
				source: id,
				file: e.file,
				target: existing.file,
				message: `${id} duplicate ID — also defined in ${existing.file}`,
			});
		} else {
			seen.set(id, e);
		}
	}
	return issues;
}

function checkInvalidAttributes(entities: PlanEntity[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	for (const e of entities) {
		const id = e.attributes.id || e.attributes.name || e.file;

		// Status
		const status = e.attributes.status;
		const validStatuses = VALID_STATUSES[e.type];
		if (status && validStatuses && !validStatuses.has(status)) {
			issues.push({
				severity: 'error',
				type: 'invalid-status',
				source: id,
				file: e.file,
				message: `${id} has invalid status "${status}" for type ${e.type}`,
			});
		}

		// Priority (work items)
		const priority = e.attributes.priority;
		if (priority && (e.type === 'work') && !VALID_PRIORITIES.has(priority)) {
			issues.push({
				severity: 'error',
				type: 'invalid-priority',
				source: id,
				file: e.file,
				message: `${id} has invalid priority "${priority}"`,
			});
		}

		// Severity (bugs)
		const severity = e.attributes.severity;
		if (severity && e.type === 'bug' && !VALID_SEVERITIES.has(severity)) {
			issues.push({
				severity: 'error',
				type: 'invalid-severity',
				source: id,
				file: e.file,
				message: `${id} has invalid severity "${severity}"`,
			});
		}

		// Complexity (work items)
		const complexity = e.attributes.complexity;
		if (complexity && e.type === 'work' && !VALID_COMPLEXITIES.has(complexity)) {
			issues.push({
				severity: 'error',
				type: 'invalid-complexity',
				source: id,
				file: e.file,
				message: `${id} has invalid complexity "${complexity}"`,
			});
		}
	}
	return issues;
}

function checkCircularDeps(entities: PlanEntity[], knownIds: Set<string>): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Build adjacency map: id -> set of referenced ids that are work/bug items
	const workBugIds = new Set<string>();
	const adjMap = new Map<string, string[]>();
	const entityById = new Map<string, PlanEntity>();

	for (const e of entities) {
		const id = e.attributes.id || e.attributes.name;
		if (!id) continue;
		entityById.set(id, e);
		if (e.type === 'work' || e.type === 'bug') {
			workBugIds.add(id);
		}
	}

	for (const e of entities) {
		const id = e.attributes.id || e.attributes.name;
		if (!id || (e.type !== 'work' && e.type !== 'bug')) continue;
		const deps = e.refs.filter(r => workBugIds.has(r));
		if (deps.length > 0) {
			adjMap.set(id, deps);
		}
	}

	// DFS cycle detection
	const visited = new Set<string>();
	const inStack = new Set<string>();
	const reportedCycles = new Set<string>();

	function dfs(node: string, path: string[]): void {
		if (inStack.has(node)) {
			// Found cycle — report it
			const cycleStart = path.indexOf(node);
			const cycle = path.slice(cycleStart);
			const cycleKey = [...cycle].sort().join(',');
			if (!reportedCycles.has(cycleKey)) {
				reportedCycles.add(cycleKey);
				const entity = entityById.get(node)!;
				issues.push({
					severity: 'error',
					type: 'circular-dependency',
					source: node,
					file: entity.file,
					message: `Circular dependency: ${cycle.join(' → ')} → ${node}`,
				});
			}
			return;
		}
		if (visited.has(node)) return;

		inStack.add(node);
		path.push(node);
		const deps = adjMap.get(node) || [];
		for (const dep of deps) {
			dfs(dep, path);
		}
		path.pop();
		inStack.delete(node);
		visited.add(node);
	}

	for (const id of workBugIds) {
		dfs(id, []);
	}

	return issues;
}

function checkResolutions(entities: PlanEntity[], dir: string): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	for (const e of entities) {
		const id = e.attributes.id || e.attributes.name || e.file;
		const status = e.attributes.status || '';
		const isDone = DONE_STATUSES.has(status);
		// A `## Resolution` is legitimate on any terminal item — a `cancelled`
		// or `superseded` work item may record *why* it was retired, not just
		// how it was completed (SPEC-117).
		const isTerminalItem = isTerminal(e.type as PlanRuneType, status);
		const hasResolution = e.resolution !== undefined;

		// Done without resolution (info)
		if (isDone && !hasResolution && (e.type === 'work' || e.type === 'bug')) {
			issues.push({
				severity: 'info',
				type: 'done-without-resolution',
				source: id,
				file: e.file,
				message: `${id} is ${status} but has no Resolution section`,
			});
		}

		// Resolution on a non-terminal item (warning). Terminal items —
		// including the retired `cancelled` / `superseded` work states — may
		// carry a Resolution explaining the outcome, so they are exempt.
		if (hasResolution && !isTerminalItem && (e.type === 'work' || e.type === 'bug')) {
			issues.push({
				severity: 'warning',
				type: 'resolution-not-done',
				source: id,
				file: e.file,
				message: `${id} has a Resolution section but status is "${status}"`,
			});
		}

		// Multiple ## Resolution headings (warning) — scan raw file
		if (e.type === 'work' || e.type === 'bug') {
			try {
				const content = readFileSync(join(dir, e.file), 'utf8');
				const headingCount = (content.match(/^##\s+Resolution\s*$/gm) || []).length;
				if (headingCount > 1) {
					issues.push({
						severity: 'warning',
						type: 'multiple-resolutions',
						source: id,
						file: e.file,
						message: `${id} has ${headingCount} Resolution sections (expected at most 1)`,
					});
				}
			} catch {
				// File read failed — skip this check
			}
		}
	}

	return issues;
}

function checkPrAndRelease(entities: PlanEntity[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	for (const e of entities) {
		const id = e.attributes.id || e.file;

		// `pr` on work / bug — format is validated when set; a missing `pr` is
		// NOT warned in v1 (SPEC-049: carrot before stick).
		if (e.type === 'work' || e.type === 'bug') {
			const pr = (e.attributes.pr || '').trim();
			if (pr) {
				for (const ref of pr.split(',').map(s => s.trim()).filter(Boolean)) {
					if (!PR_REF_RE.test(ref)) {
						issues.push({
							severity: 'error',
							type: 'invalid-pr',
							source: id,
							file: e.file,
							target: ref,
							message: `${id} has malformed pr "${ref}" — expected <org>/<repo>#<number>`,
						});
					}
				}
			}
		}

		// `released-in` on spec — required when shipped, format-checked when set.
		if (e.type === 'spec') {
			const releasedIn = (e.attributes['released-in'] || '').trim();
			const status = e.attributes.status || '';
			if (status === 'shipped' && !releasedIn) {
				issues.push({
					severity: 'error',
					type: 'shipped-without-release',
					source: id,
					file: e.file,
					message: `${id} is shipped but has no released-in="vX.Y.Z"`,
				});
			}
			if (releasedIn && !RELEASED_IN_RE.test(releasedIn)) {
				issues.push({
					severity: 'error',
					type: 'invalid-released-in',
					source: id,
					file: e.file,
					target: releasedIn,
					message: `${id} has malformed released-in "${releasedIn}" — expected semver (e.g. v0.11.4)`,
				});
			}
		}
	}
	return issues;
}

function checkSupersedes(entities: PlanEntity[], knownIds: Set<string>): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	for (const e of entities) {
		if (e.type !== 'work') continue;
		const id = e.attributes.id || e.file;
		const status = e.attributes.status || '';
		const supersedes = (e.attributes.supersedes || '').trim();

		// A `superseded` work item should point at the item that replaced it.
		if (status === 'superseded' && !supersedes) {
			issues.push({
				severity: 'warning',
				type: 'superseded-without-target',
				source: id,
				file: e.file,
				message: `${id} is superseded but has no supersedes="…" pointing at its replacement`,
			});
		}

		// A set `supersedes` must resolve to a known entity.
		if (supersedes && !knownIds.has(supersedes)) {
			issues.push({
				severity: 'warning',
				type: 'broken-supersedes',
				source: id,
				file: e.file,
				target: supersedes,
				message: `${id} supersedes "${supersedes}" — entity not found`,
			});
		}
	}
	return issues;
}

function checkSourceRefs(entities: PlanEntity[], knownIds: Set<string>): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	for (const e of entities) {
		const id = e.attributes.id || e.attributes.name || e.file;
		const source = e.attributes.source;
		if (!source) continue;
		for (const refId of source.split(',').map(s => s.trim()).filter(Boolean)) {
			if (!knownIds.has(refId)) {
				issues.push({
					severity: 'error',
					type: 'broken-source',
					source: id,
					file: e.file,
					target: refId,
					message: `${id} has source "${refId}" — entity not found`,
				});
			}
		}
	}
	return issues;
}

function checkMilestoneRefs(entities: PlanEntity[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const milestoneNames = new Set<string>();
	for (const e of entities) {
		if (e.type === 'milestone') {
			const name = e.attributes.name || e.attributes.id;
			if (name) milestoneNames.add(name);
		}
	}

	for (const e of entities) {
		const id = e.attributes.id || e.attributes.name || e.file;
		const milestone = e.attributes.milestone;
		if (!milestone) continue;
		if (!milestoneNames.has(milestone)) {
			issues.push({
				severity: 'warning',
				type: 'unknown-milestone',
				source: id,
				file: e.file,
				target: milestone,
				message: `${id} references milestone "${milestone}" — not found`,
			});
		}
	}
	return issues;
}

/** Status values at or beyond "ready" for each rune type */
const ACTIVE_STATUSES: Record<string, Set<string>> = {
	work: new Set(['ready', 'in-progress', 'review', 'done']),
	bug: new Set(['confirmed', 'in-progress', 'fixed']),
	decision: new Set(['accepted']),
};

function checkRequiredSections(entities: PlanEntity[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	for (const e of entities) {
		const id = e.attributes.id || e.attributes.name || e.file;
		const status = e.attributes.status || '';
		const activeStatuses = ACTIVE_STATUSES[e.type];
		if (!activeStatuses || !activeStatuses.has(status)) continue;

		const present = new Set(e.knownSectionsPresent);

		if (e.type === 'work' && !present.has('Acceptance Criteria')) {
			issues.push({
				severity: 'warning',
				type: 'missing-section',
				source: id,
				file: e.file,
				message: `${id} (status: ${status}) has no Acceptance Criteria section`,
			});
		}

		if (e.type === 'bug') {
			for (const required of ['Steps to Reproduce', 'Expected', 'Actual']) {
				if (!present.has(required)) {
					issues.push({
						severity: 'warning',
						type: 'missing-section',
						source: id,
						file: e.file,
						message: `${id} (status: ${status}) has no ${required} section`,
					});
				}
			}
		}

		if (e.type === 'decision') {
			for (const required of ['Context', 'Decision']) {
				if (!present.has(required)) {
					issues.push({
						severity: 'warning',
						type: 'missing-section',
						source: id,
						file: e.file,
						message: `${id} (status: ${status}) has no ${required} section`,
					});
				}
			}
		}
	}
	return issues;
}

function checkOrphanedWorkItems(entities: PlanEntity[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	for (const e of entities) {
		if (e.type !== 'work' && e.type !== 'bug') continue;
		if (DONE_STATUSES.has(e.attributes.status || '')) continue;
		if (e.attributes.milestone) continue;
		const id = e.attributes.id || e.file;
		issues.push({
			severity: 'warning',
			type: 'no-milestone',
			source: id,
			file: e.file,
			message: `${id} has no milestone assigned`,
		});
	}
	return issues;
}

/** Matches the canonical `{PREFIX}-{digits}-` filename prefix. */
const FILENAME_ID_PREFIX_RE = /^(WORK|BUG|SPEC|ADR)-\d+-/;

function checkFilenameIdMatch(entities: PlanEntity[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	for (const e of entities) {
		if (e.type === 'milestone') continue;
		const id = e.attributes.id;
		if (!id) continue;

		const fileName = basename(e.file);
		const expectedPrefix = `${id}-`;
		if (fileName.startsWith(expectedPrefix)) continue;

		const source = e.attributes.id || e.file;
		if (FILENAME_ID_PREFIX_RE.test(fileName)) {
			const actualPrefix = fileName.match(FILENAME_ID_PREFIX_RE)![0].replace(/-$/, '');
			issues.push({
				severity: 'warning',
				type: 'filename-id-mismatch',
				source,
				file: e.file,
				message: `${id} filename starts with ${actualPrefix} — run \`refrakt plan migrate filenames --apply\` to fix`,
			});
		} else {
			issues.push({
				severity: 'warning',
				type: 'filename-missing-id',
				source,
				file: e.file,
				message: `${id} filename lacks ID prefix — run \`refrakt plan migrate filenames --apply\` to fix`,
			});
		}
	}
	return issues;
}

function checkCompletedMilestones(entities: PlanEntity[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const milestones = entities.filter(e => e.type === 'milestone' && e.attributes.status === 'complete');
	const workItems = entities.filter(e => e.type === 'work' || e.type === 'bug');

	for (const m of milestones) {
		const name = m.attributes.name || m.attributes.id || '';
		const openItems = workItems.filter(w =>
			w.attributes.milestone === name && !DONE_STATUSES.has(w.attributes.status || '')
		);
		for (const item of openItems) {
			const itemId = item.attributes.id || item.file;
			issues.push({
				severity: 'warning',
				type: 'complete-milestone-open-item',
				source: name,
				file: m.file,
				target: itemId,
				message: `${name} marked complete but ${itemId} is still ${item.attributes.status || 'unknown'}`,
			});
		}
	}
	return issues;
}

export function runValidate(options: ValidateOptions): ValidateResult {
	const { dir, strict = false } = options;
	const entities = scanPlanFiles(dir, { cache: true });

	const knownIds = new Set<string>();
	for (const e of entities) {
		const id = e.attributes.id || e.attributes.name;
		if (id) knownIds.add(id);
	}

	const issues: ValidationIssue[] = [
		...checkBrokenRefs(entities, knownIds),
		...checkDuplicateIds(entities),
		...checkInvalidAttributes(entities),
		...checkPrAndRelease(entities),
		...checkSupersedes(entities, knownIds),
		...checkSourceRefs(entities, knownIds),
		...checkMilestoneRefs(entities),
		...checkCircularDeps(entities, knownIds),
		...checkRequiredSections(entities),
		...checkOrphanedWorkItems(entities),
		...checkCompletedMilestones(entities),
		...checkResolutions(entities, dir),
		...checkFilenameIdMatch(entities),
	];

	let errors = 0;
	let warnings = 0;
	let info = 0;
	for (const issue of issues) {
		if (issue.severity === 'error') errors++;
		else if (issue.severity === 'warning') {
			if (strict) {
				issue.severity = 'error';
				errors++;
			} else {
				warnings++;
			}
		} else {
			info++;
		}
	}

	const exitCode = errors > 0 ? EXIT_ERRORS : EXIT_SUCCESS;

	return { scanned: entities.length, issues, counts: { errors, warnings, info }, exitCode };
}
