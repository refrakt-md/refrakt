import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { parse, findTag, findAllTags, fields } from './helpers.js';
import { tags, nodes } from '../src/index.js';

const pullquoteOf = (source: string) =>
	findTag(parse(source) as any, (t) => t.attributes['data-rune'] === 'pull-quote')!;

const tintOf = (pq: any) =>
	findTag(pq, (t) => t.name === 'meta' && t.attributes['data-field'] === 'tint')?.attributes
		.content;

const QUOTE = '> Design is how it works.\n\n**Steve Jobs** — Apple';

describe('pullquote tag (SPEC-185 D4)', () => {
	it('is a featured quotation: a figure holding the one blockquote', () => {
		const pq = pullquoteOf('{% pullquote %}\n> Design is how it works.\n{% /pullquote %}');
		expect(pq.name).toBe('figure');
		expect(pq.attributes['data-quote']).toBe('featured');
		const quotes = findAllTags(pq, (t) => t.name === 'blockquote');
		expect(quotes).toHaveLength(1);
		expect(quotes[0].attributes['data-name']).toBe('quote');
		// The role is the figure's, not the authored blockquote's (D3.1).
		expect(quotes[0].attributes['data-quote']).toBeUndefined();
		const [p] = findAllTags(pq, (t) => t.name === 'p');
		expect(p.children).toEqual(['Design is how it works.']);
		expect(findAllTags(pq, (t) => t.name === 'figcaption')).toHaveLength(0);
	});

	it('quotes paragraphs as written when there is no blockquote', () => {
		const pq = pullquoteOf('{% pullquote %}\nFirst.\n\nSecond.\n{% /pullquote %}');
		const [quote] = findAllTags(pq, (t) => t.name === 'blockquote');
		expect(findAllTags(quote, (t) => t.name === 'p')).toHaveLength(2);
	});

	it('reads the paragraph after the quote as its attribution (D6)', () => {
		const pq = pullquoteOf(`{% pullquote %}\n${QUOTE}\n{% /pullquote %}`);
		const [caption] = findAllTags(pq, (t) => t.name === 'figcaption');
		expect(caption.attributes['data-name']).toBe('attribution');
		const [cite] = findAllTags(caption, (t) => t.name === 'cite');
		expect(cite.children).toEqual(['Steve Jobs']);
		const [source] = findAllTags(caption, (t) => t.attributes['data-name'] === 'source');
		expect(source.children).toEqual(['Apple']);
		// The attribution is not quoted.
		const [quote] = findAllTags(pq, (t) => t.name === 'blockquote');
		expect(findAllTags(quote, (t) => t.name === 'strong')).toHaveLength(0);
		// The caption follows the quote, inside the figure.
		expect(pq.children.map((c: any) => c.name)).toEqual(['blockquote', 'figcaption']);
	});

	it('takes a name with no source', () => {
		const pq = pullquoteOf('{% pullquote %}\n> Words.\n\n**Ada Lovelace**\n{% /pullquote %}');
		const [caption] = findAllTags(pq, (t) => t.name === 'figcaption');
		expect(findAllTags(caption, (t) => t.name === 'cite')[0].children).toEqual(['Ada Lovelace']);
		expect(findAllTags(caption, (t) => t.attributes['data-name'] === 'source')).toHaveLength(0);
	});

	it('`excerpt` is a pull quote: an aside hidden from assistive technology', () => {
		const pq = pullquoteOf(`{% pullquote excerpt=true %}\n${QUOTE}\n{% /pullquote %}`);
		expect(pq.name).toBe('aside');
		expect(pq.attributes['aria-hidden']).toBe('true');
		expect(pq.attributes['data-quote']).toBe('excerpt');
		const [figure] = pq.children as any[];
		expect(figure.name).toBe('figure');
		expect(figure.children.map((c: any) => c.name)).toEqual(['blockquote', 'figcaption']);
		// Marked once, on the outermost element.
		expect(findAllTags(pq, (t) => t.attributes['data-quote'] !== undefined)).toHaveLength(1);
	});

	it('`quote` is an alias of `pullquote`', () => {
		const pq = pullquoteOf(`{% quote %}\n${QUOTE}\n{% /quote %}`);
		expect(pq.name).toBe('figure');
		expect(pq.attributes['data-quote']).toBe('featured');
	});

	it('`align` stays, and defaults to center', () => {
		expect(fields(pullquoteOf('{% pullquote %}\n> A.\n{% /pullquote %}')).align).toBe('center');
		expect(fields(pullquoteOf('{% pullquote align="right" %}\n> A.\n{% /pullquote %}')).align).toBe(
			'right',
		);
	});
});

describe('pullquote `variant` is deprecated (SPEC-185 D2)', () => {
	const validate = (src: string) =>
		Markdoc.validate(Markdoc.parse(src), { tags, nodes } as never).map((e) => e.error);

	it('warns when written', () => {
		const errors = validate('{% pullquote variant="editorial" %}\n> A.\n{% /pullquote %}');
		expect(errors.some((e) => e.id === 'deprecated-attribute' && e.level === 'warning')).toBe(true);
	});

	it('`accent` maps to `tint` and `prominence="prominent"`; nothing reaches the field bag', () => {
		const pq = pullquoteOf('{% pullquote variant="accent" %}\n> A.\n{% /pullquote %}');
		expect(fields(pq).variant).toBeUndefined();
		expect(pq.attributes.prominence).toBe('prominent');
		expect(tintOf(pq)).toBe('subtle');
	});

	it('an authored prominence or tint wins over the mapping', () => {
		const pq = pullquoteOf(
			'{% pullquote variant="accent" prominence="display" tint="warm" %}\n> A.\n{% /pullquote %}',
		);
		expect(pq.attributes.prominence).toBe('display');
		expect(tintOf(pq)).toBe('warm');
	});

	it('`editorial` and `default` map to nothing', () => {
		const pq = pullquoteOf('{% pullquote variant="editorial" %}\n> A.\n{% /pullquote %}');
		expect(pq.attributes.prominence).toBeUndefined();
		expect(tintOf(pq)).toBeUndefined();
	});
});
