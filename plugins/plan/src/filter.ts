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
