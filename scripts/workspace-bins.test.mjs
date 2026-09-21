import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

/**
 * Workspace bins have to actually be on PATH.
 *
 * npm skips creating a bin symlink when its target does not exist at install
 * time — and every workspace bin here points into `dist/`, which `npm ci` runs
 * before. The result was that **`npx refrakt` did not work from a fresh clone
 * at all**, while CLAUDE.md documented it throughout (`plan next`,
 * `plan update`, `inspect`, `contracts`…). It went unnoticed because the MCP
 * tools cover the same ground and do work.
 *
 * The fix is a root `postbuild` that relinks. These tests guard both halves:
 * that the script is still wired up, and that a built tree really does have the
 * bins.
 */
function pkg(rel) {
	return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf-8'));
}

describe('workspace bin linking', () => {
	it('root build relinks workspace bins afterwards', () => {
		const scripts = pkg('package.json').scripts;
		expect(scripts.postbuild).toBeDefined();
		expect(scripts.postbuild).toContain('rebuild');
	});

	// Every workspace bin whose target exists must be reachable. Scoped to
	// "target exists" so an unbuilt tree — or a package outside the build chain,
	// like language-server — does not fail the suite.
	const bins = [
		['packages/cli', 'refrakt'],
		['packages/create-refrakt', 'create-refrakt'],
		['packages/mcp', 'refrakt-mcp'],
	];

	for (const [dir, binName] of bins) {
		it(`${binName} is linked into node_modules/.bin when built`, () => {
			const manifest = pkg(`${dir}/package.json`);
			const target = manifest.bin?.[binName];
			expect(target, `${dir} should declare a "${binName}" bin`).toBeDefined();

			const targetPath = resolve(ROOT, dir, target);
			if (!existsSync(targetPath)) return; // unbuilt tree — nothing to link yet

			expect(
				existsSync(resolve(ROOT, 'node_modules/.bin', binName)),
				`${binName} is built but not on PATH — run \`npm rebuild --workspaces\``,
			).toBe(true);
		});
	}
});
