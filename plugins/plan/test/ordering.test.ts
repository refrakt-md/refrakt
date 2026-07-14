import { describe, it, expect } from 'vitest';
import { buildOrdering, groupEntities, sortEntities } from '@refrakt-md/runes';
import type { EntityRegistration } from '@refrakt-md/types';
import plan from '../src/index.js';

const ent = (status: string, id: string): EntityRegistration => ({ type: 'work', id, data: { status } });

describe('plan ordering override (WORK-283)', () => {
	it('declares an actionable-first work.status order that diverges from matches', () => {
		expect(plan.theme?.orderings?.work?.status).toEqual(
			['blocked', 'in-progress', 'review', 'ready', 'pending', 'draft', 'done', 'cancelled', 'superseded'],
		);
	});

	it('flows through buildOrdering → group/sort in dashboard order', () => {
		// Mirror what site.ts threads into embedConfig.orderings.
		const ord = buildOrdering({ tags: {}, nodes: {}, orderings: plan.theme!.orderings } as never);
		const items = [ent('done', 'A'), ent('blocked', 'B'), ent('review', 'C'), ent('ready', 'D')];
		expect([...groupEntities(items, 'status', ord).keys()]).toEqual(['blocked', 'review', 'ready', 'done']);
		expect(sortEntities(items, 'status', ord).map((e) => e.id)).toEqual(['B', 'C', 'D', 'A']);
	});
});
