import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const binPath = join(__dirname, '..', 'dist', 'bin.js');

function run(args: string[]): { stdout: string; stderr: string; status: number | null } {
	const result = spawnSync('node', [binPath, ...args], {
		encoding: 'utf-8',
		cwd: __dirname,
	});
	return {
		stdout: result.stdout ?? '',
		stderr: result.stderr ?? '',
		status: result.status,
	};
}

describe('bin — flag validation', () => {
	it('bin exists (run `npm run build` in packages/create-refrakt if this fails)', () => {
		expect(existsSync(binPath)).toBe(true);
	});

	it('rejects unknown --type value', () => {
		const r = run(['x', '--type', 'website']);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('--type must be "site", "theme", or "plan"');
	});

	it('rejects --type plan with --target', () => {
		const r = run(['x', '--type', 'plan', '--target', 'astro']);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('--target');
		expect(r.stderr).toContain('cannot be used with --type plan');
	});

	it('rejects --type plan with --theme', () => {
		const r = run(['x', '--type', 'plan', '--theme', '@refrakt-md/aurora']);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('--theme');
		expect(r.stderr).toContain('cannot be used with --type plan');
	});

	it('rejects --type plan with --scope', () => {
		const r = run(['x', '--type', 'plan', '--scope', '@my-org']);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('--scope');
		expect(r.stderr).toContain('cannot be used with --type plan');
	});

	it('rejects --type theme with --target', () => {
		const r = run(['x', '--type', 'theme', '--target', 'astro']);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('--target cannot be used with --type theme');
	});

	it('rejects --scope on non-theme types', () => {
		const r = run(['x', '--type', 'site', '--scope', '@my-org']);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('--scope can only be used with --type theme');
	});

	it('help mentions the plan type', () => {
		const r = run(['--help']);
		expect(r.status).toBe(0);
		expect(r.stdout).toContain('--type <site|theme|plan>');
		expect(r.stdout).toContain('--type plan');
	});
});
