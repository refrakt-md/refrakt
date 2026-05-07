/**
 * Plan-side helpers for reading the unified `refrakt.config.json`.
 *
 * The plan commands need to know the plan directory. Resolution order is:
 *   1. CLI flag (`--dir <path>`) — highest precedence, handled by each command.
 *   2. `REFRAKT_PLAN_DIR` environment variable — legacy escape hatch.
 *   3. `plan.dir` from `refrakt.config.json` — set by `plan init` for new projects.
 *   4. Default `'plan'`.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ResolvedPlanConfig {
	/** The plan directory, relative to `cwd`. */
	dir: string;
	/** Where the value came from — useful for diagnostics. */
	source: 'flag' | 'env' | 'config' | 'default';
}

/** Resolve the plan directory.
 *
 *  Pass the parsed argv flag as `argFlag` if the command surfaces `--dir`. */
export function resolvePlanDir(argFlag?: string, cwd: string = process.cwd()): ResolvedPlanConfig {
	if (argFlag) return { dir: argFlag, source: 'flag' };

	const env = process.env.REFRAKT_PLAN_DIR;
	if (env) return { dir: env, source: 'env' };

	const fromConfig = readPlanDirFromConfig(cwd);
	if (fromConfig) return { dir: fromConfig, source: 'config' };

	return { dir: 'plan', source: 'default' };
}

/** Read `plan.dir` from `refrakt.config.json` if the file exists and declares it. */
function readPlanDirFromConfig(cwd: string): string | undefined {
	const configPath = resolve(cwd, 'refrakt.config.json');
	if (!existsSync(configPath)) return undefined;
	try {
		const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as { plan?: { dir?: unknown } };
		const dir = raw.plan?.dir;
		return typeof dir === 'string' && dir.length > 0 ? dir : undefined;
	} catch {
		return undefined;
	}
}

export interface ScaffoldConfigResult {
	/** What happened to refrakt.config.json. */
	action: 'created' | 'extended' | 'preserved' | 'skipped';
	/** Absolute path to the config file. */
	path: string;
	/** Pretty-printed message for `plan init` output. */
	message: string;
}

/**
 * Ensure `refrakt.config.json` exists with a `plan` section.
 *
 * - **created**: file did not exist; created with `{ "plan": { "dir": <relativeDir> } }`.
 * - **extended**: file existed without a `plan` section; added one in place.
 * - **preserved**: file already had a `plan` section; left untouched.
 * - **skipped**: file exists but is unreadable or invalid JSON; we don't try to fix it.
 */
export function scaffoldRefraktConfigForPlan(opts: {
	projectRoot: string;
	planDir: string;
}): ScaffoldConfigResult {
	const configPath = resolve(opts.projectRoot, 'refrakt.config.json');
	const planSection = { dir: relativeDir(opts.projectRoot, opts.planDir) };

	if (!existsSync(configPath)) {
		const fresh = { plan: planSection };
		writeFileSync(configPath, JSON.stringify(fresh, null, '\t') + '\n');
		return {
			action: 'created',
			path: configPath,
			message: `Created refrakt.config.json with plan section`,
		};
	}

	let raw: Record<string, unknown>;
	let originalText: string;
	try {
		originalText = readFileSync(configPath, 'utf-8');
		raw = JSON.parse(originalText) as Record<string, unknown>;
	} catch {
		return {
			action: 'skipped',
			path: configPath,
			message: `refrakt.config.json exists but could not be parsed — left untouched`,
		};
	}

	if (raw.plan !== undefined) {
		return {
			action: 'preserved',
			path: configPath,
			message: `refrakt.config.json already has a plan section — left untouched`,
		};
	}

	const indent = detectIndent(originalText);
	const updated = { ...raw, plan: planSection };
	writeFileSync(configPath, JSON.stringify(updated, null, indent) + '\n');
	return {
		action: 'extended',
		path: configPath,
		message: `Added plan section to existing refrakt.config.json`,
	};
}

/** Return the plan dir relative to projectRoot when possible — otherwise the
 *  raw value (so absolute paths survive verbatim). */
function relativeDir(projectRoot: string, planDir: string): string {
	const absRoot = resolve(projectRoot);
	const absPlan = resolve(planDir);
	if (absPlan.startsWith(absRoot + '/')) {
		return absPlan.slice(absRoot.length + 1);
	}
	return planDir;
}

/** Sniff the indentation style of an existing JSON file so re-serialization
 *  preserves the formatting where reasonable. Falls back to tabs (project
 *  convention). */
function detectIndent(text: string): string | number {
	const lines = text.split('\n').slice(0, 20);
	for (const line of lines) {
		if (line.startsWith('\t')) return '\t';
		const match = line.match(/^( +)\S/);
		if (match) return match[1]!.length;
	}
	return '\t';
}
