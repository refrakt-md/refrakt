import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CORE_TOOLS } from '../src/tools/core.js';

/** WORK-657 — `refrakt.format` calls the CLI's own `runFormat`. */

const tool = CORE_TOOLS.find((t) => t.name === 'refrakt.format')!;
const NESTED = '{% card %}\n{% hint %}\nx\n{% /hint %}\n{% /card %}\n';

const dirs: string[] = [];
afterAll(() => {
	for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

function project(): string {
	const dir = mkdtempSync(join(tmpdir(), 'rf-mcp-format-'));
	dirs.push(dir);
	writeFileSync(join(dir, 'page.md'), NESTED);
	return dir;
}

describe('refrakt.format', () => {
	it('reports without writing when `check` is set', async () => {
		const cwd = project();
		const out = await tool.handler({ check: true }, { cwd });
		expect(out).toEqual({ check: true, files: 1, changed: ['page.md'], refused: [] });
		expect(readFileSync(join(cwd, 'page.md'), 'utf-8')).toBe(NESTED);
	});

	it('re-indents when it is not', async () => {
		const cwd = project();
		await tool.handler({ paths: ['page.md'] }, { cwd });
		expect(readFileSync(join(cwd, 'page.md'), 'utf-8')).toBe(
			'{% card %}\n\t{% hint %}\n\tx\n\t{% /hint %}\n{% /card %}\n',
		);
	});
});
