import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CLI = resolve(import.meta.dirname, '../dist/bin.js');
const REPO_ROOT = resolve(import.meta.dirname, '../../..');

function run(cwd: string, ...args: string[]): { output: string; exitCode: number } {
	try {
		const stdout = execFileSync('node', [CLI, ...args], {
			encoding: 'utf8',
			timeout: 120_000,
			cwd,
		});
		return { output: stdout, exitCode: 0 };
	} catch (err: any) {
		return { output: (err.stderr || '') + (err.stdout || ''), exitCode: err.status ?? 1 };
	}
}

let tempDir: string;

/** A minimal but real project: lumina + the core packages symlinked in, so the
 *  theme and plugin resolution the config layer checks is genuine rather than
 *  stubbed. */
function scaffold(config: unknown, files: Record<string, string>): void {
	const nm = join(tempDir, 'node_modules', '@refrakt-md');
	mkdirSync(nm, { recursive: true });
	for (const pkg of ['runes', 'transform', 'types', 'lumina', 'content', 'marketing']) {
		try {
			symlinkSync(
				join(REPO_ROOT, pkg === 'marketing' ? 'plugins' : 'packages', pkg),
				join(nm, pkg),
			);
		} catch {
			// already linked
		}
	}
	writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'proj', type: 'module' }));
	writeFileSync(join(tempDir, 'refrakt.config.json'), JSON.stringify(config, null, 2));
	for (const [rel, body] of Object.entries(files)) {
		const abs = join(tempDir, rel);
		mkdirSync(resolve(abs, '..'), { recursive: true });
		writeFileSync(abs, body);
	}
}

const BASE_CONFIG = {
	sites: { main: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'svelte' } },
};

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'refrakt-validate-'));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

describe('refrakt validate (SPEC-135 D1–D4 / WORK-578)', () => {
	describe('it validates the project, not baseConfig', () => {
		it('passes a clean site and exits zero', () => {
			scaffold(BASE_CONFIG, { 'content/index.md': '# Hello\n\nJust prose.\n' });

			const { output, exitCode } = run(tempDir, 'validate');
			expect(exitCode).toBe(0);
			expect(output).toContain('content: OK');
			expect(output).not.toMatch(/base theme config/i);
		});

		it('reports an undefined tag with its file and line, and exits non-zero', () => {
			scaffold(BASE_CONFIG, {
				'content/index.md': '# Hello\n\n{% notarealrune %}\nbody\n{% /notarealrune %}\n',
			});

			const { output, exitCode } = run(tempDir, 'validate');
			expect(exitCode).toBe(1);
			expect(output).toContain('tag-undefined');
			expect(output).toContain('index.md');
		});

		it('validates every site when none is named', () => {
			scaffold(
				{
					sites: {
						main: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'svelte' },
						blog: { contentDir: './blog', theme: '@refrakt-md/lumina', target: 'svelte' },
					},
				},
				{ 'content/index.md': '# Main\n', 'blog/index.md': '# Blog\n' },
			);

			const { output } = run(tempDir, 'validate');
			expect(output).toContain('main');
			expect(output).toContain('blog');
		});

		it('--site restricts to one', () => {
			scaffold(
				{
					sites: {
						main: { contentDir: './content', theme: '@refrakt-md/lumina', target: 'svelte' },
						blog: { contentDir: './blog', theme: '@refrakt-md/lumina', target: 'svelte' },
					},
				},
				{ 'content/index.md': '# Main\n', 'blog/index.md': '# Blog\n' },
			);

			const { output } = run(tempDir, 'validate', '--site', 'blog');
			expect(output).toContain('blog');
			expect(output).not.toMatch(/^main$/m);
		});
	});

	// D2 — "A validation command must never report success on nothing."
	describe('never reports success on nothing', () => {
		it('says so when there is no config, and exits non-zero', () => {
			const { output, exitCode } = run(tempDir, 'validate');
			expect(exitCode).toBe(1);
			expect(output).toContain('Nothing to validate');
			expect(output).not.toMatch(/\bOK\b/);
		});

		it('names the declared sites when --site does not match', () => {
			scaffold(BASE_CONFIG, { 'content/index.md': '# Hi\n' });

			const { output, exitCode } = run(tempDir, 'validate', '--site', 'nope');
			expect(exitCode).toBe(1);
			expect(output).toContain('main');
		});
	});

	// D1 — config resolution runs first, because its failures *cause* content
	// findings. A swallowed plugin load turns every rune it contributes into a
	// `tag-undefined` error against content that is perfectly correct.
	describe('config resolution runs first and explains what it would cause', () => {
		it('reports an unresolvable plugin', () => {
			scaffold(
				{
					sites: {
						main: {
							contentDir: './content',
							theme: '@refrakt-md/lumina',
							target: 'svelte',
							plugins: ['@refrakt-md/not-a-real-plugin'],
						},
					},
				},
				{ 'content/index.md': '# Hi\n' },
			);

			const { output, exitCode } = run(tempDir, 'validate');
			expect(exitCode).toBe(1);
			expect(output).toContain('not-a-real-plugin');
			expect(output).toContain('plugins[0]');
		});

		it('suppresses content findings rather than reporting them as peers', () => {
			scaffold(
				{
					sites: {
						main: {
							contentDir: './content',
							theme: '@refrakt-md/lumina',
							target: 'svelte',
							plugins: ['@refrakt-md/not-a-real-plugin'],
						},
					},
				},
				// `hero` is a marketing rune. With the plugin unresolved it would be
				// reported as an undefined tag — a finding whose real cause is the
				// config line above.
				{ 'content/index.md': '# Hi\n\n{% hero %}\nbody\n{% /hero %}\n' },
			);

			const { output } = run(tempDir, 'validate');
			expect(output).toContain('skipped');
			expect(output).not.toContain('tag-undefined');
		});

		it('reports an unresolvable theme', () => {
			scaffold(
				{ sites: { main: { contentDir: './content', theme: '@refrakt-md/no-such-theme' } } },
				{ 'content/index.md': '# Hi\n' },
			);

			const { output, exitCode } = run(tempDir, 'validate');
			expect(exitCode).toBe(1);
			expect(output).toContain('no-such-theme');
		});
	});

	describe('flags', () => {
		beforeEach(() => {
			scaffold(BASE_CONFIG, {
				'content/index.md': '# Hi\n\n{% notarealrune %}\nx\n{% /notarealrune %}\n',
			});
		});

		it('--only config skips content, so a content error does not fail it', () => {
			const { output, exitCode } = run(tempDir, 'validate', '--only', 'config');
			expect(exitCode).toBe(0);
			expect(output).toContain('config: OK');
			expect(output).not.toContain('tag-undefined');
		});

		it('--only content skips the config layer', () => {
			const { output, exitCode } = run(tempDir, 'validate', '--only', 'content');
			expect(exitCode).toBe(1);
			expect(output).toContain('tag-undefined');
			expect(output).not.toContain('config: OK');
		});

		it('--format json emits structured findings', () => {
			const { output, exitCode } = run(tempDir, 'validate', '--format', 'json');
			expect(exitCode).toBe(1);

			const parsed = JSON.parse(output);
			const finding = parsed.sites[0].content[0];
			expect(finding).toMatchObject({
				file: expect.stringContaining('index.md'),
				severity: 'error',
				id: 'tag-undefined',
			});
			expect(typeof finding.line).toBe('number');
		});

		it('--deep still reports the finding', () => {
			const { output, exitCode } = run(tempDir, 'validate', '--deep');
			expect(exitCode).toBe(1);
			expect(output).toContain('tag-undefined');
		});

		it('rejects an invalid --only value', () => {
			const { output, exitCode } = run(tempDir, 'validate', '--only', 'everything');
			expect(exitCode).toBe(1);
			expect(output).toContain('--only must be');
		});

		// D3 — no `--strict` ships. Warnings never affect the exit code, and the
		// flag is refused loudly so nobody assumes it silently worked.
		it('refuses --strict and says why', () => {
			const { output, exitCode } = run(tempDir, 'validate', '--strict');
			expect(exitCode).toBe(1);
			expect(output).toContain('does not exist');
			expect(output).toMatch(/warnings never affect the exit code/i);
		});
	});

	// D3 / D4 — errors gate, warnings and info do not. And D11 — `critical`
	// findings are reported whatever the config says, which is the line between
	// "this project has decided not to care" and "this document could not be
	// understood".
	describe('exit code, and what can silence a finding', () => {
		it('is zero when a suppressible finding is demoted by disableIds', () => {
			scaffold(
				{
					sites: {
						main: {
							contentDir: './content',
							theme: '@refrakt-md/lumina',
							target: 'svelte',
							// `attribute-undefined` is level `error` — suppressible.
							// `disableIds` demotes it to info rather than dropping it, so
							// it stays visible and stops gating.
							validation: { enabled: true, disableIds: ['attribute-undefined'] },
						},
					},
				},
				{ 'content/index.md': '# Hi\n\n{% hint type="warning" bogus="x" %}\ny\n{% /hint %}\n' },
			);

			const { output, exitCode } = run(tempDir, 'validate');
			expect(exitCode).toBe(0);
			expect(output).toContain('0 errors');
			// Demoted, not deleted — still reported, at info.
			expect(output).toContain('attribute-undefined');
		});

		it('still fails on a critical finding that disableIds names (D11)', () => {
			scaffold(
				{
					sites: {
						main: {
							contentDir: './content',
							theme: '@refrakt-md/lumina',
							target: 'svelte',
							// `tag-undefined` is level `critical`. Nothing silences it —
							// not the allow-list, not disableIds, not `enabled: false`.
							validation: { enabled: false, disableIds: ['tag-undefined'] },
						},
					},
				},
				{ 'content/index.md': '# Hi\n\n{% notarealrune %}\nx\n{% /notarealrune %}\n' },
			);

			const { output, exitCode } = run(tempDir, 'validate');
			expect(exitCode).toBe(1);
			expect(output).toContain('tag-undefined');
		});
	});
});
