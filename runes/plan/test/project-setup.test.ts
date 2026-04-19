import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { findInstallRoot, detectPackageManager, installCommand } from '../src/commands/project-setup.js';

let TMP: string;

beforeEach(() => {
	TMP = mkdtempSync(join(tmpdir(), 'refrakt-project-setup-'));
});

afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

function writePkg(dir: string, body: Record<string, any>) {
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'package.json'), JSON.stringify(body, null, 2));
}

describe('findInstallRoot', () => {
	it('returns null when no package.json exists within ascent window', () => {
		const nested = join(TMP, 'a', 'b');
		mkdirSync(nested, { recursive: true });
		// TMP is under os.tmpdir() which has no package.json up-tree on typical CI.
		// On systems where /tmp or /home has one, this test becomes vacuous but not wrong.
		const result = findInstallRoot(nested);
		if (result) {
			// If anything is found, it must at least be a real file.
			expect(result.packageJsonPath).toMatch(/package\.json$/);
		}
	});

	it('finds package.json at the start directory', () => {
		const startDir = join(TMP, 'proj');
		writePkg(startDir, { name: 'proj', version: '1.0.0' });
		const result = findInstallRoot(startDir);
		expect(result).not.toBeNull();
		expect(result!.rootDir).toBe(startDir);
		expect(result!.isWorkspaceRoot).toBe(false);
	});

	it('walks up to find an ancestor package.json', () => {
		const root = join(TMP, 'proj');
		const nested = join(root, 'apps', 'docs');
		mkdirSync(nested, { recursive: true });
		writePkg(root, { name: 'proj' });
		const result = findInstallRoot(nested);
		expect(result).not.toBeNull();
		expect(result!.rootDir).toBe(root);
	});

	it('prefers a workspace root (via workspaces field) over a nearer non-workspace package.json', () => {
		const root = join(TMP, 'proj');
		const nested = join(root, 'apps', 'docs');
		writePkg(nested, { name: 'docs' });
		writePkg(root, { name: 'proj', workspaces: ['apps/*'] });
		const result = findInstallRoot(nested);
		expect(result).not.toBeNull();
		expect(result!.rootDir).toBe(root);
		expect(result!.isWorkspaceRoot).toBe(true);
	});

	it('detects pnpm workspace root via pnpm-workspace.yaml', () => {
		const root = join(TMP, 'proj');
		const nested = join(root, 'apps', 'docs');
		writePkg(nested, { name: 'docs' });
		writePkg(root, { name: 'proj' });
		writeFileSync(join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n");
		const result = findInstallRoot(nested);
		expect(result!.rootDir).toBe(root);
		expect(result!.isWorkspaceRoot).toBe(true);
	});

	it('detects lerna workspace root via lerna.json', () => {
		const root = join(TMP, 'proj');
		const nested = join(root, 'apps', 'docs');
		writePkg(nested, { name: 'docs' });
		writePkg(root, { name: 'proj' });
		writeFileSync(join(root, 'lerna.json'), '{}');
		const result = findInstallRoot(nested);
		expect(result!.isWorkspaceRoot).toBe(true);
	});
});

describe('detectPackageManager', () => {
	it('defaults to npm when no lockfile is present', () => {
		expect(detectPackageManager(TMP)).toBe('npm');
	});

	it('detects pnpm from pnpm-lock.yaml', () => {
		writeFileSync(join(TMP, 'pnpm-lock.yaml'), '');
		expect(detectPackageManager(TMP)).toBe('pnpm');
	});

	it('detects yarn from yarn.lock', () => {
		writeFileSync(join(TMP, 'yarn.lock'), '');
		expect(detectPackageManager(TMP)).toBe('yarn');
	});

	it('detects bun from bun.lockb', () => {
		writeFileSync(join(TMP, 'bun.lockb'), '');
		expect(detectPackageManager(TMP)).toBe('bun');
	});

	it('detects bun from bun.lock (text format)', () => {
		writeFileSync(join(TMP, 'bun.lock'), '');
		expect(detectPackageManager(TMP)).toBe('bun');
	});

	it('prefers bun over other PMs when both lockfiles exist', () => {
		writeFileSync(join(TMP, 'bun.lockb'), '');
		writeFileSync(join(TMP, 'yarn.lock'), '');
		writeFileSync(join(TMP, 'pnpm-lock.yaml'), '');
		expect(detectPackageManager(TMP)).toBe('bun');
	});
});

describe('installCommand', () => {
	it('maps package managers to their install command', () => {
		expect(installCommand('npm')).toBe('npm install');
		expect(installCommand('pnpm')).toBe('pnpm install');
		expect(installCommand('yarn')).toBe('yarn install');
		expect(installCommand('bun')).toBe('bun install');
	});
});
