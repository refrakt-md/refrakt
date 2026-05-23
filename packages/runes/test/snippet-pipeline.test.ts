import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { tags, nodes, createCorePipelineHooks } from '../src/index.js';
import { preprocessSnippets, wrapStandaloneSnippets } from '../src/snippet-pipeline.js';
import type { PreprocessContext, TransformedPage, AggregatedData, PipelineContext } from '@refrakt-md/types';

/** Build a preprocess context that captures diagnostics into a list. */
function makePreprocessCtx(projectRoot: string): {
	ctx: PreprocessContext;
	warnings: Array<{ severity: string; message: string }>;
} {
	const warnings: Array<{ severity: string; message: string }> = [];
	return {
		ctx: {
			info: (m) => warnings.push({ severity: 'info', message: m }),
			warn: (m) => warnings.push({ severity: 'warning', message: m }),
			error: (m) => warnings.push({ severity: 'error', message: m }),
			projectRoot,
		},
		warnings,
	};
}

function makePage(filePath: string, relativePath = 'page.md', url = '/page'): {
	url: string;
	relativePath: string;
	filePath: string;
} {
	return { url, relativePath, filePath };
}

/** Convenience: parse, preprocess, transform. */
function pipeline(source: string, opts: { projectRoot: string; pageFilePath?: string }) {
	const ast = Markdoc.parse(source);
	const { ctx, warnings } = makePreprocessCtx(opts.projectRoot);
	const next = preprocessSnippets(ast, makePage(opts.pageFilePath ?? '/tmp/page.md'), ctx);
	const finalAst = next ?? ast;
	const renderable = Markdoc.transform(finalAst, { tags, nodes });
	return { renderable, warnings };
}

/** Find the first descendant Tag matching the predicate. */
function findTag(node: unknown, pred: (t: InstanceType<typeof Tag>) => boolean): InstanceType<typeof Tag> | undefined {
	if (Array.isArray(node)) {
		for (const c of node) {
			const found = findTag(c, pred);
			if (found) return found;
		}
		return undefined;
	}
	if (!Tag.isTag(node as never)) return undefined;
	const tag = node as InstanceType<typeof Tag>;
	if (pred(tag)) return tag;
	for (const c of tag.children ?? []) {
		const found = findTag(c, pred);
		if (found) return found;
	}
	return undefined;
}

function findAllTags(node: unknown, pred: (t: InstanceType<typeof Tag>) => boolean): InstanceType<typeof Tag>[] {
	const out: InstanceType<typeof Tag>[] = [];
	const walk = (n: unknown) => {
		if (Array.isArray(n)) { for (const c of n) walk(c); return; }
		if (!Tag.isTag(n as never)) return;
		const tag = n as InstanceType<typeof Tag>;
		if (pred(tag)) out.push(tag);
		for (const c of tag.children ?? []) walk(c);
	};
	walk(node);
	return out;
}

describe('snippet preprocess (SPEC-062)', () => {
	let tmpRoot: string;

	beforeEach(() => {
		tmpRoot = mkdtempSync(join(tmpdir(), 'refrakt-snippet-'));
	});

	afterEach(() => {
		rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('replaces {% snippet %} tag with a fence node carrying file content + language', () => {
		writeFileSync(join(tmpRoot, 'foo.ts'), 'const x = 1;\nconst y = 2;\n');
		const ast = Markdoc.parse('{% snippet path="foo.ts" /%}\n');
		const { ctx } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);

		// First child of the document should now be a fence (not a tag).
		expect(ast.children[0].type).toBe('fence');
		expect(ast.children[0].attributes.content).toBe('const x = 1;\nconst y = 2;\n');
		expect(ast.children[0].attributes.language).toBe('typescript');
		expect(ast.children[0].attributes['data-snippet-source']).toBe('foo.ts');
	});

	it('respects the `lang=` attribute over inferred language', () => {
		writeFileSync(join(tmpRoot, 'config.unknown'), 'foo = bar\n');
		const ast = Markdoc.parse('{% snippet path="config.unknown" lang="toml" /%}\n');
		const { ctx } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);

		expect(ast.children[0].attributes.language).toBe('toml');
	});

	it('attaches title + lines markers when set', () => {
		writeFileSync(join(tmpRoot, 'big.ts'), Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n'));
		const ast = Markdoc.parse('{% snippet path="big.ts" lines="5-10" title="snippet of big.ts" /%}\n');
		const { ctx } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);

		expect(ast.children[0].attributes['data-snippet-title']).toBe('snippet of big.ts');
		expect(ast.children[0].attributes['data-snippet-lines']).toBe('5-10');
		// 5-10 inclusive = lines 5 through 10 = 6 lines.
		expect(ast.children[0].attributes.content).toBe('line 5\nline 6\nline 7\nline 8\nline 9\nline 10');
	});

	it('rejects absolute paths with a build error (no replacement)', () => {
		const ast = Markdoc.parse('{% snippet path="/etc/passwd" /%}\n');
		const { ctx, warnings } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);

		// Tag is NOT replaced — preprocess emits an error and leaves the tag alone.
		expect(ast.children[0].type).toBe('tag');
		expect(warnings.some(w => w.severity === 'error' && /absolute/.test(w.message))).toBe(true);
	});

	it('rejects traversal escapes with a build error', () => {
		const ast = Markdoc.parse('{% snippet path="../../etc/passwd" /%}\n');
		const { ctx, warnings } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);
		expect(warnings.some(w => w.severity === 'error' && /escapes the project root/.test(w.message))).toBe(true);
	});

	it('rejects missing files with a build error', () => {
		const ast = Markdoc.parse('{% snippet path="ghost.ts" /%}\n');
		const { ctx, warnings } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);
		expect(warnings.some(w => w.severity === 'error' && /file not found/.test(w.message))).toBe(true);
	});

	it('rejects directory paths with a build error', () => {
		mkdirSync(join(tmpRoot, 'subdir'));
		const ast = Markdoc.parse('{% snippet path="subdir" /%}\n');
		const { ctx, warnings } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);
		expect(warnings.some(w => w.severity === 'error' && /must be a file/.test(w.message))).toBe(true);
	});

	it('rejects symlinks pointing outside the project root', () => {
		const outside = mkdtempSync(join(tmpdir(), 'refrakt-snippet-outside-'));
		writeFileSync(join(outside, 'real.ts'), 'const x = 1;\n');
		symlinkSync(join(outside, 'real.ts'), join(tmpRoot, 'leak.ts'));
		const ast = Markdoc.parse('{% snippet path="leak.ts" /%}\n');
		const { ctx, warnings } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);
		expect(warnings.some(w => w.severity === 'error' && /symlink/.test(w.message))).toBe(true);
		rmSync(outside, { recursive: true, force: true });
	});

	it('emits a warning and clamps when lines end exceeds file length', () => {
		writeFileSync(join(tmpRoot, 'short.ts'), 'a\nb\nc\n'); // 4 lines total (trailing newline = empty 4th)
		const ast = Markdoc.parse('{% snippet path="short.ts" lines="2-20" /%}\n');
		const { ctx, warnings } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);
		expect(warnings.some(w => w.severity === 'warning' && /clamped/.test(w.message))).toBe(true);
		// Content includes lines 2..end of file.
		expect(ast.children[0].attributes.content).toContain('b');
	});

	it('rejects out-of-range start (past EOF) with a build error', () => {
		writeFileSync(join(tmpRoot, 'tiny.ts'), 'just one line\n');
		const ast = Markdoc.parse('{% snippet path="tiny.ts" lines="50-60" /%}\n');
		const { ctx, warnings } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);
		expect(warnings.some(w => w.severity === 'error' && /past end of file/.test(w.message))).toBe(true);
	});

	it('rejects inverted line range with a build error', () => {
		writeFileSync(join(tmpRoot, 'foo.ts'), Array.from({ length: 30 }, () => 'x').join('\n'));
		const ast = Markdoc.parse('{% snippet path="foo.ts" lines="25-10" /%}\n');
		const { ctx, warnings } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);
		expect(warnings.some(w => w.severity === 'error' && /inverted/.test(w.message))).toBe(true);
	});

	it('rejects malformed line-range strings with the input echoed', () => {
		writeFileSync(join(tmpRoot, 'foo.ts'), 'x\n');
		const ast = Markdoc.parse('{% snippet path="foo.ts" lines="not-a-range" /%}\n');
		const { ctx, warnings } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);
		expect(warnings.some(w => w.severity === 'error' && /malformed/.test(w.message) && /not-a-range/.test(w.message))).toBe(true);
	});

	it('supports line shorthand "N" for single-line', () => {
		writeFileSync(join(tmpRoot, 'foo.ts'), 'a\nb\nc\nd\n');
		const ast = Markdoc.parse('{% snippet path="foo.ts" lines="3" /%}\n');
		const { ctx } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);
		expect(ast.children[0].attributes.content).toBe('c');
	});

	it("supports open ranges 'N-' and '-M'", () => {
		writeFileSync(join(tmpRoot, 'foo.ts'), 'a\nb\nc\nd\n');
		// "2-" → from 2 to end
		const ast1 = Markdoc.parse('{% snippet path="foo.ts" lines="2-" /%}\n');
		const { ctx: ctx1 } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast1, makePage('/tmp/page.md'), ctx1);
		expect(ast1.children[0].attributes.content).toBe('b\nc\nd\n');
		// "-2" → from start to 2
		const ast2 = Markdoc.parse('{% snippet path="foo.ts" lines="-2" /%}\n');
		const { ctx: ctx2 } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast2, makePage('/tmp/page.md'), ctx2);
		expect(ast2.children[0].attributes.content).toBe('a\nb');
	});

	it('descends into nested AST to find snippet tags (e.g., inside codegroup)', () => {
		writeFileSync(join(tmpRoot, 'a.ts'), 'a = 1\n');
		writeFileSync(join(tmpRoot, 'b.py'), 'b = 1\n');
		const ast = Markdoc.parse('{% codegroup %}\n{% snippet path="a.ts" /%}\n{% snippet path="b.py" /%}\n{% /codegroup %}\n');
		const { ctx } = makePreprocessCtx(tmpRoot);
		preprocessSnippets(ast, makePage('/tmp/page.md'), ctx);

		// The codegroup tag should now have fence children, not snippet tags.
		const codegroup = ast.children[0];
		expect(codegroup.type).toBe('tag');
		expect(codegroup.tag).toBe('codegroup');
		const fences = codegroup.children.filter((c: any) => c.type === 'fence');
		expect(fences).toHaveLength(2);
	});
});

describe('snippet composition (SPEC-062)', () => {
	let tmpRoot: string;

	beforeEach(() => {
		tmpRoot = mkdtempSync(join(tmpdir(), 'refrakt-snippet-comp-'));
	});

	afterEach(() => {
		rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('inside codegroup: each snippet becomes a tab; no figure wrapper', () => {
		writeFileSync(join(tmpRoot, 'a.ts'), 'const x = 1;\n');
		writeFileSync(join(tmpRoot, 'b.py'), 'x = 1\n');
		const { renderable } = pipeline(
			'{% codegroup %}\n{% snippet path="a.ts" /%}\n{% snippet path="b.py" /%}\n{% /codegroup %}\n',
			{ projectRoot: tmpRoot },
		);

		// codegroup tab list should contain two tabs.
		const tabs = findAllTags(renderable, (t) => t.name === 'button' && (t.attributes as any)?.role === 'tab');
		expect(tabs).toHaveLength(2);
		// Snippet content rendered into pre elements (via fence transform).
		const pres = findAllTags(renderable, (t) => t.name === 'pre');
		expect(pres.length).toBeGreaterThanOrEqual(2);
		// No standalone snippet figure was applied — the fence-consuming
		// container suppresses the wrap step.
		const figure = findTag(renderable, (t) => t.name === 'figure' && (t.attributes as any)?.class === 'rf-snippet');
		expect(figure).toBeUndefined();
	});

	it('inside diff: two snippets feed before/after; no figure wrapper', () => {
		writeFileSync(join(tmpRoot, 'before.ts'), 'a\nb\nc\n');
		writeFileSync(join(tmpRoot, 'after.ts'), 'a\nB\nc\n');
		const { renderable } = pipeline(
			'{% diff %}\n{% snippet path="before.ts" /%}\n{% snippet path="after.ts" /%}\n{% /diff %}\n',
			{ projectRoot: tmpRoot },
		);
		// Diff produces line spans with `data-type` attributes (equal / add / remove).
		const diffLines = findAllTags(renderable, (t) => (t.attributes as any)?.['data-name'] === 'line');
		expect(diffLines.length).toBeGreaterThan(0);
		const hasAddOrRemove = diffLines.some(
			(t) => (t.attributes as any)?.['data-type'] === 'add' || (t.attributes as any)?.['data-type'] === 'remove',
		);
		expect(hasAddOrRemove).toBe(true);
		// No snippet figure wrapper.
		const figure = findTag(renderable, (t) => t.name === 'figure' && (t.attributes as any)?.class === 'rf-snippet');
		expect(figure).toBeUndefined();
	});

	it('mixed children — snippet + triple-backtick fence in codegroup — work uniformly', () => {
		writeFileSync(join(tmpRoot, 'a.ts'), 'const x = 1;\n');
		const { renderable } = pipeline(
			'{% codegroup %}\n{% snippet path="a.ts" /%}\n```python\nx = 1\n```\n{% /codegroup %}\n',
			{ projectRoot: tmpRoot },
		);
		const tabs = findAllTags(renderable, (t) => t.name === 'button' && (t.attributes as any)?.role === 'tab');
		expect(tabs).toHaveLength(2);
	});
});

describe('snippet standalone wrap (SPEC-062)', () => {
	let tmpRoot: string;

	beforeEach(() => {
		tmpRoot = mkdtempSync(join(tmpdir(), 'refrakt-snippet-wrap-'));
	});

	afterEach(() => {
		rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('wraps a standalone snippet-derived <pre> in <figure class="rf-snippet">', () => {
		writeFileSync(join(tmpRoot, 'foo.ts'), 'const x = 1;\n');
		const { renderable } = pipeline('{% snippet path="foo.ts" title="example" /%}\n', { projectRoot: tmpRoot });

		const ctx: PipelineContext = { info: () => {}, warn: () => {}, error: () => {} };
		const page: TransformedPage = {
			url: '/page',
			title: '',
			headings: [],
			frontmatter: {},
			renderable,
		};
		const wrapped = wrapStandaloneSnippets(page, {} as AggregatedData, ctx);

		const figure = findTag(wrapped.renderable, (t) => t.name === 'figure' && (t.attributes as any)?.class === 'rf-snippet');
		expect(figure).toBeDefined();
		expect((figure!.attributes as any)['data-rune']).toBe('snippet');
		expect((figure!.attributes as any)['data-source-path']).toBe('foo.ts');

		// Figcaption from title=.
		const caption = findTag(figure!, (t) => t.name === 'figcaption');
		expect(caption).toBeDefined();
		expect(caption!.children).toContain('example');
	});

	it("doesn't wrap a snippet-derived <pre> inside a codegroup output", () => {
		writeFileSync(join(tmpRoot, 'a.ts'), 'const x = 1;\n');
		writeFileSync(join(tmpRoot, 'b.py'), 'x = 1\n');
		const { renderable } = pipeline(
			'{% codegroup %}\n{% snippet path="a.ts" /%}\n{% snippet path="b.py" /%}\n{% /codegroup %}\n',
			{ projectRoot: tmpRoot },
		);
		const ctx: PipelineContext = { info: () => {}, warn: () => {}, error: () => {} };
		const page: TransformedPage = {
			url: '/page',
			title: '',
			headings: [],
			frontmatter: {},
			renderable,
		};
		const wrapped = wrapStandaloneSnippets(page, {} as AggregatedData, ctx);

		// No figures applied — codegroup is on the allowlist.
		const figures = findAllTags(wrapped.renderable, (t) => t.name === 'figure' && (t.attributes as any)?.class === 'rf-snippet');
		expect(figures).toHaveLength(0);
	});

	it('is a no-op when there are no snippet-derived pres', () => {
		const { renderable } = pipeline('# Hello\n\nA paragraph.\n', { projectRoot: tmpRoot });
		const ctx: PipelineContext = { info: () => {}, warn: () => {}, error: () => {} };
		const page: TransformedPage = {
			url: '/page',
			title: '',
			headings: [],
			frontmatter: {},
			renderable,
		};
		const wrapped = wrapStandaloneSnippets(page, {} as AggregatedData, ctx);
		// Returns the same reference when nothing changed.
		expect(wrapped.renderable).toBe(renderable);
	});
});

describe('snippet via createCorePipelineHooks', () => {
	let tmpRoot: string;

	beforeEach(() => {
		tmpRoot = mkdtempSync(join(tmpdir(), 'refrakt-snippet-core-'));
	});

	afterEach(() => {
		rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('exposes the snippet preprocess hook on the core hook set', () => {
		const core = createCorePipelineHooks();
		expect(typeof core.preprocess).toBe('function');
	});

	it('the snippet schema transform throws if reached (preprocess not wired)', async () => {
		// Directly invoke the schema's transform — should throw to point user at registration.
		writeFileSync(join(tmpRoot, 'foo.ts'), 'x\n');
		const ast = Markdoc.parse('{% snippet path="foo.ts" /%}\n');
		// Transform without preprocess — schema transform fires.
		expect(() => Markdoc.transform(ast, { tags, nodes })).toThrow(/preprocess hook was not wired/);
	});
});
