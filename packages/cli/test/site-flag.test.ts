import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CLI = resolve(import.meta.dirname, '../dist/bin.js');
const REPO_ROOT = resolve(import.meta.dirname, '../../..');

function run(cwd: string, ...args: string[]): { stdout: string; exitCode: number } {
	try {
		const stdout = execFileSync('node', [CLI, ...args], {
			encoding: 'utf8',
			timeout: 15000,
			cwd,
		});
		return { stdout, exitCode: 0 };
	} catch (err: any) {
		return { stdout: (err.stderr || '') + (err.stdout || ''), exitCode: err.status ?? 1 };
	}
}

let tempDir: string;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'refrakt-site-flag-'));

	const nm = join(tempDir, 'node_modules');
	mkdirSync(join(nm, '@refrakt-md'), { recursive: true });
	for (const pkg of ['runes', 'transform', 'types', 'lumina']) {
		const target = resolve(REPO_ROOT, `packages/${pkg}`);
		symlinkSync(target, join(nm, `@refrakt-md/${pkg}`));
	}
	const markdocSrc = resolve(REPO_ROOT, 'node_modules/@markdoc/markdoc');
	mkdirSync(join(nm, '@markdoc'), { recursive: true });
	symlinkSync(markdocSrc, join(nm, '@markdoc/markdoc'));

	writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'fixture' }));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

describe('--site flag on inspect', () => {
	it('uses the lone site automatically when only one is declared', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({
				site: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'svelte' },
			}),
		);
		const { exitCode } = run(tempDir, 'inspect', 'hint', '--type=warning');
		expect(exitCode).toBe(0);
	});

	it('errors when multi-site config is queried without --site', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({
				sites: {
					main: { contentDir: './a', theme: '@refrakt-md/lumina', target: 'svelte' },
					blog: { contentDir: './b', theme: '@refrakt-md/lumina', target: 'svelte' },
				},
			}),
		);
		const { stdout, exitCode } = run(tempDir, 'inspect', 'hint', '--type=warning');
		expect(exitCode).toBe(1);
		expect(stdout).toMatch(/multiple sites|Pass an explicit site name/);
	});

	it('selects the named site from a multi-site config', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({
				sites: {
					main: { contentDir: './a', theme: '@refrakt-md/lumina', target: 'svelte' },
					blog: { contentDir: './b', theme: '@refrakt-md/lumina', target: 'svelte' },
				},
			}),
		);
		const { exitCode } = run(tempDir, 'inspect', 'hint', '--type=warning', '--site', 'main');
		expect(exitCode).toBe(0);
	});

	it('errors with did-you-mean when --site name is unknown', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({
				sites: {
					main: { contentDir: './a', theme: '@refrakt-md/lumina', target: 'svelte' },
				},
			}),
		);
		const { stdout, exitCode } = run(tempDir, 'inspect', 'hint', '--type=warning', '--site', 'maim');
		expect(exitCode).toBe(1);
		expect(stdout).toMatch(/Did you mean "main"/);
	});

	it('errors when --site is used in a planning-only project', () => {
		writeFileSync(
			join(tempDir, 'refrakt.config.json'),
			JSON.stringify({ plan: { dir: 'plan' } }),
		);
		const { stdout, exitCode } = run(tempDir, 'inspect', 'hint', '--site', 'main');
		expect(exitCode).toBe(1);
		expect(stdout).toMatch(/No site configured/);
	});
});
