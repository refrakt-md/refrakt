import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('sandbox tag', () => {
	it('should extract raw HTML content via __source + node.lines', () => {
		const result = parse(`{% sandbox %}
<button class="btn">Click me</button>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		expect(sandbox).toBeDefined();
		expect(sandbox!.name).toBe('div');

		const contentMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'content');
		expect(contentMeta).toBeDefined();
		expect(contentMeta!.attributes.content).toContain('<button class="btn">Click me</button>');
	});

	it('should pass framework as meta property', () => {
		const result = parse(`{% sandbox framework="tailwind" %}
<div class="p-4">Hello</div>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const fwMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'framework');
		expect(fwMeta).toBeDefined();
		expect(fwMeta!.attributes.content).toBe('tailwind');
	});

	it('should pass dependencies as meta property', () => {
		const result = parse(`{% sandbox dependencies="https://cdn.example.com/lib.js,https://cdn.example.com/style.css" %}
<div>Test</div>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const depMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'dependencies');
		expect(depMeta).toBeDefined();
		expect(depMeta!.attributes.content).toContain('lib.js');
		expect(depMeta!.attributes.content).toContain('style.css');
	});

	it('should include height meta with default auto', () => {
		const result = parse(`{% sandbox %}
<p>Content</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const heightMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'height');
		expect(heightMeta).toBeDefined();
		expect(heightMeta!.attributes.content).toBe('auto');
	});

	it('should pass explicit height as meta property', () => {
		const result = parse(`{% sandbox height=400 %}
<p>Content</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const heightMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'height');
		expect(heightMeta).toBeDefined();
		expect(heightMeta!.attributes.content).toBe('400');
	});

	it('should include static fallback pre/code for SSR', () => {
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
		const contentMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'content');
		expect(contentMeta).toBeDefined();
		expect(contentMeta!.attributes.content).toContain('<style>');
		expect(contentMeta!.attributes.content).toContain('.box { color: red; }');
		expect(contentMeta!.attributes.content).toContain('<script>');
		expect(contentMeta!.attributes.content).toContain("console.log('hello')");
	});

	it('should pass label as meta property when provided', () => {
		const result = parse(`{% sandbox label="Before" %}
<button>Old</button>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const labelMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'label');
		expect(labelMeta).toBeDefined();
		expect(labelMeta!.attributes.content).toBe('Before');
	});

	it('should not emit label meta when label is not provided', () => {
		const result = parse(`{% sandbox %}
<p>Content</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const labelMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'label');
		expect(labelMeta).toBeUndefined();
	});

	it('should have empty content when __source is not available', () => {
		// parse() always sets __source, so we test with empty content
		const result = parse(`{% sandbox %}
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const contentMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'content');
		expect(contentMeta).toBeDefined();
		// Empty sandbox — nothing between open/close tags
		expect(contentMeta!.attributes.content).toBe('');
	});

	it('should default framework and dependencies to empty strings', () => {
		const result = parse(`{% sandbox %}
<p>Test</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');

		const fwMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'framework');
		expect(fwMeta!.attributes.content).toBe('');

		const depMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'dependencies');
		expect(depMeta!.attributes.content).toBe('');
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

		const contentMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'content');
		expect(contentMeta).toBeDefined();
		expect(contentMeta!.attributes.content).toContain('<form>Login</form>');
		expect(contentMeta!.attributes.content).toContain('.form { padding: 1rem; }');
		expect(contentMeta!.attributes.content).toContain('console.log("hello")');
	});

	it('should generate source panels with origin data', () => {
		const vars = mockSandboxFs({
			'/examples/card/index.html': '<div>Card</div>',
			'/examples/card/style.css': '.card { border: 1px solid; }',
		});

		const result = parse(`{% sandbox src="card" %}
{% /sandbox %}`, vars);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const panels = findAllTags(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'source-panel');

		expect(panels.length).toBe(2);
		expect(panels[0].attributes['data-label']).toBe('HTML');
		expect(panels[0].attributes['data-origin']).toBe('card/index.html');
		expect(panels[1].attributes['data-label']).toBe('CSS');
		expect(panels[1].attributes['data-origin']).toBe('card/style.css');
	});

	it('should work with framework and other attributes', () => {
		const vars = mockSandboxFs({
			'/examples/demo/index.html': '<button>Click</button>',
		});

		const result = parse(`{% sandbox src="demo" framework="tailwind" %}
{% /sandbox %}`, vars);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const fwMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'framework');
		expect(fwMeta!.attributes.content).toBe('tailwind');

		const contentMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'content');
		expect(contentMeta!.attributes.content).toContain('<button>Click</button>');
	});

	it('should show error when src directory does not exist', () => {
		const vars = mockSandboxFs({});

		const result = parse(`{% sandbox src="missing" %}
{% /sandbox %}`, vars);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const contentMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'content');
		expect(contentMeta!.attributes.content).toContain('not found');
	});

	it('should fall back to inline when sandbox variables are not available', () => {
		// Without sandbox fs variables, src attribute is ignored and inline extraction is used
		const result = parse(`{% sandbox src="login" %}
<p>Inline content</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes['data-rune'] === 'sandbox');
		const contentMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'content');
		expect(contentMeta!.attributes.content).toContain('<p>Inline content</p>');
	});
});
