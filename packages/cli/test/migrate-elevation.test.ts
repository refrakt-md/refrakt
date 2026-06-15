import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CLI = resolve(import.meta.dirname, '../dist/bin.js');

let tempDir: string;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'refrakt-migrate-elevation-'));
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

function write(name: string, content: string): string {
	const path = join(tempDir, name);
	writeFileSync(path, content);
	return path;
}

function read(name: string): string {
	return readFileSync(join(tempDir, name), 'utf-8');
}

describe('refrakt migrate elevation', () => {
	it('maps each deprecated value to its ladder rung with --apply', () => {
		write('page.md', [
			'{% card elevation="none" %}a{% /card %}',
			'{% card elevation="sm" %}b{% /card %}',
			'{% card elevation="md" %}c{% /card %}',
			'{% figure elevation="lg" %}d{% /figure %}',
		].join('\n'));

		const { stdout, exitCode } = run('migrate', 'elevation', 'page.md', '--apply');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('Migrated 4');

		const out = read('page.md');
		expect(out).toContain('elevation="flat"');     // none → flat
		expect(out).toContain('elevation="raised"');   // sm/md → raised
		expect(out).toContain('elevation="floating"'); // lg → floating
		expect(out).not.toMatch(/elevation="(none|sm|md|lg)"/);
	});

	it('leaves frame-shadow untouched (same legacy values, different attribute)', () => {
		write('page.md', '{% showcase frame-shadow="sm" elevation="lg" %}x{% /showcase %}');
		run('migrate', 'elevation', 'page.md', '--apply');
		const out = read('page.md');
		expect(out).toContain('frame-shadow="sm"'); // preserved
		expect(out).toContain('elevation="floating"');
	});

	it('dry-run reports a diff but does not write', () => {
		const before = '{% card elevation="md" %}x{% /card %}\n';
		write('page.md', before);
		const { stdout, exitCode } = run('migrate', 'elevation', 'page.md');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('Dry run');
		expect(stdout).toContain('Would migrate');
		expect(read('page.md')).toBe(before); // unchanged
	});

	it('is idempotent — already-migrated ladder values are not rewritten', () => {
		const content = '{% card elevation="flat" %}x{% /card %}\n';
		write('page.md', content);
		const { stdout } = run('migrate', 'elevation', 'page.md', '--apply');
		expect(stdout).toContain('nothing to migrate');
		expect(read('page.md')).toBe(content);
	});

	it('walks a directory recursively and skips dotfiles', () => {
		mkdirSync(join(tempDir, 'runes'));
		write('runes/card.md', '{% card elevation="sm" %}x{% /card %}');
		write('runes/figure.md', '{% figure elevation="lg" %}y{% /figure %}');
		const { stdout, exitCode } = run('migrate', 'elevation', 'runes', '--apply');
		expect(exitCode).toBe(0);
		expect(stdout).toContain('across 2 files');
		expect(read('runes/card.md')).toContain('elevation="raised"');
		expect(read('runes/figure.md')).toContain('elevation="floating"');
	});
});
