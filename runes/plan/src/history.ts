// ─── Git-Native Entity History ───
// Derives structured lifecycle events from git commits for plan entities.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ─── Types ───

export interface AttributeChange {
	field: string;
	from: string | null; // null = attribute was added
	to: string | null;   // null = attribute was removed
}

export interface CriteriaChange {
	text: string;
	action: 'checked' | 'unchecked' | 'added' | 'removed';
}

export interface HistoryEvent {
	kind: 'created' | 'attributes' | 'criteria' | 'resolution' | 'content';
	hash: string;
	shortHash: string;
	date: string;    // ISO 8601 date string
	author: string;
	message: string;
	/** Attribute changes (only for kind === 'attributes') */
	attributeChanges?: AttributeChange[];
	/** Criteria changes (only for kind === 'criteria') */
	criteriaChanges?: CriteriaChange[];
	/** Present when kind === 'created' — initial attribute snapshot */
	initialAttributes?: Record<string, string>;
}

// ─── Parsing ───

/** Regex to parse the opening Markdoc tag on line 1: {% type key="value" ... %} */
const TAG_ATTR_RE = /(\w+)="([^"]*)"/g;

/**
 * Parse attributes from a Markdoc opening tag line.
 * Expects the line to look like: {% type key="value" key2="value2" ... %}
 */
export function parseTagAttributes(line: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	let match: RegExpExecArray | null;
	TAG_ATTR_RE.lastIndex = 0;
	while ((match = TAG_ATTR_RE.exec(line)) !== null) {
		attrs[match[1]] = match[2];
	}
	return attrs;
}

/** Checkbox line pattern: - [ ] text or - [x] text (case-insensitive x) */
const CHECKBOX_RE = /^[\s]*-\s+\[([ xX])\]\s+(.+)/;

export interface ParsedCheckbox {
	text: string;
	checked: boolean;
}

/**
 * Extract all checkbox lines from file content.
 */
export function parseCheckboxes(content: string): ParsedCheckbox[] {
	const results: ParsedCheckbox[] = [];
	for (const line of content.split('\n')) {
		const match = CHECKBOX_RE.exec(line);
		if (match) {
			results.push({
				text: match[2].trim(),
				checked: match[1] !== ' ',
			});
		}
	}
	return results;
}

/**
 * Detect whether a ## Resolution section exists in the content.
 */
export function hasResolutionSection(content: string): boolean {
	return /^##\s+Resolution\s*$/m.test(content);
}

// ─── Diffing ───

/**
 * Diff two attribute maps and return the changes.
 */
export function diffAttributes(
	prev: Record<string, string>,
	curr: Record<string, string>,
): AttributeChange[] {
	const changes: AttributeChange[] = [];
	const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

	for (const key of allKeys) {
		const oldVal = prev[key] ?? null;
		const newVal = curr[key] ?? null;
		if (oldVal !== newVal) {
			changes.push({ field: key, from: oldVal, to: newVal });
		}
	}
	return changes;
}

/**
 * Diff two checkbox lists by text matching.
 */
export function diffCriteria(
	prev: ParsedCheckbox[],
	curr: ParsedCheckbox[],
): CriteriaChange[] {
	const changes: CriteriaChange[] = [];
	const prevByText = new Map(prev.map(c => [c.text, c.checked]));
	const currByText = new Map(curr.map(c => [c.text, c.checked]));

	// Check for removed or changed criteria
	for (const [text, wasChecked] of prevByText) {
		const isChecked = currByText.get(text);
		if (isChecked === undefined) {
			changes.push({ text, action: 'removed' });
		} else if (wasChecked && !isChecked) {
			changes.push({ text, action: 'unchecked' });
		} else if (!wasChecked && isChecked) {
			changes.push({ text, action: 'checked' });
		}
	}

	// Check for added criteria
	for (const [text] of currByText) {
		if (!prevByText.has(text)) {
			changes.push({ text, action: 'added' });
		}
	}

	return changes;
}

// ─── Git Operations ───

interface CommitInfo {
	hash: string;
	date: string;
	author: string;
	message: string;
}

/**
 * Get the ordered list of commits that touched a file (oldest first).
 * Uses --follow to track renames.
 */
export function getFileCommits(filePath: string, cwd: string): CommitInfo[] {
	try {
		const output = execSync(
			`git log --follow --format="%H %aI %aN%n%s" -- "${filePath}"`,
			{ cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] },
		);

		const commits: CommitInfo[] = [];
		const lines = output.trim().split('\n');

		for (let i = 0; i < lines.length; i += 2) {
			const metaLine = lines[i]?.trim();
			const messageLine = lines[i + 1]?.trim();
			if (!metaLine) continue;

			// Parse: HASH ISO_DATE AUTHOR_NAME
			const spaceIdx1 = metaLine.indexOf(' ');
			const spaceIdx2 = metaLine.indexOf(' ', spaceIdx1 + 1);
			if (spaceIdx1 === -1 || spaceIdx2 === -1) continue;

			const hash = metaLine.slice(0, spaceIdx1);
			const date = metaLine.slice(spaceIdx1 + 1, spaceIdx2);
			const author = metaLine.slice(spaceIdx2 + 1);

			commits.push({ hash, date, author, message: messageLine ?? '' });
		}

		// Reverse to oldest-first for diffing
		commits.reverse();
		return commits;
	} catch {
		return [];
	}
}

/**
 * Get file contents at a specific commit.
 */
export function getFileAtCommit(hash: string, filePath: string, cwd: string): string | null {
	try {
		return execSync(
			`git show "${hash}:${filePath}"`,
			{ cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] },
		);
	} catch {
		// File may not exist at this commit (pre-rename)
		// Try to find the file via diff-tree to handle renames
		return null;
	}
}

/**
 * Detect whether the current repository is a shallow clone.
 */
export function isShallowClone(cwd: string): boolean {
	try {
		const result = execSync('git rev-parse --is-shallow-repository', {
			cwd,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		}).trim();
		return result === 'true';
	} catch {
		return false;
	}
}

// ─── Extraction ───

interface FileSnapshot {
	attributes: Record<string, string>;
	checkboxes: ParsedCheckbox[];
	hasResolution: boolean;
	rawContent: string;
}

function snapshotFromContent(content: string): FileSnapshot {
	const firstLine = content.split('\n')[0] ?? '';
	return {
		attributes: parseTagAttributes(firstLine),
		checkboxes: parseCheckboxes(content),
		hasResolution: hasResolutionSection(content),
		rawContent: content,
	};
}

/**
 * Extract the history timeline for a single plan entity file.
 *
 * @param filePath - Path to the entity file, relative to cwd
 * @param cwd - Working directory (typically the repo root or plan directory)
 * @returns Array of HistoryEvent objects, oldest first
 */
export function extractEntityHistory(filePath: string, cwd: string): HistoryEvent[] {
	const commits = getFileCommits(filePath, cwd);
	if (commits.length === 0) return [];

	const events: HistoryEvent[] = [];

	let prevSnapshot: FileSnapshot | null = null;

	for (let i = 0; i < commits.length; i++) {
		const commit = commits[i];
		const content = getFileAtCommit(commit.hash, filePath, cwd);

		// If we can't get the file content (e.g. pre-rename), try the old name
		if (content === null) {
			// For renamed files, the first commits may fail to resolve.
			// Record a content event since we know the file was touched.
			if (i === 0) {
				events.push({
					kind: 'created',
					hash: commit.hash,
					shortHash: commit.hash.slice(0, 7),
					date: commit.date,
					author: commit.author,
					message: commit.message,
					initialAttributes: {},
				});
			}
			continue;
		}

		const snapshot = snapshotFromContent(content);
		const shortHash = commit.hash.slice(0, 7);

		if (i === 0) {
			// First commit — this is the creation event
			events.push({
				kind: 'created',
				hash: commit.hash,
				shortHash,
				date: commit.date,
				author: commit.author,
				message: commit.message,
				initialAttributes: { ...snapshot.attributes },
			});
		} else {
			// Subsequent commits — diff against previous snapshot
			const attrChanges = prevSnapshot ? diffAttributes(prevSnapshot.attributes, snapshot.attributes) : [];
			const criteriaChanges = prevSnapshot ? diffCriteria(prevSnapshot.checkboxes, snapshot.checkboxes) : [];
			const resolutionAdded = prevSnapshot ? (!prevSnapshot.hasResolution && snapshot.hasResolution) : false;
			const resolutionModified = prevSnapshot?.hasResolution && snapshot.hasResolution && prevSnapshot.rawContent !== snapshot.rawContent;

			if (attrChanges.length > 0 && criteriaChanges.length > 0) {
				// Both attributes and criteria changed — emit a combined event
				// Attribute changes take priority for the event kind
				events.push({
					kind: 'attributes',
					hash: commit.hash,
					shortHash,
					date: commit.date,
					author: commit.author,
					message: commit.message,
					attributeChanges: attrChanges,
					criteriaChanges,
				});
			} else if (attrChanges.length > 0) {
				events.push({
					kind: 'attributes',
					hash: commit.hash,
					shortHash,
					date: commit.date,
					author: commit.author,
					message: commit.message,
					attributeChanges: attrChanges,
				});
			} else if (criteriaChanges.length > 0) {
				events.push({
					kind: 'criteria',
					hash: commit.hash,
					shortHash,
					date: commit.date,
					author: commit.author,
					message: commit.message,
					criteriaChanges,
				});
			} else if (resolutionAdded || resolutionModified) {
				events.push({
					kind: 'resolution',
					hash: commit.hash,
					shortHash,
					date: commit.date,
					author: commit.author,
					message: commit.message,
				});
			} else {
				// File changed but no structured diff detected — content edit
				events.push({
					kind: 'content',
					hash: commit.hash,
					shortHash,
					date: commit.date,
					author: commit.author,
					message: commit.message,
				});
			}
		}

		prevSnapshot = snapshot;
	}

	return events;
}

// ─── Batch Extraction ───

interface BatchCommitInfo {
	hash: string;
	date: string;
	author: string;
	message: string;
	files: string[];
}

/**
 * Get all commits affecting a directory, with their affected file lists.
 * Returns newest-first (git default).
 */
export function getBatchCommits(planDir: string, cwd: string, since?: string): BatchCommitInfo[] {
	try {
		// Use %x00 as record separator to avoid ambiguity with blank lines in output
		let cmd = `git log --format="%x00%H %aI %aN%n%s" --name-only -- "${planDir}"`;
		if (since) {
			cmd = `git log --since="${since}" --format="%x00%H %aI %aN%n%s" --name-only -- "${planDir}"`;
		}

		const output = execSync(cmd, {
			cwd,
			encoding: 'utf-8',
			maxBuffer: 10 * 1024 * 1024,
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		const commits: BatchCommitInfo[] = [];
		// Split on the NUL byte record separator we injected
		const blocks = output.split('\x00').filter(b => b.trim() !== '');

		for (const block of blocks) {
			const lines = block.split('\n').filter(l => l.trim() !== '');
			if (lines.length < 2) continue;

			const metaLine = lines[0].trim();
			const messageLine = lines[1].trim();

			const spaceIdx1 = metaLine.indexOf(' ');
			const spaceIdx2 = metaLine.indexOf(' ', spaceIdx1 + 1);
			if (spaceIdx1 === -1 || spaceIdx2 === -1) continue;

			const hash = metaLine.slice(0, spaceIdx1);
			const date = metaLine.slice(spaceIdx1 + 1, spaceIdx2);
			const author = metaLine.slice(spaceIdx2 + 1);

			const files = lines.slice(2).map(l => l.trim()).filter(l => l.length > 0);

			commits.push({ hash, date, author, message: messageLine, files });
		}

		return commits;
	} catch {
		return [];
	}
}

/**
 * Extract history for all plan entities in a directory.
 * Groups commits by file path and runs per-entity extraction for files
 * with more than one commit. Single-commit files get a created event.
 *
 * @returns Map of file path → HistoryEvent[]
 */
export function extractBatchHistory(
	planDir: string,
	cwd: string,
	options: { since?: string; cache?: HistoryCache } = {},
): Map<string, HistoryEvent[]> {
	const batchCommits = getBatchCommits(planDir, cwd, options.since);

	// Group by file: track which commits touch each file + latest hash
	const fileCommitCounts = new Map<string, number>();
	const fileLatestHash = new Map<string, string>();

	for (const commit of batchCommits) {
		for (const file of commit.files) {
			fileCommitCounts.set(file, (fileCommitCounts.get(file) ?? 0) + 1);
			// First occurrence (newest commit) sets the latest hash
			if (!fileLatestHash.has(file)) {
				fileLatestHash.set(file, commit.hash);
			}
		}
	}

	const cache = options.cache;
	const result = new Map<string, HistoryEvent[]>();

	for (const [file, count] of fileCommitCounts) {
		// Check cache
		const latestHash = fileLatestHash.get(file)!;
		if (cache) {
			const cached = cache.entries[file];
			if (cached && cached.latestCommit === latestHash) {
				result.set(file, cached.events);
				continue;
			}
		}

		let events: HistoryEvent[];
		if (count === 1) {
			// Single commit — emit a created event directly from batch data
			const commit = batchCommits.find(c => c.files.includes(file))!;
			const content = getFileAtCommit(commit.hash, file, cwd);
			const attrs = content ? parseTagAttributes(content.split('\n')[0] ?? '') : {};
			events = [{
				kind: 'created',
				hash: commit.hash,
				shortHash: commit.hash.slice(0, 7),
				date: commit.date,
				author: commit.author,
				message: commit.message,
				initialAttributes: attrs,
			}];
		} else {
			events = extractEntityHistory(file, cwd);
		}

		result.set(file, events);

		// Update cache
		if (cache) {
			cache.entries[file] = { latestCommit: latestHash, events };
		}
	}

	return result;
}

// ─── Caching ───

export interface HistoryCacheEntry {
	latestCommit: string;
	events: HistoryEvent[];
}

export interface HistoryCache {
	entries: Record<string, HistoryCacheEntry>;
}

const HISTORY_CACHE_FILENAME = '.plan-history-cache.json';

/**
 * Read the history cache from disk.
 */
export function readHistoryCache(planDir: string): HistoryCache {
	const cachePath = join(planDir, HISTORY_CACHE_FILENAME);
	if (!existsSync(cachePath)) return { entries: {} };
	try {
		return JSON.parse(readFileSync(cachePath, 'utf8'));
	} catch {
		return { entries: {} };
	}
}

/**
 * Write the history cache to disk.
 * Silently skips if the directory doesn't exist or writing fails.
 */
export function writeHistoryCache(planDir: string, cache: HistoryCache): void {
	try {
		writeFileSync(join(planDir, HISTORY_CACHE_FILENAME), JSON.stringify(cache, null, '\t') + '\n');
	} catch {
		// Non-critical — cache will be rebuilt next time
	}
}

/**
 * Build a unified global timeline from batch history results.
 * Returns events sorted by date descending (newest first), with commit hash grouping info.
 */
export function buildGlobalTimeline(
	batchHistory: Map<string, HistoryEvent[]>,
): HistoryEvent[] {
	const allEvents: HistoryEvent[] = [];
	for (const events of batchHistory.values()) {
		allEvents.push(...events);
	}
	// Sort newest first
	allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	return allEvents;
}
