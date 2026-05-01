import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CLI = resolve(import.meta.dirname, '../dist/bin.js');

let tempDir: string;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'refrakt-config-migrate-'));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

function run(...args: string[]): { stdout: string; exitCode: number } {
	try {
		const stdout = execFileSync('node', [CLI, ...args], {
			encoding: 'utf8',
			timeout: 10000,
			cwd: tempDir,
		});
		return { stdout, exitCode: 0 };
	} catch (err: any) {
		return { stdout: (err.stderr || '') + (err.stdout || ''), exitCode: err.status ?? 1 };
	}
}

function readConfig(): any {
	return JSON.parse(readFileSync(join(tempDir, 'refrakt.config.json'), 'utf-8'));
}

describe('refrakt config migrate', () => {
	it('flat → singular site (dry run shows diff but does not write)', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({
				contentDir: './content',
				theme: '@refrakt-md/lumina',
				target: 'svelte',
				packages: ['@refrakt-md/marketing'],
			}, null, '\t'),
		);
		const before = readConfig();
		const { stdout, exitCode } = run('config', 'migrate');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('Dry run');
		// File unchanged
		expect(readConfig()).toEqual(before);
	});

	it('flat → singular site with --apply writes the change', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({
				contentDir: './content',
				theme: '@refrakt-md/lumina',
				target: 'svelte',
				packages: ['@refrakt-md/marketing'],
				plugins: ['@refrakt-md/plan'],
			}, null, '\t'),
		);
		const { stdout, exitCode } = run('config', 'migrate', '--apply');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('Updated');
		const after = readConfig();
		expect(after.site).toEqual({
			contentDir: './content',
			theme: '@refrakt-md/lumina',
			target: 'svelte',
			packages: ['@refrakt-md/marketing'],
		});
		expect(after.contentDir).toBeUndefined();
		expect(after.plugins).toEqual(['@refrakt-md/plan']); // top-level fields preserved
	});

	it('singular → multi-site requires --name', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({
				site: { contentDir: './content', theme: 't', target: 'svelte' },
			}),
		);
		const { stdout, exitCode } = run('config', 'migrate', '--to', 'multi-site', '--apply');
		expect(exitCode).toBe(1);
		expect(stdout).toContain('--name');
	});

	it('singular → multi-site with --name promotes to sites map', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({
				site: { contentDir: './content', theme: 't', target: 'svelte' },
			}, null, '\t'),
		);
		const { exitCode } = run('config', 'migrate', '--to', 'multi-site', '--name', 'main', '--apply');
		expect(exitCode).toBe(0);
		const after = readConfig();
		expect(after.sites).toEqual({
			main: { contentDir: './content', theme: 't', target: 'svelte' },
		});
		expect(after.site).toBeUndefined();
	});

	it('idempotent — running on an already-migrated config is a no-op', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({
				site: { contentDir: './content', theme: 't', target: 'svelte' },
			}, null, '\t'),
		);
		const before = readConfig();
		const { stdout, exitCode } = run('config', 'migrate', '--apply');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('No changes needed');
		expect(readConfig()).toEqual(before);
	});

	it('refuses to migrate a config that has both site and sites', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({
				site: { contentDir: './a', theme: 't', target: 'svelte' },
				sites: { other: { contentDir: './b', theme: 't', target: 'svelte' } },
			}),
		);
		const { stdout, exitCode } = run('config', 'migrate', '--apply');
		expect(exitCode).toBe(1);
		expect(stdout).toContain('declares both');
	});

	it('errors when refrakt.config.json is missing', () => {
		const { stdout, exitCode } = run('config', 'migrate');
		expect(exitCode).toBe(1);
		expect(stdout).toContain('not found');
	});

	it('--to multi-site refuses to run if config is in flat shape', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({
				contentDir: './content',
				theme: 't',
				target: 'svelte',
			}),
		);
		const { stdout, exitCode } = run('config', 'migrate', '--to', 'multi-site', '--name', 'main', '--apply');
		expect(exitCode).toBe(1);
		expect(stdout).toContain('no "site" section');
	});

	it('shows config command in --help', () => {
		// Run from project root, not tempDir
		const stdout = execFileSync('node', [CLI, '--help'], { encoding: 'utf8', timeout: 5000 });
		expect(stdout).toContain('config <subcommand>');
	});
});
