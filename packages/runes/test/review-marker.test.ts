/**
 * WORK-591 — normalization and the two hash levels (SPEC-134).
 *
 * Normalization is the whole design: get it wrong and the feature is worse than
 * not having it, because a noisy marker trains people to ignore a real one.
 */

import { describe, expect, it } from 'vitest';
import {
	canCarryMarker,
	compareMarker,
	formatMarker,
	hashSlice,
	normalizeLoose,
	normalizeStrict,
	parseMarker,
} from '../src/lib/review-marker.js';
import { summarizeDiff } from '../src/lib/line-diff.js';

describe('normalization order', () => {
	it('applies reindent first, so nesting alone does not fire the marker', () => {
		// Moving a function into a class shifts every line two columns without
		// changing a character of content. This is normalization step 1 and the
		// reason WORK-589 kept `reindent` as its own entry point.
		const flat = 'function build() {\n\treturn 1;\n}';
		const nested = '\t\tfunction build() {\n\t\t\treturn 1;\n\t\t}';
		expect(hashSlice(flat).strict).toBe(hashSlice(nested).strict);
	});

	it('normalizes line endings', () => {
		expect(hashSlice('a\r\nb').strict).toBe(hashSlice('a\nb').strict);
	});

	it('strips per-line trailing whitespace', () => {
		expect(hashSlice('a   \nb\t\n').strict).toBe(hashSlice('a\nb').strict);
	});

	it('normalizes the trailing newline', () => {
		expect(hashSlice('a\nb\n\n\n').strict).toBe(hashSlice('a\nb').strict);
	});
});

describe('D2 — comments are included', () => {
	it('fires when only a doc comment changes', () => {
		// Excluding comments would make markers quieter, and SPEC-131's masker
		// could do it for free. It is still wrong: a doc comment is very often
		// the exact text the surrounding prose paraphrases. If `@param
		// timeout`'s description changes meaning and the marker stays green,
		// the feature has failed at the only job it has.
		const before = '/** Timeout in ms. */\nexport const timeout = 1;';
		const after = '/** Timeout in SECONDS. */\nexport const timeout = 1;';

		expect(hashSlice(before).strict).not.toBe(hashSlice(after).strict);
		const stored = hashSlice(before);
		expect(compareMarker(stored.strict, after, stored.loose).verdict).toBe('stale');
	});
});

describe('D3 — the two levels, so a reformat is not a review', () => {
	it('classifies a whitespace-only reformat as formatting-only', () => {
		const before = 'export interface A {\n\tx: string;\n\n\ty: number;\n}';
		const after = 'export interface A {\n    x:   string;\n    y: number;\n}';

		const stored = hashSlice(before);
		const result = compareMarker(stored.strict, after, stored.loose);

		expect(result.verdict).toBe('formatting-only');
		// The strict hash *did* change — that is what makes the loose match a
		// proof rather than an assumption.
		expect(stored.strict).not.toBe(result.current.strict);
	});

	it('holds a real content change for review even when whitespace also moved', () => {
		const before = 'export interface A {\n\tx: string;\n}';
		const after = 'export interface A {\n    x: string;\n    y: number;\n}';

		const stored = hashSlice(before);
		expect(compareMarker(stored.strict, after, stored.loose).verdict).toBe('stale');
	});

	it('reports an unchanged slice as current', () => {
		const content = 'export const a = 1;';
		const stored = hashSlice(content);
		expect(compareMarker(stored.strict, content, stored.loose).verdict).toBe('current');
	});

	it('degrades to stale when no loose hash was stored', () => {
		// D3 requires formatting-only to be *proven*. With only one stored
		// value it cannot be, so the safe direction is to ask for a review that
		// may turn out trivial rather than skip one that mattered.
		const before = 'export interface A {\n\tx: string;\n}';
		const after = 'export interface A {\n    x: string;\n}';
		expect(compareMarker(hashSlice(before).strict, after).verdict).toBe('stale');
	});

	it('loose normalization drops blank lines and collapses runs', () => {
		expect(normalizeLoose('a\n\n\nb   c')).toBe('a\nb c');
		expect(normalizeStrict('a\n\n\nb   c')).toBe('a\n\n\nb   c');
	});
});

describe('D4 — inline and truncated', () => {
	it('truncates to 8 hex characters per level', () => {
		const pair = hashSlice('export const a = 1;');
		expect(pair.strict).toMatch(/^[0-9a-f]{8}$/);
		expect(pair.loose).toMatch(/^[0-9a-f]{8}$/);
	});

	it('round-trips through the stored attribute form', () => {
		const pair = hashSlice('export const a = 1;');
		const parsed = parseMarker(formatMarker(pair));
		expect(parsed.strict).toBe(pair.strict);
		expect(parsed.loose).toBe(pair.loose);
	});

	it('parses a marker carrying only the strict half', () => {
		expect(parseMarker('a3f91c4e')).toEqual({ strict: 'a3f91c4e' });
	});
});

describe('D10 — a marker on something that cannot change', () => {
	it('refuses expand, which has no slice to hash', () => {
		expect(canCarryMarker({ hasPath: true, rune: 'expand' })).toBe(false);
		expect(canCarryMarker({ hasPath: true, rune: 'snippet' })).toBe(true);
		expect(canCarryMarker({ hasPath: true, rune: 'file-ref' })).toBe(true);
	});

	it('refuses an invocation with no path', () => {
		expect(canCarryMarker({ hasPath: false, rune: 'snippet' })).toBe(false);
	});
});

describe('summarizeDiff', () => {
	it('counts added and removed lines', () => {
		expect(summarizeDiff('a\nb', 'a\nb\nc')).toBe('+1 line');
		expect(summarizeDiff('a\nb\nc', 'a')).toBe('-2 lines');
	});

	it('reports both directions', () => {
		expect(summarizeDiff('a\nb', 'a\nc')).toBe('+1 line, -1 line');
	});

	it('reports no change', () => {
		expect(summarizeDiff('a\nb', 'a\nb')).toBe('no line changes');
	});
});
