import { scanPlanFiles } from '../scanner.js';
import type { PlanEntity, PlanRuneType } from '../types.js';

// --- Constants ---

const PRIORITY_ORDER: Record<string, number> = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
};

const DONE_STATUSES = new Set(['done', 'fixed']);

const READY_STATUSES: Record<string, string[]> = {
	work: ['ready'],
	bug: ['confirmed'],
};

// --- Exit codes ---

export const EXIT_SUCCESS = 0;
export const EXIT_INVALID_ARGS = 2;

// --- Types ---

export interface StatusOptions {
	dir: string;
	milestone?: string;
	formatJson?: boolean;
}

export interface StatusCounts {
	total: number;
	byStatus: Record<string, number>;
}

export interface MilestoneProgress {
	name: string;
	status: string;
	target?: string;
	done: number;
	total: number;
}

export interface BlockedItem {
	id: string;
	title: string | undefined;
	blockedBy: string[];
}

export interface ReadyItem {
	id: string;
	title: string | undefined;
	type: PlanRuneType;
	priority: string;
	complexity: string;
}

export interface DoneItem {
	id: string;
	title: string | undefined;
	date?: string;
	pr?: string;
}

export interface Warning {
	type: 'broken-ref' | 'no-milestone' | 'stale-in-progress';
	source: string;
	target?: string;
	message: string;
}

export interface StatusResult {
	milestone?: MilestoneProgress;
	counts: Record<string, StatusCounts>;
	blocked: BlockedItem[];
	ready: ReadyItem[];
	done: DoneItem[];
	warnings: Warning[];
}

// --- Implementation ---

function countByStatus(entities: PlanEntity[]): StatusCounts {
	const byStatus: Record<string, number> = {};
	for (const e of entities) {
		const status = e.attributes.status || 'unknown';
		byStatus[status] = (byStatus[status] || 0) + 1;
	}
	return { total: entities.length, byStatus };
}

function findBlockedItems(entities: PlanEntity[], allEntities: PlanEntity[]): BlockedItem[] {
	const entityById = new Map<string, PlanEntity>();
	for (const e of allEntities) {
		const id = e.attributes.id || e.attributes.name;
		if (id) entityById.set(id, e);
	}

	const blocked: BlockedItem[] = [];
	for (const e of entities) {
		if (e.attributes.status !== 'blocked') continue;
		const id = e.attributes.id || '';
		const blockedBy = e.refs.filter(ref => {
			const dep = entityById.get(ref);
			return dep && !DONE_STATUSES.has(dep.attributes.status || '');
		});
		blocked.push({ id, title: e.title, blockedBy });
	}
	return blocked;
}

function findReadyItems(entities: PlanEntity[], allEntities: PlanEntity[]): ReadyItem[] {
	const entityById = new Map<string, PlanEntity>();
	for (const e of allEntities) {
		const id = e.attributes.id || e.attributes.name;
		if (id) entityById.set(id, e);
	}

	const ready: ReadyItem[] = [];
	for (const e of entities) {
		const statuses = READY_STATUSES[e.type];
		if (!statuses || !statuses.includes(e.attributes.status || '')) continue;

		// Check dependencies are met
		const depsUnmet = e.refs.some(ref => {
			const dep = entityById.get(ref);
			return dep && (dep.type === 'work' || dep.type === 'bug') && !DONE_STATUSES.has(dep.attributes.status || '');
		});
		if (depsUnmet) continue;

		ready.push({
			id: e.attributes.id || '',
			title: e.title,
			type: e.type,
			priority: e.attributes.priority || 'medium',
			complexity: e.attributes.complexity || 'unknown',
		});
	}

	// Sort by priority then complexity
	ready.sort((a, b) => {
		const pa = PRIORITY_ORDER[a.priority] ?? 99;
		const pb = PRIORITY_ORDER[b.priority] ?? 99;
		if (pa !== pb) return pa - pb;
		return 0;
	});

	return ready.slice(0, 5);
}

function findDoneItems(entities: PlanEntity[]): DoneItem[] {
	const items: DoneItem[] = [];
	for (const e of entities) {
		if (!DONE_STATUSES.has(e.attributes.status || '')) continue;
		if (!e.resolution) continue;
		items.push({
			id: e.attributes.id || '',
			title: e.title,
			date: e.resolution.date,
			pr: e.resolution.pr,
		});
	}
	// Sort by date descending (most recent first)
	items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
	return items.slice(0, 10);
}

function findWarnings(allEntities: PlanEntity[]): Warning[] {
	const warnings: Warning[] = [];
	const knownIds = new Set<string>();

	for (const e of allEntities) {
		const id = e.attributes.id || e.attributes.name;
		if (id) knownIds.add(id);
	}

	for (const e of allEntities) {
		const id = e.attributes.id || e.attributes.name || e.file;

		// Broken refs
		for (const ref of e.refs) {
			if (!knownIds.has(ref)) {
				warnings.push({
					type: 'broken-ref',
					source: id,
					target: ref,
					message: `${id} references ${ref} — not found`,
				});
			}
		}

		// Orphaned work items (no milestone)
		if ((e.type === 'work' || e.type === 'bug') && !e.attributes.milestone && !DONE_STATUSES.has(e.attributes.status || '')) {
			warnings.push({
				type: 'no-milestone',
				source: id,
				message: `${id} has no milestone assigned`,
			});
		}
	}

	return warnings;
}

function findMilestoneProgress(milestones: PlanEntity[], workItems: PlanEntity[], scopeName?: string): MilestoneProgress | undefined {
	let milestone: PlanEntity | undefined;

	if (scopeName) {
		milestone = milestones.find(m => (m.attributes.name || m.attributes.id) === scopeName);
	} else {
		// Find the active milestone
		milestone = milestones.find(m => m.attributes.status === 'active');
	}

	if (!milestone) return undefined;

	const name = milestone.attributes.name || milestone.attributes.id || '';
	const items = workItems.filter(w => w.attributes.milestone === name);
	const done = items.filter(w => DONE_STATUSES.has(w.attributes.status || '')).length;

	return {
		name,
		status: milestone.attributes.status || 'planning',
		target: milestone.attributes.target,
		done,
		total: items.length,
	};
}

export function runStatus(options: StatusOptions): StatusResult {
	const { dir, milestone: milestoneName } = options;
	const allEntities = scanPlanFiles(dir, { cache: true });

	const byType: Record<string, PlanEntity[]> = {};
	for (const e of allEntities) {
		(byType[e.type] ||= []).push(e);
	}

	const specs = byType['spec'] || [];
	const work = byType['work'] || [];
	const bugs = byType['bug'] || [];
	const decisions = byType['decision'] || [];
	const milestones = byType['milestone'] || [];
	const workAndBugs = [...work, ...bugs];

	const counts: Record<string, StatusCounts> = {
		specs: countByStatus(specs),
		work: countByStatus(work),
		bugs: countByStatus(bugs),
		decisions: countByStatus(decisions),
	};

	const milestoneProgress = findMilestoneProgress(milestones, workAndBugs, milestoneName);
	const blocked = findBlockedItems(workAndBugs, allEntities);
	const ready = findReadyItems(workAndBugs, allEntities);
	const done = findDoneItems(workAndBugs);
	const warnings = findWarnings(allEntities);

	return { milestone: milestoneProgress, counts, blocked, ready, done, warnings };
}
