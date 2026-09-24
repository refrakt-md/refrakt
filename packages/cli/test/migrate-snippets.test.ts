/**
 * WORK-590 — the `lines=` → anchor codemod (SPEC-131 D7).
 *
 * The verification is what makes the diff trustworthy, so most of these tests
 * are about the codemod **refusing** rather than rewriting.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { inferAnchor, migrateSnippets } from '../src/commands/migrate-snippets.js';
import { BASE_LANGUAGES } from '@refrakt-md/runes';

let root: string;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'refrakt-codemod-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

function write(rel: string, content: string): void {
	mkdirSync(dirname(join(root, rel)), { recursive: true });
	writeFileSync(join(root, rel), content, 'utf8');
}

function run(fix = false) {
	return migrateSnippets({ repoRoot: root, contentDirs: ['content'], fix });
}

describe('inferAnchor', () => {
	it('prefers a named declaration', () => {
		const out = inferAnchor(
			'export interface SiteConfig {\n\tx: string;\n}',
			BASE_LANGUAGES.typescript,
		);
		expect(out?.attr).toBe('symbol="SiteConfig"');
	});

	it('skips a leading comment block to find the declaration', () => {
		const slice = '/** Docs. */\nexport interface A {\n}';
		expect(inferAnchor(slice, BASE_LANGUAGES.typescript)?.attr).toBe('symbol="A"');
	});

	it('falls back to a match regex when nothing is declared', () => {
		const out = inferAnchor('.rf-hint {\n\tcolor: red;\n}', BASE_LANGUAGES.css);
		expect(out?.attr).toContain('match=');
		expect(out?.attr).toContain('\\.rf-hint');
	});

	it('returns nothing for a slice that is only comments', () => {
		expect(inferAnchor('// one\n// two', BASE_LANGUAGES.typescript)).toBeUndefined();
	});

	it('returns nothing for a blank slice', () => {
		expect(inferAnchor('\n\n', BASE_LANGUAGES.typescript)).toBeUndefined();
	});
});

describe('the codemod rewrites only what it can verify', () => {
	it('rewrites when the anchored slice is byte-identical', () => {
		write(
			'src/config.ts',
			['const a = 1;', 'export interface SiteConfig {', '\tx: string;', '}'].join('\n'),
		);
		write('content/page.md', '{% snippet path="src/config.ts" lines="2-4" /%}');

		const result = run();
		expect(result.rewrites).toHaveLength(1);
		expect(result.rewrites[0].after).toContain('symbol="SiteConfig"');
		expect(result.rewrites[0].after).not.toContain('lines=');
		expect(result.refusals).toEqual([]);
	});

	it('refuses when the anchored slice differs', () => {
		// The line range is off by one from the declaration, so the anchor
		// resolves to a different region. Refusing is the whole point.
		write(
			'src/config.ts',
			['export interface A {', '\tx: string;', '}', 'const after = 1;'].join('\n'),
		);
		write('content/page.md', '{% snippet path="src/config.ts" lines="1-2" /%}');

		const result = run();
		expect(result.rewrites).toEqual([]);
		expect(result.refusals).toHaveLength(1);
		expect(result.refusals[0].reason).toContain('byte-identical');
	});

	it('refuses when no anchor can be inferred', () => {
		write('src/a.ts', ['// header', '// more header', 'export const x = 1;'].join('\n'));
		write('content/page.md', '{% snippet path="src/a.ts" lines="1-2" /%}');

		const result = run();
		expect(result.refusals[0].reason).toContain('no anchor could be inferred');
	});

	it('refuses when the target cannot be read', () => {
		write('content/page.md', '{% snippet path="src/missing.ts" lines="1-2" /%}');
		expect(run().refusals[0].reason).toContain('could not be read');
	});

	it('leaves an already-anchored invocation alone', () => {
		write('src/a.ts', 'export const x = 1;');
		write('content/page.md', '{% snippet path="src/a.ts" symbol="x" /%}');

		const result = run();
		expect(result.rewrites).toEqual([]);
		expect(result.refusals).toEqual([]);
	});
});

describe('the byte-identical check runs before reindent', () => {
	it('verifies a nested target that reindent would change', () => {
		// The ordering constraint, and the one that is easy to get backwards.
		// A nested declaration carries leading indentation; `reindent` strips
		// it. Compare after reindent and every nested target fails verification
		// for a difference the codemod itself introduced.
		write(
			'src/svc.ts',
			['export class Service {', '\texport interface Inner {', '\t\tx: string;', '\t}', '}'].join(
				'\n',
			),
		);
		write('content/page.md', '{% snippet path="src/svc.ts" lines="2-4" /%}');

		const result = run();
		expect(result.refusals).toEqual([]);
		expect(result.rewrites).toHaveLength(1);
		expect(result.rewrites[0].after).toContain('symbol="Inner"');
	});
});

describe('fenced invocations are examples, not targets', () => {
	it('skips them rather than refusing', () => {
		write('src/config.ts', ['export interface A {', '}'].join('\n'));
		write(
			'content/page.md',
			['```markdoc', '{% snippet path="src/config.ts" lines="1-2" /%}', '```'].join('\n'),
		);

		const result = run();
		expect(result.skippedFenced).toBe(1);
		expect(result.rewrites).toEqual([]);
		// A fenced invocation is not a resolvable target, so reporting it as an
		// unverifiable refusal would be noise. It is rewritten by hand.
		expect(result.refusals).toEqual([]);
	});
});

describe('--fix writes, the default does not', () => {
	beforeEach(() => {
		write(
			'src/config.ts',
			['const a = 1;', 'export interface SiteConfig {', '\tx: string;', '}'].join('\n'),
		);
		write('content/page.md', '{% snippet path="src/config.ts" lines="2-4" /%}');
	});

	it('is a dry run by default', () => {
		run(false);
		expect(readFileSync(join(root, 'content/page.md'), 'utf8')).toContain('lines="2-4"');
	});

	it('writes with fix', () => {
		run(true);
		const after = readFileSync(join(root, 'content/page.md'), 'utf8');
		expect(after).toContain('symbol="SiteConfig"');
		expect(after).not.toContain('lines="2-4"');
	});
});

describe('SPEC-134 D8 — never stamp review markers', () => {
	it('does not add a reviewed attribute to anything it migrates', () => {
		write(
			'src/config.ts',
			['const a = 1;', 'export interface SiteConfig {', '\tx: string;', '}'].join('\n'),
		);
		write('content/page.md', '{% snippet path="src/config.ts" lines="2-4" /%}');

		run(true);
		const after = readFileSync(join(root, 'content/page.md'), 'utf8');
		// A marker asserting that a human reviewed a region nobody looked at is
		// a false claim in precisely the shape SPEC-134 exists to prevent. The
		// assertion is stated negatively on purpose.
		expect(after).not.toContain('reviewed');
	});
});

describe('companion attributes', () => {
	it('preserves linenumbers and highlight on a rewritten invocation', () => {
		// The byte-identical check covers the slice only, not the highlight, so
		// companion attributes carry through untouched and are a human's call.
		write(
			'src/config.ts',
			['const a = 1;', 'export interface SiteConfig {', '\tx: string;', '}'].join('\n'),
		);
		write(
			'content/page.md',
			'{% snippet path="src/config.ts" lines="2-4" linenumbers=true highlight="3" /%}',
		);

		const result = run();
		expect(result.rewrites[0].after).toContain('linenumbers=true');
		expect(result.rewrites[0].after).toContain('highlight="3"');
	});
});

describe('the migration records which languages it reached', () => {
	it('counts rewrites per language, as the input to D15', () => {
		write('src/a.ts', ['const x = 0;', 'export interface A {', '}'].join('\n'));
		write('content/page.md', '{% snippet path="src/a.ts" lines="2-3" /%}');

		expect(run().languages).toEqual({ typescript: 1 });
	});
});
