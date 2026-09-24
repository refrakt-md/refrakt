/**
 * `@refrakt-md/runes` must stay bundleable for the browser.
 *
 * The block editor's Vite build pulls this package into a browser bundle, and
 * `read-file.ts` has carried the constraint in a comment since SPEC-113 ("No
 * `node:fs` import — all I/O goes through the provider, which keeps the runes
 * package tree-shakable for browser bundles").
 *
 * A comment is not a check. A static `import { createHash } from 'node:crypto'`
 * in `review-marker.ts` broke the editor build outright, and nothing in this
 * repository's test suite noticed — only CI did, because only CI runs the
 * editor's `vite build`. This test is the cheap guard that was missing.
 *
 * **Dynamic imports are fine and deliberately allowed.** `plugins.ts` uses
 * `await import('node:fs')` behind a runtime branch; rollup externalizes those
 * rather than failing, and the browser never reaches the branch. It is the
 * *static* import that cannot be resolved.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../src');

function collect(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) collect(full, out);
		else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) out.push(full);
	}
	return out;
}

/** `import … from 'node:…'` or `require('node:…')` at module scope. */
const STATIC_NODE_IMPORT = /^\s*import\s[^;]*?from\s*['"]node:([a-z/]+)['"]/gm;

describe('browser safety', () => {
	it('has no static node: imports anywhere in src', () => {
		const offenders: string[] = [];

		for (const file of collect(SRC)) {
			const source = readFileSync(file, 'utf8');
			STATIC_NODE_IMPORT.lastIndex = 0;
			let m = STATIC_NODE_IMPORT.exec(source);
			while (m !== null) {
				offenders.push(`${relative(SRC, file)} → node:${m[1]}`);
				m = STATIC_NODE_IMPORT.exec(source);
			}
		}

		expect(
			offenders,
			"A static node: import breaks the editor's browser bundle. Use a dynamic " +
				'`await import()` behind a runtime branch, or find a platform-neutral ' +
				'implementation — see the digest in `lib/review-marker.ts`.',
		).toEqual([]);
	});

	it('still permits a dynamic import behind a runtime branch', () => {
		// Pins the distinction, so nobody "fixes" the guard by banning both.
		const plugins = readFileSync(join(SRC, 'plugins.ts'), 'utf8');
		expect(plugins).toContain("await import('node:fs')");
	});
});
