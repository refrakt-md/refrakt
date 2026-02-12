import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('sidenote tag', () => {
	it('should transform content into a sidenote', () => {
		const result = parse(`{% sidenote %}
This is a margin note with additional context.
{% /sidenote %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Sidenote');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('aside');
	});

	it('should pass style as meta', () => {
		const result = parse(`{% sidenote style="footnote" %}
A footnote reference.
{% /sidenote %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Sidenote');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'style');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('footnote');
	});

	it('should default style to sidenote', () => {
		const result = parse(`{% sidenote %}
Default style note.
{% /sidenote %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Sidenote');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'style');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('sidenote');
	});

	it('should work with footnote alias', () => {
		const result = parse(`{% footnote %}
A footnote.
{% /footnote %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Sidenote');
		expect(tag).toBeDefined();
	});

	it('should work with marginnote alias', () => {
		const result = parse(`{% marginnote %}
A margin note.
{% /marginnote %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Sidenote');
		expect(tag).toBeDefined();
	});
});
