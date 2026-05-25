import type { EntityRegistration } from '@refrakt-md/types';
import { parseFieldMatch, matchesFieldMatch, type ParsedFieldMatch } from '@refrakt-md/runes';

export type ParsedFilter = ParsedFieldMatch;

/**
 * Parse a filter expression using the shared field-match grammar (SPEC-070).
 * Same field → OR; different fields → AND. Supports exact / glob / regex,
 * quoted values, and `url`-alias resolution.
 */
export function parseFilter(expr: string): ParsedFilter {
	return parseFieldMatch(expr);
}

/** Test whether an entity matches all filter conditions (shared matcher). */
export function matchesFilter(entity: EntityRegistration, filter: ParsedFilter): boolean {
	return matchesFieldMatch(entity, filter);
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
