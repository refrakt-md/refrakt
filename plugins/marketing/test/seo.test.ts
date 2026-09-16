/**
 * These expectations are hand-written and deliberately partial — they say what a
 * rune's structured data is *for*, in a form a reader can check by eye.
 *
 * For the catalog-wide question "what does every rune emit today", the
 * authoritative record is `contracts/seo-baseline/baseline.json` (WORK-562):
 * 41 fixtures over all 30 emitting runes, regenerated with
 * `npm run seo:baseline` and guarded by a drift test. These files assert intent;
 * the baseline records fact, defects included. Where the two disagree, the
 * baseline is what shipped — and one of them is a bug.
 */
import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { extractSeo } from '@refrakt-md/runes';

function seo(content: string) {
	const tree = parse(content);
	return extractSeo(tree, {} as any, '/test');
}

describe('SEO: Review from testimonial', () => {
	it('should extract Review with author and quote', () => {
		const result = seo(`{% testimonial %}
> This product changed our workflow completely.

**Jane Doe** — CEO, Acme Corp
{% /testimonial %}`);

		expect(result.jsonLd).toHaveLength(1);
		const review = result.jsonLd[0] as any;
		expect(review['@context']).toBe('https://schema.org');
		expect(review['@type']).toBe('Review');
		expect(review.reviewBody).toContain('changed our workflow');
		expect(review.author).toBeDefined();
		expect(review.author['@type']).toBe('Person');
		expect(review.author.name).toBe('Jane Doe');
		expect(review.author.jobTitle).toBe('CEO, Acme Corp');
	});

	it('should extract rating when provided', () => {
		const result = seo(`{% testimonial rating=5 %}
> Five stars!

**John Smith**
{% /testimonial %}`);

		expect(result.jsonLd).toHaveLength(1);
		const review = result.jsonLd[0] as any;
		expect(review['@type']).toBe('Review');
		expect(review.reviewRating).toBeDefined();
		expect(review.reviewRating['@type']).toBe('Rating');
		expect(review.reviewRating.ratingValue).toBe(5);
	});

	it('should produce Review without rating when not provided', () => {
		const result = seo(`{% testimonial %}
> Great experience.

**Alice** — Designer
{% /testimonial %}`);

		const review = result.jsonLd[0] as any;
		expect(review['@type']).toBe('Review');
		expect(review.reviewRating).toBeUndefined();
	});
});
