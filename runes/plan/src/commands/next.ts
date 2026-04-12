import { scanPlanFiles } from '../scanner.js';
import type { PlanEntity } from '../types.js';

// --- Priority and complexity sort orders ---

const PRIORITY_ORDER: Record<string, number> = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
};

const COMPLEXITY_ORDER: Record<string, number> = {
	trivial: 0,
	simple: 1,
	moderate: 2,
	complex: 3,
	unknown: 4,
};

/** Statuses that indicate an entity's work is complete */
const DONE_STATUSES = new Set(['done', 'fixed']);

/** Statuses that indicate an item is actionable */
const READY_STATUSES: Record<string, string[]> = {
	work: ['ready'],
	bug: ['confirmed'],
};

// --- Exit codes ---

export const EXIT_FOUND = 0;
export const EXIT_NO_MATCHES = 1;
export const EXIT_INVALID_ARGS = 2;

export interface NextOptions {
	dir: string;
	milestone?: string;
	tag?: string;
	assignee?: string;
	type?: 'work' | 'bug' | 'all';
	count?: number;
	formatJson?: boolean;
}

export interface NextResult {
	items: NextItem[];
}

export interface NextItem {
	id: string;
	title: string | undefined;
	type: string;
	priority: string;
	complexity: string;
	file: string;
	criteria: { text: string; checked: boolean }[];
	refs: string[];
	attributes: Record<string, string>;
}

/**
 * Find the next actionable work items, respecting dependencies and filters.
 */
export function runNext(options: NextOptions): NextResult {
	const { dir, milestone, tag, assignee, type = 'all', count = 1 } = options;

	const entities = scanPlanFiles(dir);

	// Build status lookup: ID → status
	const statusMap = new Map<string, string>();
	for (const e of entities) {
		const id = e.attributes.id ?? e.attributes.name;
		if (id) statusMap.set(id, e.attributes.status ?? '');
	}

	// Filter to actionable types
	const typeFilter = type === 'all' ? ['work', 'bug'] : [type];

	let candidates = entities.filter(e => {
		if (!typeFilter.includes(e.type)) return false;
		const readyStatuses = READY_STATUSES[e.type];
		if (!readyStatuses) return false;
		const status = e.attributes.status ?? '';
		return readyStatuses.includes(status);
	});

	// Exclude items with unfinished dependencies.
	// If the entity has scoped refs, only refs in the Dependencies section block.
	// Otherwise, fall back to treating all refs as potential blockers (backward compat).
	candidates = candidates.filter(e => {
		const hasDepsSection = e.knownSectionsPresent.includes('Dependencies');
		if (hasDepsSection) {
			// Section-aware: only Dependencies refs block
			for (const ref of e.scopedRefs) {
				if (ref.section !== 'Dependencies') continue;
				const refStatus = statusMap.get(ref.id);
				if (refStatus !== undefined && !DONE_STATUSES.has(refStatus)) {
					return false;
				}
			}
		} else {
			// Fallback: all refs treated as potential blockers (same as before)
			for (const refId of e.refs) {
				const refStatus = statusMap.get(refId);
				if (refStatus !== undefined && !DONE_STATUSES.has(refStatus)) {
					return false;
				}
			}
		}
		return true;
	});

	// Apply filters
	if (milestone) {
		candidates = candidates.filter(e => e.attributes.milestone === milestone);
	}
	if (tag) {
		candidates = candidates.filter(e => {
			const tags = (e.attributes.tags ?? '').split(',').map(t => t.trim());
			return tags.includes(tag);
		});
	}
	if (assignee) {
		candidates = candidates.filter(e => e.attributes.assignee === assignee);
	}

	// Sort: priority (critical first), then complexity (simpler first)
	candidates.sort((a, b) => {
		const pa = PRIORITY_ORDER[a.attributes.priority ?? 'medium'] ?? 2;
		const pb = PRIORITY_ORDER[b.attributes.priority ?? 'medium'] ?? 2;
		if (pa !== pb) return pa - pb;

		const ca = COMPLEXITY_ORDER[a.attributes.complexity ?? 'unknown'] ?? 4;
		const cb = COMPLEXITY_ORDER[b.attributes.complexity ?? 'unknown'] ?? 4;
		return ca - cb;
	});

	const selected = candidates.slice(0, count);

	return {
		items: selected.map(e => ({
			id: e.attributes.id ?? e.attributes.name ?? '',
			title: e.title,
			type: e.type,
			priority: e.attributes.priority ?? 'medium',
			complexity: e.attributes.complexity ?? 'unknown',
			file: e.file,
			criteria: e.criteria,
			refs: e.refs,
			attributes: e.attributes,
		})),
	};
}
