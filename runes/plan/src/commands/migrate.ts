import { execFileSync } from 'child_process';
import { existsSync, renameSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { scanPlanFiles } from '../scanner.js';

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
