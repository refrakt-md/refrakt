import { describe, it, expect } from 'vitest';
import { parseFieldMatch, matchesFieldMatch, matchesFilterExpr, resolveEntityField, type MatchableEntity } from '../src/field-match.js';

function entity(over: Partial<MatchableEntity> & { data?: Record<string, unknown> } = {}): MatchableEntity {
	return { id: 'X-1', type: 'work', sourceUrl: '/work/X-1/', data: {}, ...over };
}

describe('parseFieldMatch', () => {
	it('parses field:value clauses, grouping same-field values', () => {
		const { clauses } = parseFieldMatch('status:ready status:review priority:high');
		expect(clauses).toEqual([
			{ field: 'status', values: ['ready', 'review'] },
			{ field: 'priority', values: ['high'] },
		]);
	});

	it('splits on the first colon only', () => {
		const { clauses } = parseFieldMatch('time:12:30');
		expect(clauses).toEqual([{ field: 'time', values: ['12:30'] }]);
	});

	it('honors double-quoted values with spaces', () => {
		const { clauses } = parseFieldMatch('title:"Getting Started" status:ready');
		expect(clauses[0]).toEqual({ field: 'title', values: ['Getting Started'] });
		expect(clauses[1]).toEqual({ field: 'status', values: ['ready'] });
	});

	it('warns on malformed clauses and skips them', () => {
		const { clauses, warnings } = parseFieldMatch('ready :empty status:ok');
		expect(clauses).toEqual([{ field: 'status', values: ['ok'] }]);
		expect(warnings).toHaveLength(2);
	});

	it('empty filter yields no clauses', () => {
		expect(parseFieldMatch('').clauses).toEqual([]);
		expect(parseFieldMatch(undefined).clauses).toEqual([]);
	});
});

describe('resolveEntityField', () => {
	it('resolves top-level fields then data, with url alias', () => {
		const e = entity({ id: 'W-9', data: { status: 'ready', url: '/d/u/' } });
		expect(resolveEntityField(e, 'id')).toBe('W-9');
		expect(resolveEntityField(e, 'status')).toBe('ready');
		expect(resolveEntityField(e, 'url')).toBe('/work/X-1/'); // sourceUrl wins
		const noSource = entity({ sourceUrl: undefined, data: { url: '/d/u/' } });
		expect(resolveEntityField(noSource, 'url')).toBe('/d/u/');
	});
});

describe('matchesFieldMatch — operators', () => {
	it('exact match (case-sensitive)', () => {
		const e = entity({ data: { status: 'ready' } });
		expect(matchesFilterExpr(e, 'status:ready')).toBe(true);
		expect(matchesFilterExpr(e, 'status:Ready')).toBe(false);
	});

	it('glob with trailing/leading/infix *', () => {
		expect(matchesFilterExpr(entity({ sourceUrl: '/blog/post-1/' }), 'url:/blog/*')).toBe(true);
		expect(matchesFilterExpr(entity({ sourceUrl: '/x/blog/' }), 'url:*/blog/')).toBe(true);
		expect(matchesFilterExpr(entity({ sourceUrl: '/docs/intro/' }), 'url:/blog/*')).toBe(false);
	});

	it('regex literal with metachars', () => {
		expect(matchesFilterExpr(entity({ id: 'SPEC-12' }), 'id:/^SPEC-\\d+$/')).toBe(true);
		expect(matchesFilterExpr(entity({ id: 'WORK-12' }), 'id:/^SPEC-\\d+$/')).toBe(false);
	});

	it('treats a slash-wrapped value with no metachars as exact, not regex', () => {
		expect(matchesFilterExpr(entity({ sourceUrl: '/blog/' }), 'url:/blog/')).toBe(true);
		expect(matchesFilterExpr(entity({ sourceUrl: '/blog/post/' }), 'url:/blog/')).toBe(false);
	});

	it('array / comma-joined fields match on membership', () => {
		expect(matchesFilterExpr(entity({ data: { tags: 'docs,runes,plan' } }), 'tags:runes')).toBe(true);
		expect(matchesFilterExpr(entity({ data: { tags: ['a', 'b'] } }), 'tags:b')).toBe(true);
		expect(matchesFilterExpr(entity({ data: { tags: 'docs' } }), 'tags:runes')).toBe(false);
	});
});

describe('matchesFieldMatch — combination', () => {
	it('same field OR, different fields AND', () => {
		const e = entity({ data: { status: 'ready', priority: 'high' } });
		expect(matchesFilterExpr(e, 'status:ready status:review')).toBe(true);
		expect(matchesFilterExpr(e, 'status:done status:review')).toBe(false);
		expect(matchesFilterExpr(e, 'status:ready priority:high')).toBe(true);
		expect(matchesFilterExpr(e, 'status:ready priority:low')).toBe(false);
	});

	it('empty filter matches everything', () => {
		expect(matchesFieldMatch(entity(), parseFieldMatch(''))).toBe(true);
	});
});
