// ─── Git-Native Entity History ───
// Derives structured lifecycle events from git commits for plan entities.

import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	diffAttributes,
	diffCriteria,
	parseTagAttributes,
	parseCheckboxes,
	hasResolutionSection,
	type AttributeChange,
	type CriteriaChange,
	type ParsedCheckbox,
} from './diff.js';

// Re-export pure diffing functions and types for backwards compatibility
export {
	diffAttributes,
	diffCriteria,
	parseTagAttributes,
	parseCheckboxes,
	hasResolutionSection,
} from './diff.js';
export type { AttributeChange, CriteriaChange, ParsedCheckbox } from './diff.js';

export interface HistoryEvent {
	kind: 'created' | 'attributes' | 'criteria' | 'resolution' | 'content';
	hash: string;
	shortHash: string;
	date: string; // ISO 8601 date string
	author: string;
	message: string;
	/** Attribute changes (only for kind === 'attributes') */
	attributeChanges?: AttributeChange[];
	/** Criteria changes (only for kind === 'criteria') */
	criteriaChanges?: CriteriaChange[];
	/** Present when kind === 'created' — initial attribute snapshot */
	initialAttributes?: Record<string, string>;
}

// ─── Git Operations ───

interface CommitInfo {
	hash: string;
	date: string;
	author: string;
	message: string;
}

/** One file change in a commit, as `git log --name-status` reports it. */
interface FileChange {
	/** Status letter: `A`, `M`, `D`, `R` (rename), `C` (copy), `T` (type change). */
	status: string;
	/** Path after the commit (repo-root-relative). */
	path: string;
	/** Path before the commit, for renames and copies. */
	oldPath?: string;
}

interface LoggedCommit extends CommitInfo {
	changes: FileChange[];
}

/** `--format` for {@link parseLog}: a NUL record separator, then the meta line and the subject. */
const LOG_FORMAT = '--format=%x00%H %aI %aN%n%s';

/** Room for a log or a batch of file contents on a long history. */
const GIT_MAX_BUFFER = 512 * 1024 * 1024;

/** Run git and return stdout. `core.quotePath=false` keeps non-ASCII paths unquoted. */
function git(args: string[], cwd: string, input?: string): Buffer {
	return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
		cwd,
		input,
		maxBuffer: GIT_MAX_BUFFER,
		stdio: ['pipe', 'pipe', 'pipe'],
	});
}

/** Parse `git log` output made with {@link LOG_FORMAT} and `--name-status`. Newest first. */
function parseLog(output: string): LoggedCommit[] {
	const commits: LoggedCommit[] = [];
	for (const block of output.split('\x00')) {
		const lines = block.split('\n').filter((l) => l.trim() !== '');
		if (lines.length < 1) continue;

		// Parse: HASH ISO_DATE AUTHOR_NAME
		const metaLine = lines[0].trim();
		const spaceIdx1 = metaLine.indexOf(' ');
		const spaceIdx2 = metaLine.indexOf(' ', spaceIdx1 + 1);
		if (spaceIdx1 === -1 || spaceIdx2 === -1) continue;

		const changes: FileChange[] = [];
		for (const line of lines.slice(2)) {
			const [status, first, second] = line.split('\t');
			if (!status || !first) continue;
			const letter = status.charAt(0);
			changes.push(
				second !== undefined
					? { status: letter, path: second, oldPath: first }
					: { status: letter, path: first },
			);
		}

		commits.push({
			hash: metaLine.slice(0, spaceIdx1),
			date: metaLine.slice(spaceIdx1 + 1, spaceIdx2),
			author: metaLine.slice(spaceIdx2 + 1),
			message: lines[1]?.trim() ?? '',
			changes,
		});
	}
	return commits;
}

/**
 * Get the ordered list of commits that touched a file (oldest first).
 * Uses --follow to track renames.
 */
export function getFileCommits(filePath: string, cwd: string): CommitInfo[] {
	return getFileVersions(filePath, cwd).map(({ commit }) => commit);
}

/** A file as one commit left it: the commit, and the file's path at that commit. */
interface FileVersion {
	commit: CommitInfo;
	path: string;
	/** The commit deleted the file, so it has no contents there. */
	deleted: boolean;
}

/** Every commit that touched a file, oldest first, with the file's path at each (`--follow`). */
function getFileVersions(filePath: string, cwd: string): FileVersion[] {
	try {
		const output = git(
			['log', '--follow', '--name-status', LOG_FORMAT, '--', filePath],
			cwd,
		).toString('utf-8');
		return parseLog(output)
			.reverse()
			.map(({ changes, ...commit }) => {
				const change = changes[0];
				return {
					commit,
					path: change?.path ?? filePath,
					deleted: change?.status === 'D',
				};
			});
	} catch {
		return [];
	}
}

/**
 * Get file contents at a specific commit.
 */
export function getFileAtCommit(hash: string, filePath: string, cwd: string): string | null {
	return readFilesAtCommits([{ hash, path: filePath }], cwd)[0];
}

/**
 * Read many files at many commits through one `git cat-file --batch` process,
 * rather than one `git show` per file and commit. Paths are repo-root-relative.
 * An entry is `null` where the file does not exist at that commit.
 */
export function readFilesAtCommits(
	specs: Array<{ hash: string; path: string }>,
	cwd: string,
): Array<string | null> {
	if (specs.length === 0) return [];
	let output: Buffer;
	try {
		output = git(
			['cat-file', '--batch'],
			cwd,
			specs.map(({ hash, path }) => `${hash}:${path}\n`).join(''),
		);
	} catch {
		return specs.map(() => null);
	}

	// Each answer is `<oid> <type> <size>\n<contents>\n`, or `<spec> missing\n`
	// (also `ambiguous`), in the order the specs were written.
	const results: Array<string | null> = [];
	let offset = 0;
	for (let i = 0; i < specs.length; i++) {
		const eol = output.indexOf(0x0a, offset);
		if (eol === -1) {
			results.push(null);
			continue;
		}
		const header = output.toString('utf-8', offset, eol).split(' ');
		offset = eol + 1;
		if (header.length !== 3 || !/^\d+$/.test(header[2])) {
			results.push(null);
			continue;
		}
		const size = Number(header[2]);
		results.push(header[1] === 'blob' ? output.toString('utf-8', offset, offset + size) : null);
		offset += size + 1;
	}
	return results;
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
	const versions = getFileVersions(filePath, cwd);
	return eventsFromVersions(versions, readVersionContents(versions, cwd));
}

/** The file's contents at each version, in one batch; `null` where it was deleted. */
function readVersionContents(versions: FileVersion[], cwd: string): Array<string | null> {
	const live = versions.filter((v) => !v.deleted);
	const read = readFilesAtCommits(
		live.map((v) => ({ hash: v.commit.hash, path: v.path })),
		cwd,
	);
	let next = 0;
	return versions.map((v) => (v.deleted ? null : read[next++]));
}

/**
 * Turn a file's versions (oldest first) and its contents at each into history
 * events: a `created` event, then one event per later commit, classified by
 * what the diff against the previous version changed.
 */
function eventsFromVersions(
	versions: FileVersion[],
	contents: Array<string | null>,
): HistoryEvent[] {
	const events: HistoryEvent[] = [];

	let prevSnapshot: FileSnapshot | null = null;

	for (let i = 0; i < versions.length; i++) {
		const commit = versions[i].commit;
		const content = contents[i];

		// No contents at this commit (the commit deleted the file, or it could
		// not be read). Record the creation if this is the first commit.
		if (content === null) {
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
			const attrChanges = prevSnapshot
				? diffAttributes(prevSnapshot.attributes, snapshot.attributes)
				: [];
			const criteriaChanges = prevSnapshot
				? diffCriteria(prevSnapshot.checkboxes, snapshot.checkboxes)
				: [];
			const resolutionAdded = prevSnapshot
				? !prevSnapshot.hasResolution && snapshot.hasResolution
				: false;
			const resolutionModified =
				prevSnapshot?.hasResolution &&
				snapshot.hasResolution &&
				prevSnapshot.rawContent !== snapshot.rawContent;

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

/** Every commit that touched `planDir`, newest first, with rename detection. */
function logPlanDir(planDir: string, cwd: string, since?: string): LoggedCommit[] {
	try {
		const args = ['log', '--full-history', '-M', '--name-status', LOG_FORMAT];
		if (since) args.push(`--since=${since}`);
		args.push('--', planDir);
		return parseLog(git(args, cwd).toString('utf-8'));
	} catch {
		return [];
	}
}

/**
 * Get all commits affecting a directory, with their affected file lists.
 * Returns newest-first (git default).
 */
export function getBatchCommits(planDir: string, cwd: string, since?: string): BatchCommitInfo[] {
	return logPlanDir(planDir, cwd, since).map(({ changes, ...commit }) => ({
		...commit,
		files: changes.map((c) => c.path),
	}));
}

/**
 * Group a directory's log (newest first) into one version list per file,
 * oldest first, keyed by the file's latest path. A rename carries the file's
 * versions over to its new path, which is what `git log --follow` does for a
 * single file.
 */
function groupVersionsByFile(commits: LoggedCommit[]): Map<string, FileVersion[]> {
	const byPath = new Map<string, FileVersion[]>();
	for (let i = commits.length - 1; i >= 0; i--) {
		const { changes, ...commit } = commits[i];
		// Take every renamed file's versions off its old path before placing
		// any, so a swap (`a → b`, `b → a`) moves each history exactly once.
		const moved = new Map<string, FileVersion[]>();
		for (const change of changes) {
			if (change.status !== 'R' || change.oldPath === undefined) continue;
			const versions = byPath.get(change.oldPath);
			if (!versions) continue;
			moved.set(change.path, versions);
			byPath.delete(change.oldPath);
		}
		for (const change of changes) {
			const versions = moved.get(change.path) ?? byPath.get(change.path) ?? [];
			versions.push({ commit, path: change.path, deleted: change.status === 'D' });
			byPath.set(change.path, versions);
		}
	}
	return byPath;
}

/**
 * Extract history for all plan entities in a directory.
 *
 * Two git processes regardless of history length: one `git log` over the
 * directory, and one `git cat-file --batch` for the contents of every file at
 * every commit that touched it. Files whose latest commit matches the cache
 * are not read at all.
 *
 * @returns Map of file path → HistoryEvent[]
 */
export function extractBatchHistory(
	planDir: string,
	cwd: string,
	options: { since?: string; cache?: HistoryCache } = {},
): Map<string, HistoryEvent[]> {
	const byFile = groupVersionsByFile(logPlanDir(planDir, cwd, options.since));

	const cache = options.cache;
	const result = new Map<string, HistoryEvent[]>();
	const stale: Array<{ file: string; versions: FileVersion[]; latestHash: string }> = [];

	for (const [file, versions] of byFile) {
		const latestHash = versions[versions.length - 1].commit.hash;
		const cached = cache?.entries[file];
		if (cached && cached.latestCommit === latestHash) {
			result.set(file, cached.events);
		} else {
			stale.push({ file, versions, latestHash });
		}
	}

	const contents = readVersionContents(
		stale.flatMap((s) => s.versions),
		cwd,
	);
	let offset = 0;
	for (const { file, versions, latestHash } of stale) {
		const events = eventsFromVersions(versions, contents.slice(offset, offset + versions.length));
		offset += versions.length;
		result.set(file, events);
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
export function buildGlobalTimeline(batchHistory: Map<string, HistoryEvent[]>): HistoryEvent[] {
	const allEvents: HistoryEvent[] = [];
	for (const events of batchHistory.values()) {
		allEvents.push(...events);
	}
	// Sort newest first
	allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	return allEvents;
}
