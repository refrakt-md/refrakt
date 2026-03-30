// ─── Git / Filesystem Timestamp Collection ───

import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

export interface FileTimestamps {
	created: string | undefined;
	modified: string | undefined;
}

/**
 * Format a Unix timestamp (seconds) as an ISO 8601 date string (YYYY-MM-DD).
 */
function formatDate(unixSeconds: number): string {
	const d = new Date(unixSeconds * 1000);
	const year = d.getUTCFullYear();
	const month = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Format a millisecond timestamp as an ISO 8601 date string (YYYY-MM-DD).
 */
function formatDateMs(ms: number): string {
	const d = new Date(ms);
	const year = d.getUTCFullYear();
	const month = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Detect whether the current repository is a shallow clone.
 */
function isShallowClone(cwd: string): boolean {
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

/**
 * Get the most recent commit timestamp (in unix seconds) for each file.
 * Returns a Map keyed by file path relative to the git root.
 * Only records the first (most recent) timestamp per file.
 */
function getGitModifiedTimes(cwd: string): Map<string, number> {
	const mtimes = new Map<string, number>();
	try {
		const output = execSync(
			'git log --format="%at" --name-only --diff-filter=ACMR HEAD',
			{ cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] },
		);

		let currentTimestamp = 0;
		for (const line of output.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			if (/^\d+$/.test(trimmed)) {
				currentTimestamp = parseInt(trimmed, 10);
				continue;
			}
			// Only record the first (most recent) timestamp per file
			if (currentTimestamp > 0 && !mtimes.has(trimmed)) {
				mtimes.set(trimmed, currentTimestamp);
			}
		}
	} catch {
		// Not a git repo or git not available
	}
	return mtimes;
}

/**
 * Get the earliest commit timestamp (in unix seconds) for each file.
 * Uses --diff-filter=A to find the commit that added each file.
 * Returns a Map keyed by file path relative to the git root.
 * The --reverse flag means first seen = earliest, so we only record the first per file.
 */
function getGitCreatedTimes(cwd: string): Map<string, number> {
	const ctimes = new Map<string, number>();
	try {
		const output = execSync(
			'git log --format="%at" --name-only --diff-filter=A --reverse HEAD',
			{ cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] },
		);

		let currentTimestamp = 0;
		for (const line of output.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			if (/^\d+$/.test(trimmed)) {
				currentTimestamp = parseInt(trimmed, 10);
				continue;
			}
			// --reverse means first occurrence is the earliest — only record once
			if (currentTimestamp > 0 && !ctimes.has(trimmed)) {
				ctimes.set(trimmed, currentTimestamp);
			}
		}
	} catch {
		// Not a git repo or git not available
	}
	return ctimes;
}

/**
 * Resolve the git root directory relative path prefix for a given directory.
 * Returns the relative path from the git root to `cwd`, or empty string if at root.
 */
function getGitRelativePrefix(cwd: string): string | null {
	try {
		const root = execSync('git rev-parse --show-toplevel', {
			cwd,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		}).trim();
		const absDir = resolve(cwd);
		if (absDir === root) return '';
		const rel = absDir.slice(root.length + 1);
		return rel ? rel + '/' : '';
	} catch {
		return null;
	}
}

/**
 * Batch-collect git timestamps for all files in a content directory.
 *
 * Returns a `Map<string, FileTimestamps>` keyed by relative file path
 * (relative to the provided `contentDir`).
 *
 * Resolution order per file:
 * 1. Git history (created + modified from commit timestamps)
 * 2. Filesystem stat fallback (birthtimeMs / mtimeMs)
 *
 * In shallow clones, `created` is omitted (unreliable) but `modified` is still provided.
 *
 * Frontmatter overrides are NOT applied here — that's the caller's responsibility
 * (see `loadContent()` in site.ts).
 */
export function getGitTimestamps(contentDir: string): Map<string, FileTimestamps> {
	const absDir = resolve(contentDir);
	const prefix = getGitRelativePrefix(absDir);
	const hasGit = prefix !== null;
	const shallow = hasGit && isShallowClone(absDir);

	let modifiedMap = new Map<string, number>();
	let createdMap = new Map<string, number>();

	if (hasGit) {
		modifiedMap = getGitModifiedTimes(absDir);
		if (!shallow) {
			createdMap = getGitCreatedTimes(absDir);
		}
	}

	// Merge created + modified into a single map keyed by relative path (relative to contentDir)
	const timestamps = new Map<string, FileTimestamps>();

	// Collect all known file paths from both maps
	const allPaths = new Set([...modifiedMap.keys(), ...createdMap.keys()]);
	for (const gitPath of allPaths) {
		// Only include files under the content directory
		if (prefix !== '' && !gitPath.startsWith(prefix!)) continue;
		const relPath = prefix ? gitPath.slice(prefix.length) : gitPath;

		const modifiedTs = modifiedMap.get(gitPath);
		const createdTs = createdMap.get(gitPath);

		timestamps.set(relPath, {
			created: createdTs ? formatDate(createdTs) : undefined,
			modified: modifiedTs ? formatDate(modifiedTs) : undefined,
		});
	}

	return timestamps;
}

/**
 * Get filesystem-based timestamps for a single file as a fallback.
 * Returns ISO 8601 date strings (YYYY-MM-DD).
 */
export function getStatTimestamps(filePath: string): FileTimestamps {
	try {
		const stat = statSync(filePath);
		return {
			created: stat.birthtimeMs > 0 ? formatDateMs(stat.birthtimeMs) : undefined,
			modified: formatDateMs(stat.mtimeMs),
		};
	} catch {
		return { created: undefined, modified: undefined };
	}
}

/**
 * Resolve timestamps for a single file using the three-tier fallback:
 * frontmatter override > git history > fs.stat.
 *
 * The `gitTimestamps` map should come from `getGitTimestamps()`.
 * The `frontmatter` object may contain `created` and/or `modified` keys.
 */
export function resolveTimestamps(
	relPath: string,
	absPath: string,
	gitTimestamps: Map<string, FileTimestamps>,
	frontmatter: Record<string, unknown>,
): FileTimestamps {
	const fm = {
		created: typeof frontmatter.created === 'string' ? frontmatter.created : undefined,
		modified: typeof frontmatter.modified === 'string' ? frontmatter.modified : undefined,
	};
	const git = gitTimestamps.get(relPath);

	// Lazy fs.stat — only computed if needed
	let stat: FileTimestamps | undefined;
	const getStat = () => { stat ??= getStatTimestamps(absPath); return stat; };

	return {
		created: fm.created ?? git?.created ?? getStat().created,
		modified: fm.modified ?? git?.modified ?? getStat().modified,
	};
}
