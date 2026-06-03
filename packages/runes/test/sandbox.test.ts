import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

// SPEC-081: the sandbox transform emits the `rf-sandbox` custom element with its
// config on `data-*` attributes (no field-metas); the source rides an inert
// `<template data-content="source">` and the SSR fallback a
// `<template data-content="fallback">`.

describe('sandbox tag', () => {
	it('should extract raw HTML content onto data-source-content', () => {
		const result = parse(`{% sandbox %}
<button class="btn">Click me</button>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox).toBeDefined();
		expect(sandbox!.name).toBe('rf-sandbox');
		expect(sandbox!.attributes['data-source-content']).toContain('<button class="btn">Click me</button>');
	});

	it('should pass framework as a data attribute', () => {
		const result = parse(`{% sandbox framework="tailwind" %}
<div class="p-4">Hello</div>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-framework']).toBe('tailwind');
	});

	it('should pass dependencies as a data attribute', () => {
		const result = parse(`{% sandbox dependencies="https://cdn.example.com/lib.js,https://cdn.example.com/style.css" %}
<div>Test</div>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-dependencies']).toContain('lib.js');
		expect(sandbox!.attributes['data-dependencies']).toContain('style.css');
	});

	it('should default data-height to auto', () => {
		const result = parse(`{% sandbox %}
<p>Content</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-height']).toBe('auto');
	});

	it('should pass explicit height as a data attribute', () => {
		const result = parse(`{% sandbox height=400 %}
<p>Content</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-height']).toBe('400');
	});

	it('should include a static fallback pre/code for SSR (in a template)', () => {
		const result = parse(`{% sandbox %}
<div>Hello World</div>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const pre = findTag(sandbox!, t => t.name === 'pre');
		expect(pre).toBeDefined();
		expect(pre!.attributes['data-language']).toBe('html');
	});

	it('should extract multiline content with style and script', () => {
		const result = parse(`{% sandbox %}
<style>
  .box { color: red; }
</style>
<div class="box">Red text</div>
<script>
  console.log('hello');
</script>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const content = sandbox!.attributes['data-source-content'] as string;
		expect(content).toContain('<style>');
		expect(content).toContain('.box { color: red; }');
		expect(content).toContain('<script>');
		expect(content).toContain("console.log('hello')");
	});

	it('should pass label as a data attribute when provided', () => {
		const result = parse(`{% sandbox label="Before" %}
<button>Old</button>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-label']).toBe('Before');
	});

	it('should not set data-label when label is not provided', () => {
		const result = parse(`{% sandbox %}
<p>Content</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-label']).toBeUndefined();
	});

	it('should have empty content when there is nothing between the tags', () => {
		const result = parse(`{% sandbox %}
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-source-content']).toBe('');
	});

	it('should omit framework / dependencies data attrs when empty', () => {
		const result = parse(`{% sandbox %}
<p>Test</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		// Empty values are not serialized as data-* attributes.
		expect(sandbox!.attributes['data-framework']).toBeUndefined();
		expect(sandbox!.attributes['data-dependencies']).toBeUndefined();
	});
});

describe('sandbox with src attribute', () => {
	/** Create mock file system variables for sandbox external sources */
	function mockSandboxFs(files: Record<string, string>) {
		const dirs = new Map<string, string[]>();
		for (const path of Object.keys(files)) {
			const parts = path.split('/');
			const dir = parts.slice(0, -1).join('/');
			const name = parts[parts.length - 1];
			if (!dirs.has(dir)) dirs.set(dir, []);
			dirs.get(dir)!.push(name);
		}

		return {
			__sandboxReadFile: (p: string): string | null => files[p] ?? null,
			__sandboxListDir: (p: string): string[] => dirs.get(p) ?? [],
			__sandboxDirExists: (p: string): boolean => dirs.has(p),
			__sandboxExamplesDir: '/examples',
		};
	}

	it('should load content from a directory', () => {
		const vars = mockSandboxFs({
			'/examples/login/index.html': '<form>Login</form>',
			'/examples/login/style.css': '.form { padding: 1rem; }',
			'/examples/login/script.js': 'console.log("hello");',
		});

		const result = parse(`{% sandbox src="login" %}
{% /sandbox %}`, vars);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox).toBeDefined();
		const content = sandbox!.attributes['data-source-content'] as string;
		expect(content).toContain('<form>Login</form>');
		expect(content).toContain('.form { padding: 1rem; }');
		expect(content).toContain('console.log("hello")');
	});

	it('should expose source-file origins on data-source-origins', () => {
		const vars = mockSandboxFs({
			'/examples/card/index.html': '<div>Card</div>',
			'/examples/card/style.css': '.card { border: 1px solid; }',
		});

		const result = parse(`{% sandbox src="card" %}
{% /sandbox %}`, vars);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		// SPEC-081: panels are built client-side; the transform only ships the
		// labelled origins (`{label}\t{origin}` per line).
		const origins = sandbox!.attributes['data-source-origins'] as string;
		expect(origins).toContain('HTML\tcard/index.html');
		expect(origins).toContain('CSS\tcard/style.css');
	});

	it('should work with framework and other attributes', () => {
		const vars = mockSandboxFs({
			'/examples/demo/index.html': '<button>Click</button>',
		});

		const result = parse(`{% sandbox src="demo" framework="tailwind" %}
{% /sandbox %}`, vars);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-framework']).toBe('tailwind');
		expect(sandbox!.attributes['data-source-content']).toContain('<button>Click</button>');
	});

	it('should show error when src directory does not exist', () => {
		const vars = mockSandboxFs({});

		const result = parse(`{% sandbox src="missing" %}
{% /sandbox %}`, vars);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-source-content']).toContain('not found');
	});

	it('should fall back to inline when sandbox variables are not available', () => {
		const result = parse(`{% sandbox src="login" %}
<p>Inline content</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox!.attributes['data-source-content']).toContain('<p>Inline content</p>');
	});
});
