import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('preview tag', () => {
	it('should transform with title and theme meta properties', () => {
		const result = parse(`{% preview title="Demo" theme="dark" width="full" %}
Some content.
{% /preview %}`);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		expect(preview).toBeDefined();
		expect(preview!.name).toBe('div');

		const titleMeta = findTag(preview!, t => t.name === 'meta' && t.attributes['data-field'] === 'title');
		expect(titleMeta!.attributes.content).toBe('Demo');

		const themeMeta = findTag(preview!, t => t.name === 'meta' && t.attributes['data-field'] === 'theme');
		expect(themeMeta!.attributes.content).toBe('dark');
	});

	it('should not emit source property when no fence child exists', () => {
		const result = parse(`{% preview %}
Some content.
{% /preview %}`);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		expect(preview).toBeDefined();

		const source = findTag(preview!, t => t.name === 'pre' && t.attributes['data-name'] === 'source');
		expect(source).toBeUndefined();
	});

	it('should extract first fence child as source property', () => {
		const result = parse(`{% preview %}
\`\`\`jsx
<Button>Click me</Button>
\`\`\`

Some content.
{% /preview %}`);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		expect(preview).toBeDefined();

		const source = findTag(preview!, t => t.name === 'pre' && t.attributes['data-name'] === 'source');
		expect(source).toBeDefined();
		expect(source!.attributes['data-language']).toBe('jsx');

		const code = findTag(source!, t => t.name === 'code');
		expect(code).toBeDefined();
		expect(code!.children[0]).toContain('<Button>Click me</Button>');
	});

	it('should not render extracted fence as content child', () => {
		const result = parse(`{% preview %}
\`\`\`html
<div>Hello</div>
\`\`\`

A paragraph.
{% /preview %}`);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		expect(preview).toBeDefined();

		// The source pre exists
		const source = findTag(preview!, t => t.name === 'pre' && t.attributes['data-name'] === 'source');
		expect(source).toBeDefined();

		// Only source and htmlSource pre tags should exist (fence was removed from children)
		const allPres = findAllTags(preview!, t => t.name === 'pre');
		expect(allPres).toHaveLength(2);
		expect(allPres[0].attributes['data-name']).toBe('source');
		expect(allPres[1].attributes['data-name']).toBe('html-source');
	});

	it('should auto-infer source from children when source=true', () => {
		const content = `{% preview source=true %}
{% hint type="note" %}
A note.
{% /hint %}
{% /preview %}`;
		const result = parse(content);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		expect(preview).toBeDefined();

		const source = findTag(preview!, t => t.name === 'pre' && t.attributes['data-name'] === 'source');
		expect(source).toBeDefined();
		expect(source!.attributes['data-language']).toBe('markdoc');

		const code = findTag(source!, t => t.name === 'code');
		expect(code).toBeDefined();
		expect(code!.children[0]).toContain('{% hint type="note" %}');
		expect(code!.children[0]).toContain('{% /hint %}');
		// Should NOT include the preview open/close tags
		expect(code!.children[0]).not.toContain('{% preview');
		expect(code!.children[0]).not.toContain('{% /preview');
	});

	it('should not auto-infer source when source=false (default)', () => {
		const result = parse(`{% preview %}
{% hint type="note" %}
A note.
{% /hint %}
{% /preview %}`);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		const source = findTag(preview!, t => t.name === 'pre' && t.attributes['data-name'] === 'source');
		expect(source).toBeUndefined();
	});

	it('should prefer fence over auto-infer when both are present', () => {
		const content = `{% preview source=true %}
\`\`\`jsx
<Button />
\`\`\`

{% hint type="note" %}
A note.
{% /hint %}
{% /preview %}`;
		const result = parse(content);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		const source = findTag(preview!, t => t.name === 'pre' && t.attributes['data-name'] === 'source');
		expect(source).toBeDefined();
		// Fence wins — language is jsx, not markdoc
		expect(source!.attributes['data-language']).toBe('jsx');

		const code = findTag(source!, t => t.name === 'code');
		expect(code!.children[0]).toContain('<Button />');
	});

	it('should emit responsive meta property when set', () => {
		const result = parse(`{% preview responsive="mobile,tablet,desktop" %}
Some content.
{% /preview %}`);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		expect(preview).toBeDefined();

		const responsiveMeta = findTag(preview!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'responsive');
		expect(responsiveMeta).toBeDefined();
		expect(responsiveMeta!.attributes.content).toBe('mobile,tablet,desktop');
	});

	it('should not emit responsive meta when not set', () => {
		const result = parse(`{% preview %}
Some content.
{% /preview %}`);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		const responsiveMeta = findTag(preview!, t =>
			t.name === 'meta' && t.attributes['data-field'] === 'responsive');
		expect(responsiveMeta).toBeUndefined();
	});

	it('should generate htmlSource when source=true', () => {
		const content = `{% preview source=true %}
{% hint type="note" %}
A note.
{% /hint %}
{% /preview %}`;
		const result = parse(content);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		expect(preview).toBeDefined();

		const htmlSource = findTag(preview!, t =>
			t.name === 'pre' && t.attributes['data-name'] === 'html-source');
		expect(htmlSource).toBeDefined();
		expect(htmlSource!.attributes['data-language']).toBe('html');

		const code = findTag(htmlSource!, t => t.name === 'code');
		expect(code).toBeDefined();
		// Should contain structural attributes
		expect(code!.children[0]).toContain('data-rune="hint"');
		expect(code!.children[0]).toContain('data-field="hint-type"');
	});

	it('should not generate htmlSource when source is absent', () => {
		const result = parse(`{% preview %}
{% hint type="note" %}
A note.
{% /hint %}
{% /preview %}`);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		const htmlSource = findTag(preview!, t =>
			t.name === 'pre' && t.attributes['data-name'] === 'html-source');
		expect(htmlSource).toBeUndefined();
	});

	it('should generate htmlSource alongside fence source', () => {
		const content = `{% preview %}
\`\`\`jsx
<Button />
\`\`\`

{% hint type="note" %}
A note.
{% /hint %}
{% /preview %}`;
		const result = parse(content);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		const source = findTag(preview!, t =>
			t.name === 'pre' && t.attributes['data-name'] === 'source');
		const htmlSource = findTag(preview!, t =>
			t.name === 'pre' && t.attributes['data-name'] === 'html-source');

		expect(source).toBeDefined();
		expect(source!.attributes['data-language']).toBe('jsx');
		expect(htmlSource).toBeDefined();
		expect(htmlSource!.attributes['data-language']).toBe('html');
	});

	it('should pretty-print the rune HTML output', () => {
		const content = `{% preview source=true %}
{% hint type="note" %}
A note.
{% /hint %}
{% /preview %}`;
		const result = parse(content);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		const htmlSource = findTag(preview!, t =>
			t.name === 'pre' && t.attributes['data-name'] === 'html-source');
		const code = findTag(htmlSource!, t => t.name === 'code');
		// Should have newlines (pretty-printed, not flat)
		expect(code!.children[0]).toContain('\n');
		// Should have indentation
		expect(code!.children[0]).toMatch(/^\s{2}/m);
	});

	it('should only extract the first fence, leaving nested fences intact', () => {
		const result = parse(`{% preview %}
\`\`\`markdoc
{% hint %}Hello{% /hint %}
\`\`\`

{% cta %}
# Install

\`\`\`shell
npm install
\`\`\`
{% /cta %}
{% /preview %}`);

		const preview = findTag(result as any, t => t.attributes['data-rune'] === 'preview');
		expect(preview).toBeDefined();

		const source = findTag(preview!, t => t.name === 'pre' && t.attributes['data-name'] === 'source');
		expect(source).toBeDefined();
		expect(source!.attributes['data-language']).toBe('markdoc');

		// The nested fence inside cta should still be present as a regular pre
		const allPres = findAllTags(preview!, t => t.name === 'pre');
		expect(allPres.length).toBeGreaterThan(1);
	});
});
