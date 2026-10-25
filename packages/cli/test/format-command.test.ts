import { describe, it, expect, vi, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { formatCommand, runFormat } from '../src/commands/format.js';

/** WORK-657 — `refrakt format` and `refrakt format --check`. */

const NESTED = '{% card %}\n{% hint %}\nx\n{% /hint %}\n{% /card %}\n';
const FORMATTED = '{% card %}\n\t{% hint %}\n\tx\n\t{% /hint %}\n{% /card %}\n';

const dirs: string[] = [];
afterAll(() => {
	for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
	const dir = mkdtempSync(join(tmpdir(), 'rf-format-'));
	dirs.push(dir);
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(join(dir, path, '..'), { recursive: true });
		writeFileSync(join(dir, path), text);
	}
	return dir;
}

const quiet = () => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
};

describe('`refrakt format`', () => {
	it('re-indents the .md files under a directory, skipping dependencies and output', () => {
		const cwd = project({
			'content/nested.md': NESTED,
			'content/flat.md': '# Title\n\nProse.\n',
			'content/node_modules/pkg/readme.md': NESTED,
			'content/notes.txt': NESTED,
		});
		const report = runFormat({ paths: ['content'], cwd });
		expect(report.files).toBe(2);
		expect(report.changed).toEqual(['content/nested.md']);
		expect(readFileSync(join(cwd, 'content/nested.md'), 'utf-8')).toBe(FORMATTED);
		expect(readFileSync(join(cwd, 'content/node_modules/pkg/readme.md'), 'utf-8')).toBe(NESTED);
	});

	it('`--check` writes nothing, names each file that would change, and exits 1', () => {
		quiet();
		const cwd = project({ 'a.md': NESTED, 'b.md': FORMATTED });
		const log = console.log as unknown as ReturnType<typeof vi.fn>;
		expect(formatCommand({ paths: ['.'], check: true, cwd })).toBe(1);
		expect(log.mock.calls.flat().join('\n')).toContain('would re-indent a.md');
		expect(readFileSync(join(cwd, 'a.md'), 'utf-8')).toBe(NESTED);
		vi.restoreAllMocks();
	});

	it('`--check` exits 0 when every file follows the rule', () => {
		quiet();
		const cwd = project({ 'b.md': FORMATTED });
		expect(formatCommand({ paths: ['.'], check: true, cwd })).toBe(0);
		vi.restoreAllMocks();
	});

	it('reports JSON with `--format json`', () => {
		quiet();
		const cwd = project({ 'a.md': NESTED });
		formatCommand({ paths: ['.'], check: true, format: 'json', cwd });
		const out = JSON.parse(
			(console.log as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string,
		);
		expect(out).toEqual({ check: true, files: 1, changed: ['a.md'], refused: [] });
		vi.restoreAllMocks();
	});
});
