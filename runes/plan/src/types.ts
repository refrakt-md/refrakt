import { useSchema } from '@refrakt-md/types';
import { Spec } from './schema/spec.js';
import { Work } from './schema/work.js';
import { Bug } from './schema/bug.js';
import { Decision } from './schema/decision.js';
import { Milestone } from './schema/milestone.js';

export const schema = {
	Spec: useSchema(Spec).defineType('Spec'),
	Work: useSchema(Work).defineType('Work'),
	Bug: useSchema(Bug).defineType('Bug'),
	Decision: useSchema(Decision).defineType('Decision'),
	Milestone: useSchema(Milestone).defineType('Milestone'),
};

// --- Scanner types ---

export type PlanRuneType = 'spec' | 'work' | 'bug' | 'decision' | 'milestone';

export interface Criterion {
	text: string;
	checked: boolean;
}

export interface PlanEntity {
	/** File path relative to the scan directory */
	file: string;
	/** Rune type */
	type: PlanRuneType;
	/** All attributes from the rune opening tag (id, status, priority, etc.) */
	attributes: Record<string, string>;
	/** Title extracted from the first H1 heading */
	title: string | undefined;
	/** Acceptance criteria checkboxes */
	criteria: Criterion[];
	/** Referenced entity IDs extracted from {% ref %} / {% xref %} tags */
	refs: string[];
}

export interface ScanCacheEntry {
	/** File modification time (ms since epoch) */
	mtime: number;
	/** File size in bytes */
	size: number;
	/** Cached scan result */
	entity: PlanEntity;
}

export interface ScanCache {
	[filePath: string]: ScanCacheEntry;
}

export interface ScanOptions {
	/** Enable mtime-based caching via .plan-cache.json */
	cache?: boolean;
}
