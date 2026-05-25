import { describe, it, expect } from 'vitest';
import { parseFilter, matchesFilter, sortEntities, groupEntities } from '../src/filter.js';
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

describe('sortEntities', () => {
	it('sorts by priority', () => {
		const entities = [
			makeEntity({ id: 'W-1', data: { priority: 'low' } }),
			makeEntity({ id: 'W-2', data: { priority: 'critical' } }),
			makeEntity({ id: 'W-3', data: { priority: 'high' } }),
		];
		const sorted = sortEntities(entities, 'priority');
		expect(sorted.map(e => e.id)).toEqual(['W-2', 'W-3', 'W-1']);
	});

	it('sorts by date reverse chronological', () => {
		const entities = [
			makeEntity({ id: 'D-1', data: { date: '2026-01-01' } }),
			makeEntity({ id: 'D-2', data: { date: '2026-03-15' } }),
			makeEntity({ id: 'D-3', data: { date: '2026-02-01' } }),
		];
		const sorted = sortEntities(entities, 'date');
		expect(sorted.map(e => e.id)).toEqual(['D-2', 'D-3', 'D-1']);
	});

	it('sorts by id alphabetically', () => {
		const entities = [
			makeEntity({ id: 'W-3', data: { id: 'W-3' } }),
			makeEntity({ id: 'W-1', data: { id: 'W-1' } }),
			makeEntity({ id: 'W-2', data: { id: 'W-2' } }),
		];
		const sorted = sortEntities(entities, 'id');
		expect(sorted.map(e => e.id)).toEqual(['W-1', 'W-2', 'W-3']);
	});
});

describe('groupEntities', () => {
	it('groups by status', () => {
		const entities = [
			makeEntity({ id: 'W-1', data: { status: 'ready' } }),
			makeEntity({ id: 'W-2', data: { status: 'done' } }),
			makeEntity({ id: 'W-3', data: { status: 'ready' } }),
		];
		const groups = groupEntities(entities, 'status');
		expect(groups.size).toBe(2);
		expect(groups.get('ready')!).toHaveLength(2);
		expect(groups.get('done')!).toHaveLength(1);
	});

	it('uses (none) for empty field values', () => {
		const entities = [
			makeEntity({ id: 'W-1', data: { milestone: '' } }),
		];
		const groups = groupEntities(entities, 'milestone');
		expect(groups.has('(none)')).toBe(true);
	});
});
