import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';

/**
 * WORK-640 — refrakt round-trips content through `Markdoc.format` in memory
 * (`deferred-body.ts`, `collection-helpers.ts`, `collection-resolve.ts`,
 * `content/src/site.ts`): it formats a subtree and parses the text again. On
 * Markdoc 0.4.0 two shapes did not survive that: an image `src` with more than
 * one parenthesis (only the first was escaped) and a blockquote whose children
 * span several lines (the `>` was dropped after a child's first line). These
 * pin the 0.5 behaviour the upgrade bought.
 */

/** The parts of an AST that carry content: no source positions. */
function shape(node: Node): unknown {
	return {
		type: node.type,
		tag: node.tag,
		attributes: node.attributes,
		children: node.children.map(shape),
	};
}

function roundTrip(source: string) {
	const before = Markdoc.parse(source);
	const text = Markdoc.format(before);
	return { before, after: Markdoc.parse(text), text };
}

describe('`Markdoc.format` round trips (Markdoc 0.5)', () => {
	it('keeps an image `src` with two pairs of parentheses', () => {
		const { before, after, text } = roundTrip('![Map](/maps/(north)(south).png)\n');
		expect(shape(after)).toEqual(shape(before));
		const image = [...after.walk()].find((n) => n.type === 'image');
		expect(image?.attributes.src).toBe('/maps/(north)(south).png');
		// Formatting its own output changes nothing further.
		expect(Markdoc.format(Markdoc.parse(text))).toBe(text);
	});

	it('keeps a blockquote with two paragraphs', () => {
		const { before, after, text } = roundTrip('> First paragraph.\n>\n> Second paragraph.\n');
		expect(shape(after)).toEqual(shape(before));
		const [quote] = after.children;
		expect(quote.type).toBe('blockquote');
		expect(quote.children.map((c) => c.type)).toEqual(['paragraph', 'paragraph']);
		expect(Markdoc.format(Markdoc.parse(text))).toBe(text);
	});

	it('keeps a list inside a blockquote', () => {
		// 0.4.0 wrote `> - a\n- b`: every line after a child's first lost its
		// `>`, so the second item fell out of the quote.
		const { before, after } = roundTrip('> First.\n>\n> - a\n> - b\n');
		expect(shape(after)).toEqual(shape(before));
		const [quote] = after.children;
		expect(quote.children.map((c) => c.type)).toEqual(['paragraph', 'list']);
		expect(quote.children[1].children).toHaveLength(2);
	});
});
