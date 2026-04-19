import { existsSync, readFileSync } from 'fs';
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

/**
 * Detect the package manager for a project by looking at lockfiles in
 * `rootDir`. Returns 'npm' as the default when no lockfile is present.
 */
export function detectPackageManager(rootDir: string): PackageManager {
	if (existsSync(join(rootDir, 'bun.lockb')) || existsSync(join(rootDir, 'bun.lock'))) {
		return 'bun';
	}
	if (existsSync(join(rootDir, 'pnpm-lock.yaml'))) {
		return 'pnpm';
	}
	if (existsSync(join(rootDir, 'yarn.lock'))) {
		return 'yarn';
	}
	return 'npm';
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
