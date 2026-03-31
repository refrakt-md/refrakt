import { useSchema } from '@refrakt-md/types';
import { Spec } from './schema/spec.js';
import { Work } from './schema/work.js';
import { Bug } from './schema/bug.js';
import { Decision } from './schema/decision.js';
import { Milestone } from './schema/milestone.js';
import { Backlog } from './schema/backlog.js';
import { DecisionLog } from './schema/decision-log.js';
import { PlanProgress } from './schema/plan-progress.js';
import { PlanActivity } from './schema/plan-activity.js';

export const schema = {
	Spec: useSchema(Spec).defineType('Spec'),
	Work: useSchema(Work).defineType('Work'),
	Bug: useSchema(Bug).defineType('Bug'),
	Decision: useSchema(Decision).defineType('Decision'),
	Milestone: useSchema(Milestone).defineType('Milestone'),
	Backlog: useSchema(Backlog).defineType('Backlog'),
	DecisionLog: useSchema(DecisionLog).defineType('DecisionLog'),
	PlanProgress: useSchema(PlanProgress).defineType('PlanProgress'),
	PlanActivity: useSchema(PlanActivity).defineType('PlanActivity'),
};

// --- Scanner types ---

export type PlanRuneType = 'spec' | 'work' | 'bug' | 'decision' | 'milestone';

export interface Criterion {
	text: string;
	checked: boolean;
}

export interface Resolution {
	/** ISO date from "Completed:" line */
	date?: string;
	/** Branch name from "Branch:" line (backticks stripped) */
	branch?: string;
	/** PR reference from "PR:" line */
	pr?: string;
	/** Full resolution section content (excluding parsed metadata lines) */
	body: string;
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
	/** Parsed resolution section, if present */
	resolution?: Resolution;
	/** File modification time (ms since epoch) */
	mtime?: number;
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
	/** Path to a .timestamps.json cache file (for deploys without full git history). */
	timestampsCache?: string;
}
