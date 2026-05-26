import { describe, it, expect } from 'vitest';
import type { EntityRegistration } from '@refrakt-md/types';
import { Ordering, buildOrdering, sortEntities, groupEntities } from '../src/collection-helpers.js';

function ent(type: string, id: string, data: Record<string, unknown>): EntityRegistration {
	return { type, id, data };
}

const embed = {
	tags: {
		work: { attributes: { priority: { matches: ['critical', 'high', 'medium', 'low'] }, status: { matches: ['draft', 'ready', 'in-progress', 'review', 'done'] } } },
		bug: { attributes: { status: { matches: ['confirmed', 'in-progress', 'fixed'] } } },
	},
	nodes: {},
};

describe('domain-aware ordering (WORK-276)', () => {
	it('derives default order from a rune attribute matches array', () => {
		const ord = buildOrdering(embed as never);
		expect(ord.order('work', 'priority')).toEqual(['critical', 'high', 'medium', 'low']);
		const items = [ent('work', 'W-1', { priority: 'low' }), ent('work', 'W-2', { priority: 'critical' }), ent('work', 'W-3', { priority: 'medium' })];
		expect(sortEntities(items, 'priority', ord).map((e) => e.id)).toEqual(['W-2', 'W-3', 'W-1']);
	});

	it('an explicit override beats the matches default', () => {
		const ord = new Ordering(
			{ work: { status: ['draft', 'ready', 'in-progress', 'review', 'done'] } },
			{ work: { status: ['in-progress', 'review', 'ready', 'draft', 'done'] } },
		);
		const items = [ent('work', 'A', { status: 'draft' }), ent('work', 'B', { status: 'in-progress' })];
		expect(sortEntities(items, 'status', ord).map((e) => e.id)).toEqual(['B', 'A']);
	});

	it('falls back to lexical/numeric for unregistered (type, field)', () => {
		const ord = buildOrdering(embed as never);
		const items = [ent('work', 'A', { title: 'Zebra' }), ent('work', 'B', { title: 'Apple' })];
		expect(sortEntities(items, 'title', ord).map((e) => e.id)).toEqual(['B', 'A']);
	});

	it('ranks each entity within its own type for mixed-type sets', () => {
		const ord = buildOrdering(embed as never);
		// work.status: ...in-progress(2)...; bug.status: confirmed(0), in-progress(1), fixed(2)
		const items = [
			ent('work', 'W-done', { status: 'done' }),       // rank 4
			ent('bug', 'B-confirmed', { status: 'confirmed' }), // rank 0
			ent('work', 'W-ready', { status: 'ready' }),      // rank 1
		];
		expect(sortEntities(items, 'status', ord).map((e) => e.id)).toEqual(['B-confirmed', 'W-ready', 'W-done']);
	});

	it('orders groups by representative rank', () => {
		const ord = buildOrdering(embed as never);
		const items = [
			ent('work', 'A', { status: 'done' }),
			ent('work', 'B', { status: 'draft' }),
			ent('work', 'C', { status: 'review' }),
		];
		expect([...groupEntities(items, 'status', ord).keys()]).toEqual(['draft', 'review', 'done']);
	});

	it('without an ordering, group order is insertion order (back-compat)', () => {
		const items = [ent('work', 'A', { status: 'done' }), ent('work', 'B', { status: 'draft' })];
		expect([...groupEntities(items, 'status').keys()]).toEqual(['done', 'draft']);
	});
});
