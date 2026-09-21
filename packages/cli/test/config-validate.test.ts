import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CLI = resolve(import.meta.dirname, '../dist/bin.js');
const REPO_ROOT = resolve(import.meta.dirname, '../../..');

function run(cwd: string, ...args: string[]): { output: string; exitCode: number } {
	try {
		const stdout = execFileSync('node', [CLI, ...args], { encoding: 'utf8', timeout: 60_000, cwd });
		return { output: stdout, exitCode: 0 };
	} catch (err: any) {
		return { output: (err.stderr || '') + (err.stdout || ''), exitCode: err.status ?? 1 };
	}
}

let tempDir: string;

function scaffold(config: unknown): void {
	const nm = join(tempDir, 'node_modules', '@refrakt-md');
	mkdirSync(nm, { recursive: true });
	for (const pkg of ['runes', 'transform', 'types', 'lumina', 'content']) {
		try {
			symlinkSync(join(REPO_ROOT, 'packages', pkg), join(nm, pkg));
		} catch {
			// already linked
		}
	}
	writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'proj', type: 'module' }));
	writeFileSync(join(tempDir, 'refrakt.config.json'), JSON.stringify(config, null, 2));
	mkdirSync(join(tempDir, 'content'), { recursive: true });
	writeFileSync(join(tempDir, 'content/index.md'), '# Hi\n');
}

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'refrakt-config-validate-'));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

describe('refrakt config validate (SPEC-135 D12 / WORK-579 Part B)', () => {
	it('passes when every name resolves', () => {
		scaffold({ sites: { main: { contentDir: './content', theme: '@refrakt-md/lumina' } } });

		const { output, exitCode } = run(tempDir, 'config', 'validate');
		expect(exitCode).toBe(0);
		expect(output).toContain('config: OK');
	});

	it('reports an unresolvable plugin and exits non-zero', () => {
		scaffold({
			sites: {
				main: {
					contentDir: './content',
					theme: '@refrakt-md/lumina',
					plugins: ['@refrakt-md/ghost'],
				},
			},
		});

		const { output, exitCode } = run(tempDir, 'config', 'validate');
		expect(exitCode).toBe(1);
		expect(output).toContain('ghost');
		expect(output).toContain('plugins[0]');
	});

	// The criterion: the same function `refrakt validate` calls, narrowed — not
	// a second implementation. Pinned by comparing the two commands' findings
	// for the same project; a divergent copy would show up here.
	it('reports exactly what `refrakt validate --only config` reports', () => {
		scaffold({
			sites: {
				main: {
					contentDir: './content',
					theme: '@refrakt-md/lumina',
					plugins: ['@refrakt-md/ghost'],
				},
			},
		});

		const viaConfig = run(tempDir, 'config', 'validate', '--format', 'json');
		const viaValidate = run(tempDir, 'validate', '--only', 'config', '--format', 'json');

		expect(JSON.parse(viaConfig.output).sites[0].config).toEqual(
			JSON.parse(viaValidate.output).sites[0].config,
		);
		expect(viaConfig.exitCode).toBe(viaValidate.exitCode);
	});

	it('runs only the config layer — never content', () => {
		scaffold({ sites: { main: { contentDir: './content', theme: '@refrakt-md/lumina' } } });
		writeFileSync(
			join(tempDir, 'content/index.md'),
			'# Hi\n\n{% notarealrune %}\nx\n{% /notarealrune %}\n',
		);

		const { output, exitCode } = run(tempDir, 'config', 'validate');
		expect(exitCode).toBe(0);
		expect(output).not.toContain('tag-undefined');
	});

	it('--site restricts to one', () => {
		scaffold({
			sites: {
				main: { contentDir: './content', theme: '@refrakt-md/lumina' },
				blog: { contentDir: './content', theme: '@refrakt-md/lumina' },
			},
		});

		const { output } = run(tempDir, 'config', 'validate', '--site', 'blog');
		expect(output).toContain('blog');
		expect(output).not.toMatch(/^main$/m);
	});

	it('never reports success on nothing', () => {
		const { output, exitCode } = run(tempDir, 'config', 'validate');
		expect(exitCode).toBe(1);
		expect(output).toContain('Nothing to validate');
	});

	it('is listed in the config usage', () => {
		const { output } = run(tempDir, 'config', '--help');
		expect(output).toContain('validate');
	});
});
