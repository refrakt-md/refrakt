import { describe, it, expect } from 'vitest';
import { parseFilter, matchesFilter } from '../src/filter.js';
import type { EntityRegistration } from '@refrakt-md/types';

function makeEntity(overrides: Partial<EntityRegistration> & { data: Record<string, unknown> }): EntityRegistration {
	return {
		type: overrides.type ?? 'work',
		id: overrides.id ?? 'W-1',
		sourceUrl: overrides.sourceUrl ?? '/test',
		data: overrides.data,
	};
}

describe('parseFilter', () => {
	it('parses simple field:value pairs', () => {
		expect(parseFilter('status:ready').clauses).toEqual([{ field: 'status', values: ['ready'] }]);
	});

	it('parses multiple pairs', () => {
		expect(parseFilter('status:ready priority:high').clauses).toEqual([
			{ field: 'status', values: ['ready'] },
			{ field: 'priority', values: ['high'] },
		]);
	});

	it('collects multiple values for the same field (OR)', () => {
		expect(parseFilter('priority:high priority:critical').clauses).toEqual([
			{ field: 'priority', values: ['high', 'critical'] },
		]);
	});

	it('returns empty for empty string', () => {
		expect(parseFilter('').clauses).toEqual([]);
	});

	it('ignores malformed entries with a warning', () => {
		const parsed = parseFilter('nocolon status:ready');
		expect(parsed.clauses).toEqual([{ field: 'status', values: ['ready'] }]);
		expect(parsed.warnings).toHaveLength(1);
	});
});

describe('matchesFilter', () => {
	it('matches single field', () => {
		const entity = makeEntity({ data: { status: 'ready', priority: 'high' } });
		expect(matchesFilter(entity, parseFilter('status:ready'))).toBe(true);
		expect(matchesFilter(entity, parseFilter('status:done'))).toBe(false);
	});

	it('OR within same field', () => {
		const entity = makeEntity({ data: { priority: 'high' } });
		expect(matchesFilter(entity, parseFilter('priority:high priority:critical'))).toBe(true);
	});

	it('AND across different fields', () => {
		const entity = makeEntity({ data: { status: 'ready', priority: 'high' } });
		expect(matchesFilter(entity, parseFilter('status:ready priority:high'))).toBe(true);
		expect(matchesFilter(entity, parseFilter('status:ready priority:low'))).toBe(false);
	});

	it('handles tags with comma-separated values', () => {
		const entity = makeEntity({ data: { tags: 'css, layout, runes' } });
		expect(matchesFilter(entity, parseFilter('tags:css'))).toBe(true);
		expect(matchesFilter(entity, parseFilter('tags:missing'))).toBe(false);
	});

	it('matches everything with empty filter', () => {
		const entity = makeEntity({ data: { status: 'ready' } });
		expect(matchesFilter(entity, parseFilter(''))).toBe(true);
	});
});

// `sortEntities` / `groupEntities` moved to `@refrakt-md/runes`
// (`collection-helpers.ts`) as part of SPEC-072 / WORK-283. Domain-aware
// ordering is exercised by `ordering.test.ts` (plan-side override) and by
// `packages/runes/test/collection-ordering.test.ts` (engine).
