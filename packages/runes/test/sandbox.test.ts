import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('sandbox tag', () => {
	it('should extract raw HTML content via __source + node.lines', () => {
		const result = parse(`{% sandbox %}
<button class="btn">Click me</button>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes.typeof === 'Sandbox');
		expect(sandbox).toBeDefined();
		expect(sandbox!.name).toBe('div');

		const contentMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes.property === 'content');
		expect(contentMeta).toBeDefined();
		expect(contentMeta!.attributes.content).toContain('<button class="btn">Click me</button>');
	});

	it('should pass framework as meta property', () => {
		const result = parse(`{% sandbox framework="tailwind" %}
<div class="p-4">Hello</div>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes.typeof === 'Sandbox');
		const fwMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes.property === 'framework');
		expect(fwMeta).toBeDefined();
		expect(fwMeta!.attributes.content).toBe('tailwind');
	});

	it('should pass dependencies as meta property', () => {
		const result = parse(`{% sandbox dependencies="https://cdn.example.com/lib.js,https://cdn.example.com/style.css" %}
<div>Test</div>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes.typeof === 'Sandbox');
		const depMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes.property === 'dependencies');
		expect(depMeta).toBeDefined();
		expect(depMeta!.attributes.content).toContain('lib.js');
		expect(depMeta!.attributes.content).toContain('style.css');
	});

	it('should include height meta with default auto', () => {
		const result = parse(`{% sandbox %}
<p>Content</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes.typeof === 'Sandbox');
		const heightMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes.property === 'height');
		expect(heightMeta).toBeDefined();
		expect(heightMeta!.attributes.content).toBe('auto');
	});

	it('should pass explicit height as meta property', () => {
		const result = parse(`{% sandbox height=400 %}
<p>Content</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes.typeof === 'Sandbox');
		const heightMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes.property === 'height');
		expect(heightMeta).toBeDefined();
		expect(heightMeta!.attributes.content).toBe('400');
	});

	it('should include static fallback pre/code for SSR', () => {
		const result = parse(`{% sandbox %}
<div>Hello World</div>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes.typeof === 'Sandbox');
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

		const sandbox = findTag(result as any, t => t.attributes.typeof === 'Sandbox');
		const contentMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes.property === 'content');
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

		const sandbox = findTag(result as any, t => t.attributes.typeof === 'Sandbox');
		const labelMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes.property === 'label');
		expect(labelMeta).toBeDefined();
		expect(labelMeta!.attributes.content).toBe('Before');
	});

	it('should not emit label meta when label is not provided', () => {
		const result = parse(`{% sandbox %}
<p>Content</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes.typeof === 'Sandbox');
		const labelMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes.property === 'label');
		expect(labelMeta).toBeUndefined();
	});

	it('should have empty content when __source is not available', () => {
		// parse() always sets __source, so we test with empty content
		const result = parse(`{% sandbox %}
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes.typeof === 'Sandbox');
		const contentMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes.property === 'content');
		expect(contentMeta).toBeDefined();
		// Empty sandbox — nothing between open/close tags
		expect(contentMeta!.attributes.content).toBe('');
	});

	it('should default framework and dependencies to empty strings', () => {
		const result = parse(`{% sandbox %}
<p>Test</p>
{% /sandbox %}`);

		const sandbox = findTag(result as any, t => t.attributes.typeof === 'Sandbox');

		const fwMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes.property === 'framework');
		expect(fwMeta!.attributes.content).toBe('');

		const depMeta = findTag(sandbox!, t =>
			t.name === 'meta' && t.attributes.property === 'dependencies');
		expect(depMeta!.attributes.content).toBe('');
	});
});
