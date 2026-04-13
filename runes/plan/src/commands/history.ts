import { resolve, join } from 'node:path';
import { scanPlanFiles } from '../scanner.js';
import {
	extractEntityHistory,
	extractBatchHistory,
	readHistoryCache,
	writeHistoryCache,
	buildGlobalTimeline,
	type HistoryEvent,
	type AttributeChange,
	type CriteriaChange,
} from '../history.js';
import type { PlanEntity } from '../types.js';

export interface HistoryOptions {
	dir: string;
	/** Entity ID for single-entity mode (e.g. "WORK-024") */
	id?: string;
	/** Maximum events (single) or commits (global) to show */
	limit: number;
	/** Time filter: "7d", "30d", or ISO date */
	since?: string;
	/** Entity type filter: "work", "spec", "bug", "decision" — comma-separated */
	type?: string;
	/** Author filter (substring match) */
	author?: string;
	/** Status transition filter — show events where entity moved to this status */
	status?: string;
	/** Include content-only events in global mode */
	all?: boolean;
	/** JSON output */
	formatJson: boolean;
}

function findEntity(id: string, dir: string): { entity: PlanEntity; absPath: string } | null {
	const entities = scanPlanFiles(dir);
	const entity = entities.find(e => e.attributes.id === id || e.attributes.name === id);
	if (!entity) return null;
	return { entity, absPath: resolve(join(dir, entity.file)) };
}

/**
 * Convert --since value to a git-compatible --since string.
 * Accepts: "7d", "30d", "2w", or ISO date strings.
 */
function normalizeSince(since: string): string {
	const durationMatch = since.match(/^(\d+)([dwmy])$/);
	if (durationMatch) {
		const n = durationMatch[1];
		const unitMap: Record<string, string> = { d: 'days', w: 'weeks', m: 'months', y: 'years' };
		const unit = unitMap[durationMatch[2]] ?? 'days';
		return `${n} ${unit} ago`;
	}
	// Assume ISO date or other git-compatible format
	return since;
}

/**
 * Format a date string for display (e.g. "Apr 12").
 */
function formatDate(isoDate: string): string {
	const d = new Date(isoDate);
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, ' ')}`;
}

/**
 * Format a single attribute change for display.
 */
function formatAttrChange(change: AttributeChange): string {
	if (change.from === null) return `${change.field}: +${change.to}`;
	if (change.to === null) return `${change.field}: -${change.from}`;
	return `${change.field}: ${change.from} → ${change.to}`;
}

/**
 * Format a single criteria change for display.
 */
function formatCriteriaChange(change: CriteriaChange): string {
	switch (change.action) {
		case 'checked': return `☑ ${change.text}`;
		case 'unchecked': return `☐ ${change.text}`;
		case 'added': return `+ ${change.text}`;
		case 'removed': return `- ${change.text}`;
	}
}

// ─── Single-Entity Mode ───

function formatSingleEntity(entity: PlanEntity, events: HistoryEvent[], limit: number): string {
	const id = entity.attributes.id ?? entity.attributes.name ?? '';
	const title = entity.title ?? '(untitled)';
	const lines: string[] = [`${id}: ${title}`, ''];

	// Display newest-first
	const reversed = [...events].reverse().slice(0, limit);

	for (const event of reversed) {
		const date = formatDate(event.date);
		const hash = event.shortHash;

		if (event.kind === 'created') {
			const attrs = event.initialAttributes ?? {};
			const parts = Object.entries(attrs)
				.filter(([k]) => k !== 'id')
				.map(([, v]) => v);
			lines.push(`${date}  Created (${parts.join(', ')})${' '.repeat(Math.max(1, 40 - parts.join(', ').length))}${hash}`);
		} else {
			// First line: date + first change + hash
			const changeLines: string[] = [];

			if (event.attributeChanges) {
				for (const c of event.attributeChanges) {
					changeLines.push(formatAttrChange(c));
				}
			}
			if (event.criteriaChanges) {
				for (const c of event.criteriaChanges) {
					changeLines.push(formatCriteriaChange(c));
				}
			}
			if (event.kind === 'resolution') {
				changeLines.push('Resolution recorded');
			}
			if (event.kind === 'content') {
				changeLines.push('Content edited');
			}

			if (changeLines.length > 0) {
				lines.push(`${date}  ${changeLines[0]}${' '.repeat(Math.max(1, 48 - changeLines[0].length))}${hash}`);
				for (let i = 1; i < changeLines.length; i++) {
					lines.push(`        ${changeLines[i]}`);
				}
			}
		}
	}

	return lines.join('\n');
}

// ─── Global Mode ───

interface CommitGroup {
	hash: string;
	shortHash: string;
	date: string;
	author: string;
	message: string;
	entityEvents: Array<{ file: string; entityId: string; event: HistoryEvent }>;
}

function groupByCommit(
	batchHistory: Map<string, HistoryEvent[]>,
	entities: PlanEntity[],
): CommitGroup[] {
	const entityByFile = new Map(entities.map(e => [e.file, e]));
	const commitMap = new Map<string, CommitGroup>();

	for (const [file, events] of batchHistory) {
		const entity = entityByFile.get(file);
		const entityId = entity?.attributes.id ?? entity?.attributes.name ?? file;

		for (const event of events) {
			let group = commitMap.get(event.hash);
			if (!group) {
				group = {
					hash: event.hash,
					shortHash: event.shortHash,
					date: event.date,
					author: event.author,
					message: event.message,
					entityEvents: [],
				};
				commitMap.set(event.hash, group);
			}
			group.entityEvents.push({ file, entityId, event });
		}
	}

	// Sort newest first
	const groups = [...commitMap.values()];
	groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	return groups;
}

function formatEntitySummary(entityId: string, event: HistoryEvent): string {
	if (event.kind === 'created') {
		const attrs = event.initialAttributes ?? {};
		const parts = Object.entries(attrs)
			.filter(([k]) => k !== 'id' && k !== 'name')
			.map(([, v]) => v);
		return `${entityId}  Created (${parts.join(', ')})`;
	}

	const parts: string[] = [];

	if (event.attributeChanges) {
		for (const c of event.attributeChanges) {
			parts.push(formatAttrChange(c));
		}
	}

	if (event.criteriaChanges && event.criteriaChanges.length > 0) {
		const checked = event.criteriaChanges.filter(c => c.action === 'checked').length;
		const total = event.criteriaChanges.length;
		parts.push(`☑ ${checked}/${total} criteria`);
	}

	if (event.kind === 'resolution') {
		parts.push('Resolution recorded');
	}

	if (event.kind === 'content') {
		parts.push('Content edited');
	}

	return `${entityId}  ${parts.join(', ')}`;
}

function formatGlobalFeed(groups: CommitGroup[], limit: number): string {
	const lines: string[] = [];
	const limited = groups.slice(0, limit);

	for (const group of limited) {
		const date = formatDate(group.date);
		lines.push(`${date}  ${group.shortHash}  ${group.message}`);

		for (const { entityId, event } of group.entityEvents) {
			lines.push(`        ${formatEntitySummary(entityId, event)}`);
		}
		lines.push('');
	}

	return lines.join('\n');
}

// ─── Main Runner ───

export function runHistory(options: HistoryOptions): void {
	const { dir, id, limit, since, type, author, status, all, formatJson } = options;

	if (id) {
		// Single-entity mode
		const found = findEntity(id, dir);
		if (!found) {
			const errMsg = `Entity not found: ${id}`;
			if (formatJson) {
				console.log(JSON.stringify({ error: errMsg }));
			} else {
				console.error(`Error: ${errMsg}`);
			}
			process.exit(1);
		}

		const events = extractEntityHistory(found.entity.file, dir);

		if (formatJson) {
			console.log(JSON.stringify({ id, events: [...events].reverse().slice(0, limit) }, null, 2));
		} else {
			console.log(formatSingleEntity(found.entity, events, limit));
		}
	} else {
		// Global mode
		const gitSince = since ? normalizeSince(since) : undefined;
		const cache = readHistoryCache(dir);
		const batchHistory = extractBatchHistory(dir, '.', { since: gitSince, cache });
		writeHistoryCache(dir, cache);

		// Get entity metadata for ID resolution
		const entities = scanPlanFiles(dir);

		// Apply filters
		const typeFilter = type ? new Set(type.split(',').map(t => t.trim().toLowerCase())) : null;
		const entityByFile = new Map(entities.map(e => [e.file, e]));

		if (typeFilter || author || status || !all) {
			for (const [file, events] of batchHistory) {
				const entity = entityByFile.get(file);

				// Type filter
				if (typeFilter && entity && !typeFilter.has(entity.type)) {
					batchHistory.delete(file);
					continue;
				}

				// Author filter (applied per-event, remove non-matching events)
				if (author) {
					const filtered = events.filter(e =>
						e.author.toLowerCase().includes(author.toLowerCase()),
					);
					if (filtered.length === 0) {
						batchHistory.delete(file);
					} else {
						batchHistory.set(file, filtered);
					}
				}

				// Status filter — keep only events where status transitioned to the given value
				if (status) {
					const filtered = events.filter(e => {
						if (e.kind === 'created') {
							return e.initialAttributes?.status === status;
						}
						if (e.attributeChanges) {
							return e.attributeChanges.some(c => c.field === 'status' && c.to === status);
						}
						return false;
					});
					if (filtered.length === 0) {
						batchHistory.delete(file);
					} else {
						batchHistory.set(file, filtered);
					}
				}

				// Exclude content-only events from global feed (unless --all)
				if (!all) {
					const filtered = (batchHistory.get(file) ?? events).filter(e => e.kind !== 'content');
					if (filtered.length === 0) {
						batchHistory.delete(file);
					} else {
						batchHistory.set(file, filtered);
					}
				}
			}
		}

		if (formatJson) {
			const allEvents = buildGlobalTimeline(batchHistory).slice(0, limit);
			console.log(JSON.stringify({ events: allEvents }, null, 2));
		} else {
			const groups = groupByCommit(batchHistory, entities);
			console.log(formatGlobalFeed(groups, limit));
		}
	}
}
