import { scanPlanFiles } from '../scanner.js';
import type { PlanEntity, PlanRuneType } from '../types.js';

// --- Valid attribute values per type ---

const VALID_STATUSES: Record<string, Set<string>> = {
	spec: new Set(['draft', 'review', 'accepted', 'superseded', 'deprecated']),
	work: new Set(['draft', 'ready', 'in-progress', 'review', 'done', 'blocked', 'pending']),
	bug: new Set(['reported', 'confirmed', 'in-progress', 'fixed', 'wontfix', 'duplicate']),
	decision: new Set(['proposed', 'accepted', 'superseded', 'deprecated']),
	milestone: new Set(['planning', 'active', 'complete']),
};

const VALID_PRIORITIES = new Set(['critical', 'high', 'medium', 'low']);
const VALID_SEVERITIES = new Set(['critical', 'major', 'minor', 'trivial']);

const DONE_STATUSES = new Set(['done', 'fixed']);

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
		...checkCircularDeps(entities, knownIds),
		...checkOrphanedWorkItems(entities),
		...checkCompletedMilestones(entities),
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
