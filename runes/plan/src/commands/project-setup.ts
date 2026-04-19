import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface InstallRoot {
	/** Absolute path to the package.json file. */
	packageJsonPath: string;
	/** Directory containing the package.json. */
	rootDir: string;
	/** True if this package declares a workspace (npm/yarn workspaces, pnpm workspace, or lerna). */
	isWorkspaceRoot: boolean;
}

const MAX_ASCENT = 6;

/**
 * Walk up from `startDir` looking for the nearest package.json. If any
 * ancestor is a workspace root (declares `workspaces`, or has a sibling
 * `pnpm-workspace.yaml` / `lerna.json`), prefer that. Returns null if no
 * package.json is reachable within MAX_ASCENT levels.
 */
export function findInstallRoot(startDir: string): InstallRoot | null {
	const start = resolve(startDir);
	let nearest: InstallRoot | null = null;
	let current = start;

	for (let i = 0; i <= MAX_ASCENT; i++) {
		const pkgPath = join(current, 'package.json');
		if (existsSync(pkgPath)) {
			const isWorkspace = detectWorkspaceRoot(current, pkgPath);
			const candidate: InstallRoot = {
				packageJsonPath: pkgPath,
				rootDir: current,
				isWorkspaceRoot: isWorkspace,
			};
			if (isWorkspace) {
				return candidate;
			}
			if (!nearest) {
				nearest = candidate;
			}
		}
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}

	return nearest;
}

function detectWorkspaceRoot(dir: string, pkgPath: string): boolean {
	if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return true;
	if (existsSync(join(dir, 'lerna.json'))) return true;
	try {
		const raw = readFileSync(pkgPath, 'utf-8');
		const pkg = JSON.parse(raw);
		if (pkg && pkg.workspaces) return true;
	} catch {
		// Malformed package.json — treat as non-workspace.
	}
	return false;
}

const LOCKFILES: { file: string; pm: PackageManager }[] = [
	{ file: 'bun.lockb', pm: 'bun' },
	{ file: 'bun.lock', pm: 'bun' },
	{ file: 'pnpm-lock.yaml', pm: 'pnpm' },
	{ file: 'yarn.lock', pm: 'yarn' },
	{ file: 'package-lock.json', pm: 'npm' },
];

const VALID_PMS: PackageManager[] = ['npm', 'pnpm', 'yarn', 'bun'];

/**
 * Read the corepack `packageManager` field from package.json. Returns the
 * bare name (e.g. "pnpm") when valid, otherwise null.
 */
function readPackageManagerField(rootDir: string): PackageManager | null {
	const pkgPath = join(rootDir, 'package.json');
	if (!existsSync(pkgPath)) return null;
	try {
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
		const field = typeof pkg.packageManager === 'string' ? pkg.packageManager : '';
		const name = field.split('@')[0].trim().toLowerCase();
		if ((VALID_PMS as string[]).includes(name)) return name as PackageManager;
	} catch {
		// Malformed package.json — treat as unset.
	}
	return null;
}

/**
 * Detect the package manager for a project. Order of precedence:
 *
 *   1. The corepack `packageManager` field in package.json (authoritative).
 *   2. The most recently modified lockfile. Repositories sometimes accumulate
 *      stale lockfiles (e.g. an old pnpm-lock.yaml left behind after a switch
 *      to npm), and the newest mtime is the best heuristic for which PM is
 *      currently active.
 *   3. Defaults to npm when no lockfile is present.
 */
export function detectPackageManager(rootDir: string): PackageManager {
	const fromField = readPackageManagerField(rootDir);
	if (fromField) return fromField;

	let newest: { pm: PackageManager; mtime: number } | null = null;
	for (const { file, pm } of LOCKFILES) {
		const path = join(rootDir, file);
		if (!existsSync(path)) continue;
		let mtime: number;
		try {
			mtime = statSync(path).mtimeMs;
		} catch {
			continue;
		}
		if (!newest || mtime > newest.mtime) {
			newest = { pm, mtime };
		}
	}
	return newest ? newest.pm : 'npm';
}

/** Shell command that installs dependencies for the given package manager. */
export function installCommand(pm: PackageManager): string {
	switch (pm) {
		case 'pnpm': return 'pnpm install';
		case 'yarn': return 'yarn install';
		case 'bun': return 'bun install';
		case 'npm':
		default: return 'npm install';
	}
}
