import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CLI = resolve(import.meta.dirname, '../dist/bin.js');

function run(cwd: string, ...args: string[]): { output: string; exitCode: number } {
	try {
		const stdout = execFileSync('node', [CLI, ...args], {
			encoding: 'utf8',
			timeout: 15000,
			cwd,
		});
		return { output: stdout, exitCode: 0 };
	} catch (err: any) {
		return { output: (err.stderr || '') + (err.stdout || ''), exitCode: err.status ?? 1 };
	}
}

let tempDir: string;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'refrakt-theme-validate-'));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

describe('theme validate (SPEC-135 D12 / WORK-579)', () => {
	describe('the moved checks still work', () => {
		it('accepts a valid ThemeConfig', () => {
			const p = join(tempDir, 'theme.config.json');
			writeFileSync(p, JSON.stringify({ prefix: 'rf', tokenPrefix: 'rf', runes: {} }));

			const { output, exitCode } = run(tempDir, 'theme', 'validate', '--config', p);
			expect(exitCode).toBe(0);
			expect(output).toContain('Theme config: OK');
		});

		it('rejects an invalid ThemeConfig, naming each error', () => {
			const p = join(tempDir, 'theme.config.json');
			writeFileSync(p, JSON.stringify({ prefix: 42, runes: 'not-an-object' }));

			const { output, exitCode } = run(tempDir, 'theme', 'validate', '--config', p);
			expect(exitCode).toBe(1);
			expect(output).toContain('Theme config: FAIL');
			expect(output).toContain('prefix');
			expect(output).toContain('runes');
		});

		it('reports a missing file rather than silently passing', () => {
			const { output, exitCode } = run(
				tempDir,
				'theme',
				'validate',
				'--config',
				join(tempDir, 'nope.json'),
			);
			expect(exitCode).toBe(1);
			expect(output).toContain('not found');
		});

		it('runs both checks when given both paths', () => {
			const cfg = join(tempDir, 'theme.config.json');
			const man = join(tempDir, 'manifest.json');
			writeFileSync(cfg, JSON.stringify({ prefix: 'rf', tokenPrefix: 'rf', runes: {} }));
			writeFileSync(man, JSON.stringify({ name: 'X' }));

			const { output } = run(tempDir, 'theme', 'validate', '--config', cfg, '--manifest', man);
			expect(output).toContain('Validating theme config...');
			expect(output).toContain('Validating manifest...');
		});
	});

	// SPEC-135 D2: "A validation command must never report success on nothing."
	// The old behaviour was the defect that rule exists for — handed nothing, it
	// validated refrakt's own `baseConfig` and printed a checkmark.
	describe('never reports success on nothing', () => {
		it('says what it found no input for instead of validating baseConfig', () => {
			const { output, exitCode } = run(tempDir, 'theme', 'validate');
			expect(exitCode).toBe(1);
			expect(output).toContain('Nothing to validate');
			expect(output).not.toMatch(/base theme config/i);
			expect(output).not.toMatch(/\bOK\b/);
		});
	});

	describe('the bare `refrakt validate` is vacated', () => {
		it('does not validate baseConfig and does not report success', () => {
			const { output, exitCode } = run(tempDir, 'validate');
			expect(exitCode).toBe(1);
			expect(output).not.toMatch(/base theme config/i);
			expect(output).not.toMatch(/\bOK\b/);
		});

		// Retired, not aliased through a deprecation window (SPEC-135 D2). The
		// error has to name where the flag went, or this is just a regression.
		it.each(['--config', '--manifest'])('points %s at `theme validate`', (flag) => {
			const { output, exitCode } = run(tempDir, 'validate', flag, './whatever.json');
			expect(exitCode).toBe(1);
			expect(output).toContain('refrakt theme validate');
			expect(output).toContain(flag);
		});

		it('still accepts --site, which WORK-578 will use', () => {
			const { exitCode } = run(tempDir, 'validate', '--site', 'main');
			// Exits 1 because nothing is wired yet — but parses the flag rather
			// than rejecting it as unknown.
			expect(exitCode).toBe(1);
		});

		it('rejects --site with no value', () => {
			const { output } = run(tempDir, 'validate', '--site');
			expect(output).toContain('--site requires a site name');
		});
	});

	describe('discoverability', () => {
		it('lists validate among the theme subcommands', () => {
			const { output } = run(tempDir, 'theme');
			expect(output).toContain('validate');
		});

		it('describes the bare command as site validation in top-level usage', () => {
			const { output } = run(tempDir, '--help');
			expect(output).toMatch(/validate\s+Validate this project's sites/);
		});
	});
});
