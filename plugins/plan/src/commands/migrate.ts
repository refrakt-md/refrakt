import { execFileSync } from 'child_process';
import { existsSync, renameSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { scanPlanFiles } from '../scanner.js';
import { PR_REF_RE } from './enums.js';

export const EXIT_SUCCESS = 0;
export const EXIT_ERRORS = 1;
export const EXIT_INVALID_ARGS = 2;

/** Regex that matches a leading `{PREFIX}-{digits}-` in a filename. */
const ID_PREFIX_RE = /^(WORK|BUG|SPEC|ADR)-\d+-/;

export interface MigrateFilenamesOptions {
	dir: string;
	apply?: boolean;
	useGit?: boolean;
}

export interface PlannedRename {
	id: string;
	from: string;
	to: string;
}

export interface MigrateFilenamesError {
	file: string;
	reason: string;
}

export interface MigrateFilenamesResult {
	mode: 'dry-run' | 'apply';
	scanned: number;
	planned: PlannedRename[];
	applied: PlannedRename[];
	skipped: {
		milestones: number;
		alreadyCorrect: number;
	};
	errors: MigrateFilenamesError[];
	exitCode: number;
}

/**
 * Strip any existing `{PREFIX}-{digits}-` from a basename so the remaining
 * slug can be recombined with the frontmatter ID.
 */
function stripIdPrefix(fileName: string): string {
	return fileName.replace(ID_PREFIX_RE, '');
}

/**
 * Rename a file, either via `git mv` or `fs.renameSync`. When running
 * `git mv`, cwd is set to the scan dir so git discovery picks the
 * closest enclosing repo (matters for nested repos, e.g. test fixtures).
 */
function performRename(absFrom: string, absTo: string, useGit: boolean, cwd: string): void {
	if (useGit) {
		execFileSync('git', ['mv', absFrom, absTo], { cwd, stdio: 'pipe' });
	} else {
		renameSync(absFrom, absTo);
	}
}

/**
 * Scan a plan directory, compute target filenames of the form
 * `{ID}-{slug}.md` for every auto-ID entity, and either preview the
 * renames (dry-run, default) or apply them.
 *
 * Milestones are skipped — they use semver names, not the numeric ID
 * scheme. Files whose current name already matches the target are
 * counted as `alreadyCorrect` and not touched.
 */
export function runMigrateFilenames(options: MigrateFilenamesOptions): MigrateFilenamesResult {
	const { dir, apply = false, useGit = false } = options;

	const entities = scanPlanFiles(dir, { cache: false });

	const planned: PlannedRename[] = [];
	const applied: PlannedRename[] = [];
	const errors: MigrateFilenamesError[] = [];
	let milestonesSkipped = 0;
	let alreadyCorrect = 0;

	const targetPaths = new Set<string>();

	for (const entity of entities) {
		if (entity.type === 'milestone') {
			milestonesSkipped++;
			continue;
		}

		const id = entity.attributes.id;
		if (!id) {
			errors.push({
				file: entity.file,
				reason: 'missing frontmatter id attribute',
			});
			continue;
		}

		const currentName = basename(entity.file);
		const currentSlug = stripIdPrefix(currentName);
		const targetName = `${id}-${currentSlug}`;

		if (currentName === targetName) {
			alreadyCorrect++;
			continue;
		}

		const relDir = dirname(entity.file);
		const fromRel = entity.file;
		const toRel = relDir === '.' ? targetName : join(relDir, targetName);
		const absFrom = resolve(dir, fromRel);
		const absTo = resolve(dir, toRel);

		if (targetPaths.has(absTo) || (absTo !== absFrom && existsSync(absTo))) {
			errors.push({
				file: entity.file,
				reason: `target ${toRel} already exists or collides with another planned rename`,
			});
			continue;
		}
		targetPaths.add(absTo);

		const rename: PlannedRename = { id, from: fromRel, to: toRel };
		planned.push(rename);

		if (apply) {
			try {
				performRename(absFrom, absTo, useGit, resolve(dir));
				applied.push(rename);
			} catch (err: any) {
				errors.push({
					file: entity.file,
					reason: `rename failed: ${err.message ?? String(err)}`,
				});
			}
		}
	}

	const exitCode = errors.length > 0 ? EXIT_ERRORS : EXIT_SUCCESS;

	return {
		mode: apply ? 'apply' : 'dry-run',
		scanned: entities.length,
		planned,
		applied,
		skipped: {
			milestones: milestonesSkipped,
			alreadyCorrect,
		},
		errors,
		exitCode,
	};
}

// ─── migrate pr-attrs (SPEC-049 / WORK-498) ───

export interface MigratePrAttrsOptions {
	dir: string;
	apply?: boolean;
	useGit?: boolean;
}

export interface PrResolution {
	id: string;
	file: string;
	pr: string;
}

export interface PrUnresolved {
	id: string;
	file: string;
	reason: string;
}

export interface MigratePrAttrsResult {
	mode: 'dry-run' | 'apply';
	scanned: number;
	repoSlug: string | null;
	resolved: PrResolution[];
	applied: PrResolution[];
	/** Ambiguous — status flip maps to more than one plausible PR merge. */
	skipped: PrUnresolved[];
	/** Direct-to-main / squash / lost history — no PR merge found. */
	unresolved: PrUnresolved[];
	exitCode: number;
}

/** Run a git command in `cwd`, returning trimmed stdout or null on failure. */
function git(cwd: string, args: string[]): string | null {
	try {
		return execFileSync('git', args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
	} catch {
		return null;
	}
}

/** Parse `<org>/<repo>` from an origin remote URL (SSH or HTTPS). A GitHub slug
 *  is always the final two path segments, so we take those — robust against
 *  proxy/mirror URLs that prepend extra path segments. */
function parseRepoSlug(cwd: string): string | null {
	const url = git(cwd, ['remote', 'get-url', 'origin']);
	if (!url) return null;
	// Strip protocol/host (and any user@host:), keep the path.
	let path = url
		.replace(/^git@[^:]+:/, '')
		.replace(/^[a-z]+:\/\/[^/]+\//, '')
		.replace(/\.git$/, '');
	const segments = path.split('/').filter(Boolean);
	if (segments.length < 2) return null;
	return segments.slice(-2).join('/');
}

/** True when `a` is an ancestor of `b` (exit-code check on merge-base). */
function isAncestor(cwd: string, a: string, b: string): boolean {
	try {
		execFileSync('git', ['merge-base', '--is-ancestor', a, b], { cwd, stdio: 'pipe' });
		return true;
	} catch {
		return false;
	}
}

const MERGE_PR_RE = /Merge pull request #(\d+)/;

/**
 * Resolve the PR number that landed a status flip for one file.
 * - Finds the commits that added a `status="done"` / `status="fixed"` line.
 * - Walks forward (ancestry-path) from the newest such commit to the first
 *   reachable merge commit; if its subject is `Merge pull request #N`, that's
 *   the PR.
 * Returns `{ pr }` on success, `{ ambiguous }` when two distinct status flips
 * map to different PRs, or `{ reason }` when nothing resolves.
 */
function resolvePrForFile(cwd: string, relFile: string, statusRe: string): { pr?: number; ambiguous?: boolean; reason?: string } {
	// Commits (newest-first) whose diff touched a done/fixed status line.
	const log = git(cwd, ['log', '--format=%H', `-G${statusRe}`, '--', relFile]);
	if (log === null) return { reason: 'git log failed (not a repo or file untracked)' };
	const commits = log.split('\n').map(s => s.trim()).filter(Boolean);
	if (commits.length === 0) return { reason: 'no status-flip commit in history (direct edit / lost history)' };

	const prForCommit = (commit: string): number | null => {
		// Walk the merges that descend from `commit`, earliest first. The PR that
		// actually landed the work is the one whose *topic branch* (second parent)
		// contains the commit — this skips unrelated release/main merges that
		// merely happen to come after it on the first-parent line.
		const merges = git(cwd, ['log', '--merges', '--ancestry-path', '--reverse', '--format=%H%x09%P%x09%s', `${commit}..HEAD`]);
		if (!merges) return null;
		for (const line of merges.split('\n').filter(Boolean)) {
			const [, parentStr = '', subject = ''] = line.split('\t');
			const m = subject.match(MERGE_PR_RE);
			if (!m) continue;
			const parents = parentStr.trim().split(/\s+/);
			const firstParent = parents[0];
			const secondParent = parents[1];
			if (!firstParent || !secondParent) continue;
			// The merge that *introduced* `commit`: it's on the merged-in topic
			// branch (second parent) but was NOT already on mainline before the
			// merge (first parent). This skips release/main merges that merely
			// come after the commit on the first-parent line.
			if (isAncestor(cwd, commit, secondParent) && !isAncestor(cwd, commit, firstParent)) {
				return Number(m[1]);
			}
		}
		return null;
	};

	// Resolve every status-flip commit to its introducing PR. If they disagree
	// (the item was flipped to done via more than one PR over its history), the
	// mapping is ambiguous and we skip rather than guess (SPEC-049: accept
	// manual cleanup over silent misattribution).
	const prs = new Set<number>();
	for (const c of commits) {
		const pr = prForCommit(c);
		if (pr !== null) prs.add(pr);
	}
	if (prs.size === 0) return { reason: 'no PR merge commit reachable (direct-to-main or squash-merge)' };
	if (prs.size > 1) return { ambiguous: true };
	return { pr: [...prs][0] };
}

/** Insert a `pr="…"` attribute into the rune opening tag of a file, after the
 *  `id="…"` attribute. Returns the new content, or null if no tag was found. */
function insertPrAttr(content: string, pr: string): string | null {
	const lines = content.split('\n');
	const idx = lines.findIndex(l => /^\{%\s+(work|bug)\s/.test(l) && /\sid=("|')/.test(l));
	if (idx === -1) return null;
	if (/\spr=("|')/.test(lines[idx])) return null; // already has one
	lines[idx] = lines[idx].replace(/(\sid=(["'])[^"']*\2)/, `$1 pr="${pr}"`);
	return lines.join('\n');
}

/**
 * Backfill the `pr` attribute on legacy `done` work / `fixed` bug items by
 * mining git merge-commit history. Dry-run by default; `--apply` writes files,
 * `--git` uses `git add` after writing so the change is staged.
 */
export function runMigratePrAttrs(options: MigratePrAttrsOptions): MigratePrAttrsResult {
	const { dir, apply = false, useGit = false } = options;
	const cwd = resolve(dir);
	const entities = scanPlanFiles(dir, { cache: false });

	const repoSlug = parseRepoSlug(cwd);
	const resolved: PrResolution[] = [];
	const applied: PrResolution[] = [];
	const skipped: PrUnresolved[] = [];
	const unresolved: PrUnresolved[] = [];

	// Candidates: done work / fixed bug items with no `pr` attribute yet.
	const candidates = entities.filter(e =>
		((e.type === 'work' && e.attributes.status === 'done') ||
		 (e.type === 'bug' && e.attributes.status === 'fixed')) &&
		!(e.attributes.pr && e.attributes.pr.trim()),
	);

	for (const e of candidates) {
		const id = e.attributes.id || e.file;
		if (!repoSlug) {
			unresolved.push({ id, file: e.file, reason: 'no origin remote — cannot form <org>/<repo> slug' });
			continue;
		}

		const statusRe = e.type === 'work' ? 'status\\s*=\\s*"done"' : 'status\\s*=\\s*"fixed"';
		const res = resolvePrForFile(cwd, e.file, statusRe);

		if (res.ambiguous) {
			skipped.push({ id, file: e.file, reason: 'multiple status flips map to different PRs' });
			continue;
		}
		if (res.pr === undefined) {
			unresolved.push({ id, file: e.file, reason: res.reason ?? 'unresolved' });
			continue;
		}

		const pr = `${repoSlug}#${res.pr}`;
		if (!PR_REF_RE.test(pr)) {
			unresolved.push({ id, file: e.file, reason: `resolved PR ref "${pr}" is malformed` });
			continue;
		}

		const rec: PrResolution = { id, file: e.file, pr };
		resolved.push(rec);

		if (apply) {
			const absPath = resolve(dir, e.file);
			const content = readFileSync(absPath, 'utf8');
			const updated = insertPrAttr(content, pr);
			if (updated === null) {
				unresolved.push({ id, file: e.file, reason: 'could not locate rune tag / already has pr' });
				resolved.pop();
				continue;
			}
			writeFileSync(absPath, updated);
			if (useGit) git(cwd, ['add', e.file]);
			applied.push(rec);
		}
	}

	return {
		mode: apply ? 'apply' : 'dry-run',
		scanned: entities.length,
		repoSlug,
		resolved,
		applied,
		skipped,
		unresolved,
		exitCode: EXIT_SUCCESS,
	};
}

// ─── migrate dependencies (SPEC-114 / WORK-443) ───

export interface MigrateDependenciesOptions {
	dir: string;
	apply?: boolean;
	useGit?: boolean;
}

export interface DependencyRename {
	file: string;
	line: number;
}

export interface DependencyReverseFlag {
	file: string;
	line: number;
	text: string;
	reason: string;
}

export interface MigrateDependenciesResult {
	mode: 'dry-run' | 'apply';
	scanned: number;
	/** `## Dependencies` headings renamed (or that would be) to `## Blocked by`. */
	renamed: DependencyRename[];
	/** Entries whose prose suggests the *reverse* (`Blocks`) direction — reported
	 *  for manual review, never auto-flipped. */
	reverseFlags: DependencyReverseFlag[];
	exitCode: number;
}

/** Phrases in a `## Dependencies` section that hint the edge actually runs the
 *  other way (this item unblocks / is required by the ref) and should probably
 *  move to a `## Blocks` section. Inference is advisory only. */
const REVERSE_HINTS: Array<{ re: RegExp; reason: string }> = [
	{ re: /collects?\s+from\s+me\b/i, reason: 'reads as "collects from me" — incoming, consider ## Blocks' },
	{ re: /\bunblock(s|ed)?\b/i, reason: 'mentions "unblocks" — outgoing, consider ## Blocks' },
	{ re: /\benables?\b/i, reason: 'mentions "enables" — outgoing, consider ## Blocks' },
	{ re: /\brequired by\b/i, reason: 'reads as "required by" — incoming, consider ## Blocks' },
];

const DEPENDENCIES_HEADING_RE = /^(##\s+)Dependencies(\s*)$/i;

/**
 * Rename legacy `## Dependencies` headings to the canonical `## Blocked by`
 * (SPEC-114), and flag entries whose prose suggests the reverse direction for a
 * human to move to `## Blocks`. Dry-run by default; `--apply` writes files and
 * `--git` stages them.
 */
export function runMigrateDependencies(options: MigrateDependenciesOptions): MigrateDependenciesResult {
	const { dir, apply = false, useGit = false } = options;
	const cwd = resolve(dir);
	const entities = scanPlanFiles(dir, { cache: false });

	const renamed: DependencyRename[] = [];
	const reverseFlags: DependencyReverseFlag[] = [];

	for (const entity of entities) {
		if (entity.type !== 'work' && entity.type !== 'bug') continue;
		const absPath = resolve(dir, entity.file);
		let content: string;
		try {
			content = readFileSync(absPath, 'utf8');
		} catch {
			continue;
		}
		const lines = content.split('\n');
		let changed = false;

		for (let i = 0; i < lines.length; i++) {
			const m = lines[i].match(DEPENDENCIES_HEADING_RE);
			if (!m) continue;

			renamed.push({ file: entity.file, line: i + 1 });
			lines[i] = `${m[1]}Blocked by${m[2]}`;
			changed = true;

			// Scan the section body (until the next H2 or the closing tag) for
			// reverse-direction prose, flagging lines that reference an entity ID.
			for (let j = i + 1; j < lines.length; j++) {
				if (/^##\s+/.test(lines[j]) || /^\{%\s+\//.test(lines[j])) break;
				const hint = REVERSE_HINTS.find(h => h.re.test(lines[j]));
				if (hint && /\b(WORK|BUG|SPEC|ADR)-\d+\b/.test(lines[j])) {
					reverseFlags.push({ file: entity.file, line: j + 1, text: lines[j].trim(), reason: hint.reason });
				}
			}
		}

		if (changed && apply) {
			writeFileSync(absPath, lines.join('\n'));
			if (useGit) git(cwd, ['add', entity.file]);
		}
	}

	return {
		mode: apply ? 'apply' : 'dry-run',
		scanned: entities.length,
		renamed,
		reverseFlags,
		exitCode: EXIT_SUCCESS,
	};
}
