import type { EntityRegistration } from '@refrakt-md/types';

export interface ParsedFilter {
	[field: string]: string[];
}

/**
 * Parse a filter expression: space-separated `field:value` pairs.
 * Multiple values for the same field act as OR. Different fields act as AND.
 * Example: "status:ready priority:high priority:critical"
 */
export function parseFilter(expr: string): ParsedFilter {
	const filter: ParsedFilter = {};
	if (!expr) return filter;

	for (const part of expr.split(/\s+/)) {
		const colon = part.indexOf(':');
		if (colon === -1) continue;
		const field = part.slice(0, colon);
		const value = part.slice(colon + 1);
		if (!field || !value) continue;
		if (!filter[field]) filter[field] = [];
		filter[field].push(value);
	}
	return filter;
}

/** Test whether an entity's data matches all filter conditions */
export function matchesFilter(entity: EntityRegistration, filter: ParsedFilter): boolean {
	for (const [field, values] of Object.entries(filter)) {
		const entityValue = String(entity.data[field] ?? '');
		// For comma-separated fields like tags, check if any filter value is contained
		if (field === 'tags') {
			const entityTags = entityValue.split(',').map(t => t.trim().toLowerCase());
			if (!values.some(v => entityTags.includes(v.toLowerCase()))) return false;
		} else {
			if (!values.includes(entityValue)) return false;
		}
	}
	return true;
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const COMPLEXITY_ORDER: Record<string, number> = { trivial: 0, simple: 1, moderate: 2, complex: 3, unknown: 4 };

/** Sort entities by a field. Returns a new sorted array. */
export function sortEntities(entities: EntityRegistration[], sortField: string): EntityRegistration[] {
	return [...entities].sort((a, b) => {
		const aVal = String(a.data[sortField] ?? '');
		const bVal = String(b.data[sortField] ?? '');

		if (sortField === 'priority') {
			return (PRIORITY_ORDER[aVal] ?? 99) - (PRIORITY_ORDER[bVal] ?? 99);
		}
		if (sortField === 'complexity') {
			return (COMPLEXITY_ORDER[aVal] ?? 99) - (COMPLEXITY_ORDER[bVal] ?? 99);
		}
		if (sortField === 'date') {
			// Reverse chronological
			return bVal.localeCompare(aVal);
		}
		return aVal.localeCompare(bVal);
	});
}

/** Group entities by a field. Returns Map preserving insertion order. */
export function groupEntities(entities: EntityRegistration[], groupField: string): Map<string, EntityRegistration[]> {
	const groups = new Map<string, EntityRegistration[]>();
	for (const entity of entities) {
		const key = String(entity.data[groupField] ?? '') || '(none)';
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(entity);
	}
	return groups;
}
