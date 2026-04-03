import { existsSync } from 'fs';
import { scanPlanFiles } from '../scanner.js';
import type { PlanRuneType } from '../types.js';

/** ID prefix for each plan type (milestones use semver, not auto-assignable) */
const ID_PREFIXES: Partial<Record<PlanRuneType, string>> = {
	spec: 'SPEC-',
	work: 'WORK-',
	bug: 'BUG-',
	decision: 'ADR-',
};

export type AutoIdType = 'spec' | 'work' | 'bug' | 'decision';

const AUTO_ID_TYPES: AutoIdType[] = ['spec', 'work', 'bug', 'decision'];

export function isAutoIdType(type: string): type is AutoIdType {
	return AUTO_ID_TYPES.includes(type as AutoIdType);
}

/** Scan plan files, returning empty array if the directory doesn't exist yet. */
function safeScan(dir: string) {
	if (!existsSync(dir)) return [];
	return scanPlanFiles(dir, { cache: true });
}

/**
 * Extract the numeric portion from an ID like "WORK-075" → 75.
 * Returns 0 if the ID doesn't match the expected prefix.
 */
function extractNumber(id: string, prefix: string): number {
	if (!id.startsWith(prefix)) return 0;
	const num = parseInt(id.slice(prefix.length), 10);
	return isNaN(num) ? 0 : num;
}

/**
 * Scan plan files and return the next available ID for a given type.
 * Returns e.g. "WORK-076" if the highest existing WORK ID is WORK-075.
 */
export function nextId(dir: string, type: AutoIdType): string {
	const prefix = ID_PREFIXES[type]!;
	const entities = safeScan(dir);

	let highest = 0;
	for (const entity of entities) {
		const id = entity.attributes.id || entity.attributes.name;
		if (!id) continue;
		const num = extractNumber(id, prefix);
		if (num > highest) highest = num;
	}

	const next = highest + 1;
	return `${prefix}${String(next).padStart(3, '0')}`;
}

/**
 * Scan plan files and check if a given ID already exists.
 */
export function idExists(dir: string, id: string): string | undefined {
	const entities = safeScan(dir);
	for (const entity of entities) {
		const entityId = entity.attributes.id || entity.attributes.name;
		if (entityId === id) return entity.file;
	}
	return undefined;
}

export interface NextIdResult {
	type: AutoIdType;
	nextId: string;
	highest: string | null;
}

export function runNextId(dir: string, type: AutoIdType): NextIdResult {
	const prefix = ID_PREFIXES[type]!;
	const entities = safeScan(dir);

	let highest = 0;
	for (const entity of entities) {
		const id = entity.attributes.id || entity.attributes.name;
		if (!id) continue;
		const num = extractNumber(id, prefix);
		if (num > highest) highest = num;
	}

	const next = highest + 1;
	const nextIdStr = `${prefix}${String(next).padStart(3, '0')}`;
	const highestStr = highest > 0 ? `${prefix}${String(highest).padStart(3, '0')}` : null;

	return { type, nextId: nextIdStr, highest: highestStr };
}
