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

/** A ref tag scoped to the section it appears in */
export interface ScopedRef {
	/** The referenced entity ID */
	id: string;
	/** The canonical section name this ref appears in, or undefined if not in a known section */
	section?: string;
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
	/** Section-scoped refs (refs tagged with the section they appear in) */
	scopedRefs: ScopedRef[];
	/** Canonical names of known sections present in this entity */
	knownSectionsPresent: string[];
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
}
