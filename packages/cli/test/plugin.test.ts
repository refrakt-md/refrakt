import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { join } from 'path';

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

describe('plugin discovery', () => {
	it('should load the plan plugin and show help', () => {
		const { stdout, exitCode } = run('plan', '--help');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('refrakt plan');
		expect(stdout).toContain('status');
		expect(stdout).toContain('next');
		expect(stdout).toContain('update');
		expect(stdout).toContain('validate');
		expect(stdout).toContain('create');
		expect(stdout).toContain('init');
		expect(stdout).toContain('serve');
		expect(stdout).toContain('build');
	});

	it('should show help when no subcommand is given', () => {
		const { stdout, exitCode } = run('plan');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('refrakt plan');
		expect(stdout).toContain('Commands:');
	});

	it('should report error for unknown subcommand', () => {
		const { stdout, exitCode } = run('plan', 'nonexistent');
		expect(exitCode).toBe(1);
		expect(stdout).toContain('Unknown plan command');
		expect(stdout).toContain('nonexistent');
	});

	it('should report install instructions for missing plugin packages', () => {
		const { stdout, exitCode } = run('fakepkg');
		expect(exitCode).toBe(1);
		expect(stdout).toContain('@refrakt-md/fakepkg');
		expect(stdout).toContain('npm install');
	});

	it('should not break existing commands', () => {
		const { stdout, exitCode } = run('--help');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('inspect');
		expect(stdout).toContain('write');
		expect(stdout).toContain('contracts');
	});
});
