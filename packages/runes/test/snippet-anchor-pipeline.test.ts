/**
 * End-to-end anchoring through the real snippet pipeline (WORK-587/588/589).
 *
 * The resolver has its own unit tests. This file exists to prove the capability
 * actually reaches an author writing `{% snippet symbol="…" %}` — the
 * attributes are declared, resolved through the shared reader, presented in the
 * right order, and a refusal becomes the existing error fence rather than a new
 * failure channel (D6).
 */

import 'reflect-metadata';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fsProjectFiles } from '@refrakt-md/types/project-files';
import type { PreprocessContext } from '@refrakt-md/types';
import { nodes, tags } from '../src/index.js';
import { preprocessSnippets } from '../src/snippet-pipeline.js';

const { Tag } = Markdoc;

let root: string;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'refrakt-anchor-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

function write(rel: string, content: string): void {
	writeFileSync(join(root, rel), content, 'utf8');
}

function run(source: string): {
	fence: InstanceType<typeof Tag> | undefined;
	diagnostics: Array<{ severity: string; message: string }>;
} {
	const diagnostics: Array<{ severity: string; message: string }> = [];
	const ctx: PreprocessContext = {
		info: (m) => diagnostics.push({ severity: 'info', message: m }),
		warn: (m) => diagnostics.push({ severity: 'warning', message: m }),
		error: (m) => diagnostics.push({ severity: 'error', message: m }),
		projectRoot: root,
		sandbox: fsProjectFiles(root),
	} as PreprocessContext;

	const ast = Markdoc.parse(source);
	const next = preprocessSnippets(
		ast,
		{ url: '/page', relativePath: 'page.md', filePath: join(root, 'page.md') },
		ctx,
	);
	const renderable = Markdoc.transform(next ?? ast, { tags, nodes });

	let fence: InstanceType<typeof Tag> | undefined;
	const walk = (n: unknown): void => {
		if (Array.isArray(n)) {
			for (const c of n) walk(c);
			return;
		}
		if (!Tag.isTag(n as never)) return;
		const t = n as InstanceType<typeof Tag>;
		if (t.name === 'pre' || t.name === 'code') fence ??= t;
		for (const c of t.children ?? []) walk(c);
	};
	walk(renderable);

	return { fence, diagnostics };
}

/** The rendered code text, wherever the fence transform put it. */
function text(node: unknown): string {
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(text).join('');
	if (Tag.isTag(node as never)) return text((node as InstanceType<typeof Tag>).children);
	return '';
}

describe('snippet symbol= end to end', () => {
	it('resolves a declaration and renders it', () => {
		write(
			'config.ts',
			[
				'const before = 1;',
				'',
				'/** The site configuration. */',
				'export interface SiteConfig {',
				'\tbaseUrl: string;',
				'}',
				'',
				'const after = 2;',
			].join('\n'),
		);

		const { fence, diagnostics } = run('{% snippet path="config.ts" symbol="SiteConfig" /%}');

		const rendered = text(fence);
		expect(rendered).toContain('export interface SiteConfig {');
		expect(rendered).toContain('baseUrl: string;');
		// `doc` defaults on for `symbol`.
		expect(rendered).toContain('The site configuration.');
		expect(rendered).not.toContain('const before');
		expect(rendered).not.toContain('const after');
		expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	});

	it('reports file coordinates so linenumbers stay meaningful (D13)', () => {
		write('config.ts', ['a;', 'b;', 'export const target = 1;', 'd;'].join('\n'));

		const { fence } = run(
			'{% snippet path="config.ts" symbol="target" linenumbers=true doc=false /%}',
		);
		// Line 3 of the file, not line 1 of the slice.
		expect(fence?.attributes?.['data-lines'] ?? fence?.attributes?.lines).toBe('3-3');
	});

	it('reindents a nested target by default', () => {
		write(
			'svc.ts',
			['export class Service {', '\tstart() {', '\t\treturn 1;', '\t}', '}'].join('\n'),
		);

		const { fence } = run('{% snippet path="svc.ts" match="^\\\\s*start\\\\(\\\\)" /%}');
		const rendered = text(fence);
		// The method renders flush left rather than with a ragged edge.
		expect(rendered).toContain('start() {');
		expect(rendered.split('\n')[0].startsWith('\t')).toBe(false);
	});

	it('does not reindent a line-addressed slice', () => {
		write(
			'svc.ts',
			['export class Service {', '\tstart() {', '\t\treturn 1;', '\t}', '}'].join('\n'),
		);

		const { fence } = run('{% snippet path="svc.ts" lines="2-4" /%}');
		// Every one of the existing line-addressed invocations must render
		// exactly as before (D16).
		expect(text(fence).split('\n')[0].startsWith('\t')).toBe(true);
	});
});

describe('a refusal uses the existing error fence, not a new channel (D6)', () => {
	it('renders an error fence and emits a ctx.error', () => {
		write('config.ts', 'export const a = 1;\n');

		const { fence, diagnostics } = run('{% snippet path="config.ts" symbol="Missing" /%}');

		const rendered = text(fence);
		expect(rendered).toContain('snippet error');
		expect(rendered).toContain('symbol "Missing"');
		// The fallback is named, so the author is not left at a dead end (D4).
		expect(rendered).toContain('lines=');

		const errors = diagnostics.filter((d) => d.severity === 'error');
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toContain('Missing');
	});

	it('refuses lines= and an anchor together', () => {
		write('config.ts', 'export const a = 1;\n');
		const { diagnostics } = run('{% snippet path="config.ts" symbol="a" lines="1-1" /%}');
		expect(diagnostics.some((d) => /mutually exclusive/.test(d.message))).toBe(true);
	});

	it('surfaces the ambiguity warning as a warning, not an error', () => {
		// Two real declarations matching one anchor. Note this must NOT be a
		// comment: the comment mask correctly rejects a commented anchor, which
		// would make this a refusal rather than an ambiguity.
		write('amb.ts', ['export const a = 1;', 'export const b = 2;'].join('\n'));

		const { diagnostics } = run('{% snippet path="amb.ts" match="^export const" /%}');
		const warnings = diagnostics.filter((d) => d.severity === 'warning');
		expect(warnings.some((w) => /ambiguous/.test(w.message))).toBe(true);
		// Still renders — taking the first match is the right behaviour; taking
		// it *silently* is what D14 objects to.
		expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	});

	it('a commented-out anchor refuses rather than resolving', () => {
		write('cmt.ts', ['// export const target = 1;', 'export const other = 2;'].join('\n'));
		const { diagnostics } = run('{% snippet path="cmt.ts" symbol="target" /%}');
		expect(
			diagnostics.some((d) => d.severity === 'error' && /no line matches/.test(d.message)),
		).toBe(true);
	});
});

describe('highlight-match (D13)', () => {
	it('emits file-frame highlight offsets for matching lines', () => {
		write(
			'config.ts',
			['a;', 'export interface A {', '\ttarget: string;', '\tother: number;', '}'].join('\n'),
		);

		const { fence } = run(
			'{% snippet path="config.ts" symbol="A" highlight-match="target" doc=false /%}',
		);
		// The slice starts at file line 2; `target` is its second line, so file
		// line 3.
		const hl = fence?.attributes?.['data-highlight-lines'] ?? fence?.attributes?.highlight;
		expect(String(hl)).toBe('3');
	});
});

describe('extent strategies reach the author', () => {
	it('dedent extracts a Python block', () => {
		write(
			'client.py',
			['class HttpClient:', '    def get(self):', '        return 1', '', 'other = 1'].join('\n'),
		);

		const { fence } = run('{% snippet path="client.py" symbol="HttpClient" extent="dedent" /%}');
		const rendered = text(fence);
		expect(rendered).toContain('def get(self)');
		expect(rendered).not.toContain('other = 1');
	});

	it('auto refuses on Python and names dedent', () => {
		write('client.py', ['class HttpClient:', '    def get(self):', '        return 1'].join('\n'));

		const { fence } = run('{% snippet path="client.py" symbol="HttpClient" /%}');
		const rendered = text(fence);
		expect(rendered).toContain('snippet error');
		expect(rendered).toContain('extent="dedent"');
	});

	it('section extracts a Markdown section', () => {
		write(
			'readme.md',
			['## Install', '', 'Do the thing.', '', '## Usage', '', 'Other.'].join('\n'),
		);

		const { fence } = run('{% snippet path="readme.md" match="^## Install" extent="section" /%}');
		const rendered = text(fence);
		expect(rendered).toContain('Do the thing.');
		expect(rendered).not.toContain('## Usage');
	});

	it('paired extracts a nested rune block', () => {
		write(
			'tabs.md',
			['{% tabs %}', '{% tab %}', 'one', '{% /tab %}', '{% /tabs %}', 'after'].join('\n'),
		);

		const { fence } = run('{% snippet path="tabs.md" match="^\\\\{% tabs" extent="paired" /%}');
		const rendered = text(fence);
		expect(rendered).toContain('{% /tabs %}');
		expect(rendered).not.toContain('after');
	});
});
