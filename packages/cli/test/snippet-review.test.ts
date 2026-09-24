/**
 * WORK-592 — the review CLI (SPEC-134).
 *
 * The behaviours that matter here are about *attention*: what gets held for a
 * human, what is re-stamped silently, and what the author is shown when a
 * marker fires.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hashSlice, formatMarker } from '@refrakt-md/runes';
import { renderDiff, runSnippetReview } from '../src/commands/snippet-review.js';

let root: string;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'refrakt-review-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

function write(rel: string, content: string): void {
	mkdirSync(dirname(join(root, rel)), { recursive: true });
	writeFileSync(join(root, rel), content, 'utf8');
}

function read(rel: string): string {
	return readFileSync(join(root, rel), 'utf8');
}

function run(opts: Parameters<typeof runSnippetReview>[0] = {}) {
	return runSnippetReview({ repoRoot: root, contentDirs: ['content'], ...opts });
}

describe('stamping unmarked invocations', () => {
	beforeEach(() => {
		write('src/a.ts', 'export const timeout = 1;\n');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="timeout" /%}');
	});

	it('stamps in place', () => {
		const result = run();
		expect(result.stamped).toBe(1);
		expect(read('content/page.md')).toMatch(/reviewed="[0-9a-f]{8}:[0-9a-f]{8}"/);
	});

	it('produces a marker that immediately reads as current', () => {
		// The criterion: a snippet inserted through the tool whose target has
		// not changed must not immediately report stale. If the stamping path
		// and the checking path normalized differently, this would fail.
		run();
		const after = runSnippetReview({ repoRoot: root, contentDirs: ['content'], check: true });
		expect(after.findings).toEqual([]);
	});

	it('leaves an existing marker alone', () => {
		run();
		const stamped = read('content/page.md');
		run();
		expect(read('content/page.md')).toBe(stamped);
	});

	it('does not stamp during --check', () => {
		run({ check: true });
		expect(read('content/page.md')).not.toContain('reviewed');
	});

	it('skips a fenced invocation', () => {
		write(
			'content/fenced.md',
			['```markdoc', '{% snippet path="src/a.ts" symbol="timeout" /%}', '```'].join('\n'),
		);
		run();
		// Stamping an example would claim a review nobody performed.
		expect(read('content/fenced.md')).not.toContain('reviewed');
	});
});

describe('D10 — reviewed on something that cannot change is a no-op', () => {
	it('reports expand rather than stamping it', () => {
		write('src/doc.md', 'body');
		write('content/page.md', '{% expand path="src/doc.md" /%}');

		const result = run();
		expect(result.stamped).toBe(0);
		// `expand` is not in the tag pattern at all, so it is simply not
		// stamped. The no-op report exists for invocations that reach the
		// stamping path and cannot carry a marker.
		expect(read('content/page.md')).not.toContain('reviewed');
	});
});

describe('--check reports without writing, and has its own exit signal', () => {
	it('finds a stale marker', () => {
		write('src/a.ts', 'export const timeout = 1;\n');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="timeout" /%}');
		run();

		// The target changes meaning.
		write('src/a.ts', 'export const timeout = 5000;\n');

		const result = run({ check: true });
		expect(result.findings).toHaveLength(1);
		expect(result.findings[0].page).toBe('content/page.md');
		expect(result.findings[0].anchor).toBe('timeout');
		expect(result.findings[0].verdict).toBe('stale');
	});

	it('reports nothing when the target is unchanged', () => {
		write('src/a.ts', 'export const timeout = 1;\n');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="timeout" /%}');
		run();
		expect(run({ check: true }).findings).toEqual([]);
	});

	it('does not write during --check even when a marker is stale', () => {
		write('src/a.ts', 'export const timeout = 1;\n');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="timeout" /%}');
		run();
		const stamped = read('content/page.md');

		write('src/a.ts', 'export const timeout = 5000;\n');
		run({ check: true });
		expect(read('content/page.md')).toBe(stamped);
	});
});

describe('D3 — the formatting-only path is silent', () => {
	it('re-stamps a proven formatting-only change without a finding', () => {
		write('src/a.ts', 'export interface A {\n\tx: string;\n\n\ty: number;\n}\n');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="A" /%}');
		run();

		// A formatter run: whitespace moves, nothing means anything different.
		write('src/a.ts', 'export interface A {\n    x:   string;\n    y: number;\n}\n');

		const result = run({ update: true });
		expect(result.findings).toEqual([]);
		expect(result.restampedSilently).toBe(1);
		// And the new marker is current.
		expect(run({ check: true }).findings).toEqual([]);
	});

	it('holds a real change for review instead', () => {
		write('src/a.ts', 'export interface A {\n\tx: string;\n}\n');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="A" /%}');
		run();

		write('src/a.ts', 'export interface A {\n\tx: string;\n\ty: number;\n}\n');

		const result = run({ update: true });
		expect(result.findings).toHaveLength(1);
		expect(result.restampedSilently).toBe(0);
	});
});

describe('D5 — the tool shows content, never hashes', () => {
	it('recovers the reviewed slice from git and renders a diff', () => {
		// A hash cannot be turned back into content, so the "before" comes from
		// the commit that introduced the marker. Without this the tool could
		// only show a hex string changing, which is unreviewable.
		const g = (cmd: string) => execSync(cmd, { cwd: root, stdio: 'pipe' });
		g('git init -q');
		g('git config user.email t@example.com');
		g('git config user.name Test');
		g('git config commit.gpgsign false');

		write('src/a.ts', 'export interface A {\n\tx: string;\n}\n');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="A" /%}');
		run();
		g('git add -A && git commit -q -m "stamp the marker"');

		write('src/a.ts', 'export interface A {\n\tx: string;\n\ty: number;\n}\n');

		const result = run({ check: true });
		expect(result.findings).toHaveLength(1);
		const finding = result.findings[0];

		expect(finding.diff).toBeDefined();
		expect(finding.diff).toContain('+ \ty: number;');
		// A summary of what changed, not a hash.
		expect(finding.summary).toBe('+1 line');
		expect(finding.summary).not.toMatch(/[0-9a-f]{8}/);
	});

	it('degrades to a plain report when git cannot recover the old slice', () => {
		// No git repository — the finding must still be reported, just without
		// a diff. Silence would be the wrong failure.
		write('src/a.ts', 'export const timeout = 1;\n');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="timeout" /%}');
		run();
		write('src/a.ts', 'export const timeout = 5000;\n');

		const result = run({ check: true });
		expect(result.findings).toHaveLength(1);
		expect(result.findings[0].diff).toBeUndefined();
		expect(result.findings[0].summary).toBe('content changed');
	});
});

describe('D9 — the anchor refuses first', () => {
	it('stays silent when the anchor cannot resolve', () => {
		write('src/a.ts', 'export const timeout = 1;\n');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="timeout" /%}');
		run();

		// The symbol is renamed: SPEC-131 refuses and reports that. This layer
		// must not also report, or one failure produces two findings.
		write('src/a.ts', 'export const delay = 1;\n');

		expect(run({ check: true }).findings).toEqual([]);
	});
});

describe('renderDiff', () => {
	it('marks additions and removals', () => {
		const out = renderDiff('a\nb', 'a\nc');
		expect(out).toContain('  a');
		expect(out).toContain('- b');
		expect(out).toContain('+ c');
	});
});

describe('--update re-stamps what changed', () => {
	it('writes the new marker', () => {
		write('src/a.ts', 'export const timeout = 1;\n');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="timeout" /%}');
		run();

		write('src/a.ts', 'export const timeout = 5000;\n');
		run({ update: true });

		const expected = formatMarker(hashSlice('export const timeout = 5000;'));
		expect(read('content/page.md')).toContain(`reviewed="${expected}"`);
	});

	it('holds rather than writing under --interactive', () => {
		write('src/a.ts', 'export const timeout = 1;\n');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="timeout" /%}');
		run();
		const stamped = read('content/page.md');

		write('src/a.ts', 'export const timeout = 5000;\n');
		const result = run({ update: true, interactive: true });

		expect(result.findings).toHaveLength(1);
		// Each held diff is a per-slice decision, so nothing is written for it.
		expect(read('content/page.md')).toBe(stamped);
	});
});
