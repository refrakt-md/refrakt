import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('testimonial tag', () => {
	it('should extract blockquote as testimonial quote', () => {
		const result = parse(`{% testimonial %}
> This product is amazing!

**Jane Doe** — CEO, Acme Corp
{% /testimonial %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Testimonial');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');

		const quote = findTag(tag!, t => t.name === 'blockquote');
		expect(quote).toBeDefined();
	});

	it('should extract author name from bold text', () => {
		const result = parse(`{% testimonial %}
> Great experience!

**Sarah Chen** — VP Engineering, Tech Corp
{% /testimonial %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Testimonial');
		const authorName = findTag(tag!, t => t.name === 'span' && t.attributes.property === 'authorName');
		expect(authorName).toBeDefined();
	});

	it('should pass rating as meta tag', () => {
		const result = parse(`{% testimonial rating=5 %}
> Five stars!

**John Smith**
{% /testimonial %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Testimonial');
		const ratingMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 5);
		expect(ratingMeta).toBeDefined();
	});

	it('should work with review alias', () => {
		const result = parse(`{% review rating=4 %}
> Very good product.

**Alice** — Designer
{% /review %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Testimonial');
		expect(tag).toBeDefined();
	});

	it('should work without rating (testimonial mode)', () => {
		const result = parse(`{% testimonial %}
> Changed our workflow completely.

**Bob** — CTO
{% /testimonial %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Testimonial');
		expect(tag).toBeDefined();
	});
});
