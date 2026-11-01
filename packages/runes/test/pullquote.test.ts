import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

const pullquoteOf = (source: string) =>
	findTag(parse(source) as any, (t) => t.attributes['data-rune'] === 'pull-quote')!;

describe('pullquote tag', () => {
	it('is the one blockquote: it unwraps an authored blockquote rather than nesting it', () => {
		const pq = pullquoteOf('{% pullquote %}\n> Design is how it works.\n{% /pullquote %}');
		expect(pq.name).toBe('blockquote');
		expect(findAllTags(pq, (t) => t.name === 'blockquote')).toHaveLength(1);
		const [p] = findAllTags(pq, (t) => t.name === 'p');
		expect(p.children).toEqual(['Design is how it works.']);
	});

	// Carrying the authored blockquote's attributes onto the root (a slot
	// marker, a schema `property`) is covered by the composed testimonial,
	// whose `reviewBody` lands on the pullquote: composed-testimonial.test.ts.

	it('quotes paragraphs as written when there is no blockquote', () => {
		const pq = pullquoteOf('{% pullquote %}\nFirst.\n\nSecond.\n{% /pullquote %}');
		expect(pq.name).toBe('blockquote');
		expect(findAllTags(pq, (t) => t.name === 'p')).toHaveLength(2);
		expect(findAllTags(pq, (t) => t.name === 'blockquote')).toHaveLength(1);
	});
});
