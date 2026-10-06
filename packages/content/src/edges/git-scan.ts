/**
 * The git scan (SPEC-136 D5, WORK-594).
 *
 * One pass over the repository's history, producing for every path the commits
 * that touched it. Adapted from `timestamps.ts`'s scan rather than rewritten —
 * the shallow-clone and git-root handling there are the parts most easily got
 * wrong.
 *
 * **`--full-history`, and no pathspec.** This is the single easiest way to ship
 * this feature with quietly wrong numbers, and it was found by measuring
 * SPEC-136's own base rate:
 *
 * ```
 * git log --name-only -- site/content/docs/cli/cli-overview.md   → 2 commits
 * git log --full-history --name-only        (no pathspec)        → 5 commits
 * ```
 *
 * A pathspec makes git apply history simplification. Both outputs are correct
 * git answering different questions — but this command does *arithmetic* on
 * those timestamps, since the referrer's last-changed time is one half of every
 * score. A simplified history inflates every edge out of a file and deflates
 * every edge into it, and the failure is invisible: the report still renders,
 * still ranks, still looks plausible.
 */

import { execSync } from 'node:child_process';

export interface Commit {
	sha: string;
	/** Unix seconds. */
	at: number;
	subject: string;
}

export interface GitHistory {
	/** Path (relative to the git root) → commits touching it, newest first. */
	byPath: Map<string, Commit[]>;
	/** Prefix from the git root to the scanned directory, '' at the root. */
	prefix: string;
}

/** Why the scan could not run. A refusal is never a zero — D5. */
export class GitScanRefusal extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GitScanRefusal';
	}
}

function git(command: string, cwd: string): string {
	return execSync(command, {
		cwd,
		encoding: 'utf-8',
		maxBuffer: 256 * 1024 * 1024,
		stdio: ['pipe', 'pipe', 'pipe'],
	});
}

/** A shallow clone reports one commit per path, so every edge scores zero and
 *  the tool confidently reports a clean corpus. That is the silent-wrong class
 *  this feature exists to avoid, so it refuses instead. */
export function isShallowClone(cwd: string): boolean {
	try {
		return git('git rev-parse --is-shallow-repository', cwd).trim() === 'true';
	} catch {
		return false;
	}
}

export function isGitRepository(cwd: string): boolean {
	try {
		return git('git rev-parse --is-inside-work-tree', cwd).trim() === 'true';
	} catch {
		return false;
	}
}

/** Path from the git root to `cwd`, '' when already at the root. */
export function gitRelativePrefix(cwd: string): string {
	const root = git('git rev-parse --show-toplevel', cwd).trim();
	const abs = git('pwd', cwd).trim();
	if (abs === root) return '';
	const rel = abs.slice(root.length + 1);
	return rel ? `${rel}/` : '';
}

/**
 * Scan the whole history once.
 *
 * @throws {GitScanRefusal} on a non-git tree or a shallow clone. Both are
 *   "could not measure", which is a different event from "measured, nothing
 *   wrong" and must not be reported as the latter.
 */
export function scanHistory(cwd: string): GitHistory {
	if (!isGitRepository(cwd)) {
		throw new GitScanRefusal(
			'not a git repository — `refrakt stale` measures commits against a file, and has no ' +
				'non-git fallback. Run it inside a checkout.',
		);
	}

	if (isShallowClone(cwd)) {
		throw new GitScanRefusal(
			'shallow clone — every path would report a single commit and every edge would score ' +
				'zero, which is indistinguishable from a clean corpus. Set `fetch-depth: 0` on the ' +
				'checkout step (actions/checkout defaults to 1) and run again.',
		);
	}

	// `%x00` separates the subject so a subject containing the field separator
	// cannot split the record.
	const output = git(
		'git log --full-history --format="__C__%H%x00%at%x00%s" --name-only --diff-filter=ACMR HEAD',
		cwd,
	);

	const byPath = new Map<string, Commit[]>();
	let current: Commit | undefined;

	for (const raw of output.split('\n')) {
		const line = raw.replace(/\r$/, '');
		if (line.startsWith('__C__')) {
			const [sha, at, ...rest] = line.slice(5).split('\u0000');
			current = { sha: sha.slice(0, 7), at: Number(at), subject: rest.join('\u0000') };
			continue;
		}
		if (line.length === 0 || current === undefined) continue;

		const list = byPath.get(line);
		if (list) list.push(current);
		else byPath.set(line, [current]);
	}

	return { byPath, prefix: gitRelativePrefix(cwd) };
}

/** The most recent commit timestamp for a path, or undefined if untracked. */
export function lastChanged(history: GitHistory, path: string): number | undefined {
	const commits = history.byPath.get(path);
	if (!commits || commits.length === 0) return undefined;
	// `git log` emits newest first, so the head is the most recent.
	return commits[0].at;
}

/** Commits touching `path` strictly after `since`, newest first. */
export function commitsSince(history: GitHistory, path: string, since: number): Commit[] {
	const commits = history.byPath.get(path);
	if (!commits) return [];
	return commits.filter((c) => c.at > since);
}

/**
 * Paths changed since a git ref — the `since:` query's input.
 *
 * A PR-scoped sweep: resolve what the branch touched, then ask the same
 * question `touching` asks. Returns an empty list rather than throwing when the
 * ref cannot be resolved, because a missing ref is the caller's mistake to
 * report, not a reason to fail the whole query.
 */
export function changedSince(cwd: string, ref: string): string[] {
	const out = git(`git diff --name-only ${ref}...HEAD`, cwd);
	return out
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}
