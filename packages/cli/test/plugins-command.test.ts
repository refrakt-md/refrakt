import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const CLI = join(import.meta.dirname, '../dist/bin.js');
const REPO_ROOT = join(import.meta.dirname, '../../..');

function run(...args: string[]): { stdout: string; exitCode: number } {
	try {
		const stdout = execFileSync('node', [CLI, ...args], {
			encoding: 'utf8',
			timeout: 10000,
			cwd: REPO_ROOT,
		});
		return { stdout, exitCode: 0 };
	} catch (err: any) {
		return { stdout: (err.stderr || '') + (err.stdout || ''), exitCode: err.status ?? 1 };
	}
}

describe('refrakt plugins list', () => {
	it('lists installed plugins in text format by default', () => {
		const { stdout, exitCode } = run('plugins', 'list');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('Installed refrakt plugins');
		expect(stdout).toContain('plan');
		expect(stdout).toContain('@refrakt-md/plan@');
		expect(stdout).toMatch(/\d+ commands?/);
	});

	it('emits valid JSON with --format json', () => {
		const { stdout, exitCode } = run('plugins', 'list', '--format', 'json');
		expect(exitCode).toBe(0);
		const parsed = JSON.parse(stdout);
		expect(Array.isArray(parsed)).toBe(true);
		const plan = parsed.find((p: any) => p.namespace === 'plan');
		expect(plan).toBeDefined();
		expect(plan.packageName).toBe('@refrakt-md/plan');
		expect(plan.packageVersion).toMatch(/^\d+\.\d+\.\d+/);
		expect(Array.isArray(plan.commands)).toBe(true);
		expect(plan.commands[0]).toHaveProperty('name');
		expect(plan.commands[0]).toHaveProperty('description');
		expect(plan.commands[0]).toHaveProperty('hasInputSchema');
	});

	it('--json shorthand also works', () => {
		const { stdout, exitCode } = run('plugins', 'list', '--json');
		expect(exitCode).toBe(0);
		expect(() => JSON.parse(stdout)).not.toThrow();
	});

	it('shows help when no subcommand is given', () => {
		const { stdout, exitCode } = run('plugins');
		expect(exitCode).toBe(1);
		expect(stdout).toContain('Usage: refrakt plugins');
		expect(stdout).toContain('list');
	});

	it('rejects unknown subcommands', () => {
		const { stdout, exitCode } = run('plugins', 'wat');
		expect(exitCode).toBe(1);
		expect(stdout).toContain('Unknown plugins subcommand');
	});
});

describe('refrakt --help', () => {
	it('mentions the plugins command in the static help', () => {
		const { stdout, exitCode } = run('--help');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('plugins <subcommand>');
	});

	it('appends installed plugins to --help output', () => {
		const { stdout, exitCode } = run('--help');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('Installed plugins:');
		expect(stdout).toMatch(/\bplan\b/);
	});
});
