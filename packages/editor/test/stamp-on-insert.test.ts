/**
 * WORK-593 — stamp-on-insert (SPEC-134 phase 3).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatMarker, hashSlice } from '@refrakt-md/runes';
import { stampOnInsert } from '../src/stamp-on-insert.js';

let root: string;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'refrakt-stamp-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

function write(rel: string, content: string): void {
	mkdirSync(dirname(join(root, rel)), { recursive: true });
	writeFileSync(join(root, rel), content, 'utf8');
}

describe('stampOnInsert', () => {
	beforeEach(() => {
		write('src/a.ts', 'export const timeout = 1;\n');
	});

	it('stamps a snippet whose slice resolves', () => {
		const out = stampOnInsert('{% snippet path="src/a.ts" symbol="timeout" /%}', root);
		expect(out).toMatch(/reviewed="[0-9a-f]{12}:[0-9a-f]{12}"/);
	});

	it('stamps a file-ref', () => {
		const out = stampOnInsert('{% file-ref path="src/a.ts" symbol="timeout" /%}', root);
		expect(out).toContain('reviewed=');
	});

	it('does not stamp expand', () => {
		// `expand` embeds a whole document rather than a region, so there is
		// nothing of the right shape to hash — WORK-591's rule, and the reason
		// the editor must not stamp it.
		write('src/doc.md', 'body\n');
		const source = '{% expand path="src/doc.md" /%}';
		expect(stampOnInsert(source, root)).toBe(source);
	});

	it('uses the same marker the review CLI would write', () => {
		// The normalization must not have two implementations, or `--check`
		// would fire on everything the editor touched.
		const out = stampOnInsert('{% snippet path="src/a.ts" symbol="timeout" /%}', root);
		const expected = formatMarker(hashSlice('export const timeout = 1;'));
		expect(out).toContain(`reviewed="${expected}"`);
	});

	it('leaves an existing marker alone', () => {
		// Re-stamping on save would silently clear a marker that was asking for
		// a review — the one thing this feature cannot do.
		const source = '{% snippet path="src/a.ts" symbol="timeout" reviewed="deadbeef:cafebabe" /%}';
		expect(stampOnInsert(source, root)).toBe(source);
	});

	it('leaves an invocation whose slice cannot resolve', () => {
		const source = '{% snippet path="src/a.ts" symbol="nonexistent" /%}';
		expect(stampOnInsert(source, root)).toBe(source);
	});

	it('leaves an invocation with no path', () => {
		const source = '{% snippet /%}';
		expect(stampOnInsert(source, root)).toBe(source);
	});

	it('skips a fenced invocation', () => {
		const source = ['```markdoc', '{% snippet path="src/a.ts" symbol="timeout" /%}', '```'].join(
			'\n',
		);
		expect(stampOnInsert(source, root)).toBe(source);
	});

	it('preserves the rest of the page exactly', () => {
		const source = [
			'# Title',
			'',
			'Prose about the timeout.',
			'',
			'{% snippet path="src/a.ts" symbol="timeout" /%}',
			'',
			'More prose.',
		].join('\n');

		const out = stampOnInsert(source, root);
		const lines = out.split('\n');
		expect(lines).toHaveLength(7);
		expect(lines[0]).toBe('# Title');
		expect(lines[6]).toBe('More prose.');
		expect(lines[4]).toContain('reviewed=');
		expect(lines[4]).toContain('path="src/a.ts"');
		expect(lines[4]).toContain('symbol="timeout"');
	});

	it('produces a marker that reads as current immediately', () => {
		const out = stampOnInsert('{% snippet path="src/a.ts" symbol="timeout" /%}', root);
		const marker = /reviewed="([^"]+)"/.exec(out)?.[1];
		expect(marker).toBe(formatMarker(hashSlice('export const timeout = 1;')));
	});
});
