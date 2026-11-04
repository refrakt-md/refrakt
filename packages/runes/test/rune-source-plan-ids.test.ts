import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Rune source is shown to readers (the reference pages' Source drawer), so it
 * does not cite plan entities: a reader cannot follow `SPEC-070`. The one
 * exception is an ID given as an example of its own format.
 */
const ROOT = join(__dirname, '..', '..', '..');
const dirs = [
	join(ROOT, 'packages', 'runes', 'src', 'tags'),
	...readdirSync(join(ROOT, 'plugins')).flatMap((p) =>
		['src/tags', 'runes'].map((d) => join(ROOT, 'plugins', p, d)),
	),
].filter(existsSync);
const files = dirs.flatMap((d) =>
	readdirSync(d)
		.filter((f) => f.endsWith('.ts') || f.endsWith('.md'))
		.map((f) => join(d, f)),
);
const ID = /\b(?:SPEC|WORK|BUG|ADR)-\d+/g;
const EXAMPLE = /e\.g\.,? "(?:SPEC|WORK|BUG|ADR)-\d+"/g;

describe('rune source cites no plan entities', () => {
	it('finds the rune sources', () => {
		expect(files.length).toBeGreaterThan(90);
	});

	it.each(files.map((f) => [f.slice(ROOT.length + 1), f]))('%s', (_rel, file) => {
		const text = readFileSync(file, 'utf8').replace(EXAMPLE, '');
		expect(text.match(ID) ?? []).toEqual([]);
	});
});
