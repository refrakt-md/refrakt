import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadContent } from '../src/site.js';
import { validateContent } from '../src/validate-content.js';

/**
 * SPEC-170 / WORK-645 — the content loader and `refrakt validate` parse an
 * indented page as they parse the same page written flat. Before the shared
 * `parse`, the indented lines were an indented code block: the hint's closing
 * tag was code, so the tag never closed.
 */

const FLAT = `---
title: Flat
---

{% hint type="note" %}
Some **hint** text.

- a list
{% /hint %}
`;

const INDENTED = FLAT.replace('title: Flat', 'title: Indented')
	.split('\n')
	.map((line, i, all) => {
		const open = all.indexOf('{% hint type="note" %}');
		const close = all.indexOf('{% /hint %}');
		return i > open && i < close && line !== '' ? `\t${line}` : line;
	})
	.join('\n');

const dirs: string[] = [];
afterAll(() => {
	for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

function site(): string {
	const dir = mkdtempSync(join(tmpdir(), 'rf-indented-'));
	dirs.push(dir);
	mkdirSync(join(dir, 'content'));
	writeFileSync(join(dir, 'content', 'flat.md'), FLAT);
	writeFileSync(join(dir, 'content', 'indented.md'), INDENTED);
	return join(dir, 'content');
}

describe('an indented page (SPEC-170)', () => {
	it('is indented, by tabs, inside its tag', () => {
		expect(INDENTED).toContain('\tSome **hint** text.');
	});

	it('renders the same as the flat page', async () => {
		const loaded = await loadContent(site(), '/');
		const body = (url: string) =>
			JSON.stringify(loaded.pages.find((p) => p.route.url === url)?.renderable);
		expect(body('/indented')).toBeDefined();
		expect(body('/indented')).toEqual(body('/flat'));
		expect(body('/indented')).not.toContain('"pre"');
	});

	it('validates with no findings, as the flat page does', async () => {
		const findings = await validateContent(site());
		expect(findings).toEqual([]);
	});
});
