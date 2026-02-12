import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';
import { runes, extractSeo, buildSeoTypeMap } from '../src/index.js';

const seoTypeMap = buildSeoTypeMap(runes);

function seo(content: string, frontmatter: Record<string, any> = {}, url = '/test') {
	const tree = parse(content);
	return extractSeo(tree, seoTypeMap, frontmatter as any, url);
}

describe('JSON-LD extraction', () => {
	it('should extract FAQPage from accordion/faq', () => {
		const result = seo(`{% faq headingLevel=2 %}
## What is refrakt.md?

A content framework.

## How do I install it?

Run npm install.
{% /faq %}`);

		expect(result.jsonLd).toHaveLength(1);
		const faq = result.jsonLd[0] as any;
		expect(faq['@context']).toBe('https://schema.org');
		expect(faq['@type']).toBe('FAQPage');
		expect(faq.mainEntity).toHaveLength(2);
		expect(faq.mainEntity[0]['@type']).toBe('Question');
		expect(faq.mainEntity[0].name).toBe('What is refrakt.md?');
		expect(faq.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
		expect(faq.mainEntity[0].acceptedAnswer.text).toContain('content framework');
		expect(faq.mainEntity[1].name).toBe('How do I install it?');
	});

	it('should extract Product from pricing with tiers', () => {
		const result = seo(`{% pricing %}
## Choose Your Plan

Pick the plan that's right for you.

{% tier name="Free" priceMonthly="$0" %}
For individuals.

- 1 project
{% /tier %}

{% tier name="Pro" priceMonthly="$29" %}
For professionals.

- Unlimited projects
{% /tier %}
{% /pricing %}`);

		expect(result.jsonLd).toHaveLength(1);
		const product = result.jsonLd[0] as any;
		expect(product['@type']).toBe('Product');
		expect(product.name).toBe('Choose Your Plan');
		expect(product.description).toContain('right for you');
		expect(product.offers).toHaveLength(2);
		expect(product.offers[0]['@type']).toBe('Offer');
		expect(product.offers[0].name).toBe('Free');
		expect(product.offers[0].price).toBe('0');
		expect(product.offers[1].name).toBe('Pro');
		expect(product.offers[1].price).toBe('29');
	});

	it('should extract Review from testimonial with rating', () => {
		const result = seo(`{% testimonial rating=5 %}
> This product is amazing!

**Jane Doe** — CEO, Acme Corp
{% /testimonial %}`);

		expect(result.jsonLd).toHaveLength(1);
		const review = result.jsonLd[0] as any;
		expect(review['@type']).toBe('Review');
		expect(review.reviewBody).toContain('amazing');
		expect(review.author['@type']).toBe('Person');
		expect(review.author.name).toBe('Jane Doe');
		expect(review.reviewRating['@type']).toBe('Rating');
		expect(review.reviewRating.ratingValue).toBe(5);
	});

	it('should extract Review without rating', () => {
		const result = seo(`{% testimonial %}
> Changed our workflow.

**Bob** — CTO
{% /testimonial %}`);

		const review = result.jsonLd[0] as any;
		expect(review['@type']).toBe('Review');
		expect(review.reviewRating).toBeUndefined();
	});

	it('should extract BreadcrumbList from breadcrumb', () => {
		const result = seo(`{% breadcrumb %}
- [Home](/)
- [Docs](/docs)
- Current Page
{% /breadcrumb %}`);

		expect(result.jsonLd).toHaveLength(1);
		const bc = result.jsonLd[0] as any;
		expect(bc['@type']).toBe('BreadcrumbList');
		expect(bc.itemListElement).toHaveLength(3);
		expect(bc.itemListElement[0].position).toBe(1);
		expect(bc.itemListElement[0].name).toBe('Home');
		expect(bc.itemListElement[0].item).toBe('/');
		expect(bc.itemListElement[1].position).toBe(2);
		expect(bc.itemListElement[2].position).toBe(3);
	});

	it('should extract ItemList from timeline', () => {
		const result = seo(`{% timeline %}
## 2021 - Project started

We began building.

## 2023 - First release

Open-sourced the library.
{% /timeline %}`);

		expect(result.jsonLd).toHaveLength(1);
		const list = result.jsonLd[0] as any;
		expect(list['@type']).toBe('ItemList');
		expect(list.itemListElement).toHaveLength(2);
		expect(list.itemListElement[0]['@type']).toBe('ListItem');
		expect(list.itemListElement[0].position).toBe(1);
	});

	it('should extract VideoObject from embed', () => {
		const result = seo(`{% embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" %}
Watch the video.
{% /embed %}`);

		expect(result.jsonLd).toHaveLength(1);
		const video = result.jsonLd[0] as any;
		expect(video['@type']).toBe('VideoObject');
		expect(video.embedUrl).toContain('youtube-nocookie.com');
	});

	it('should produce multiple JSON-LD blocks for multiple runes', () => {
		const result = seo(`{% faq headingLevel=2 %}
## Question one?

Answer one.
{% /faq %}

{% testimonial rating=4 %}
> Great product!

**Alice** — Designer
{% /testimonial %}`);

		expect(result.jsonLd).toHaveLength(2);
		const types = result.jsonLd.map((ld: any) => ld['@type']);
		expect(types).toContain('FAQPage');
		expect(types).toContain('Review');
	});

	it('should not produce top-level JSON-LD for child seoTypes (Offer)', () => {
		// Tier has seoType 'Offer' but should only appear inside Product
		const result = seo(`{% pricing %}
## Plans

{% tier name="Basic" priceMonthly="$9" %}
Basic features.
{% /tier %}
{% /pricing %}`);

		const types = result.jsonLd.map((ld: any) => ld['@type']);
		expect(types).toContain('Product');
		expect(types).not.toContain('Offer');
	});
});

describe('OG meta extraction', () => {
	it('should extract title from first h1', () => {
		const result = seo(`# Hello World

Some content here.`);

		expect(result.og.title).toBe('Hello World');
	});

	it('should extract description from first paragraph', () => {
		const result = seo(`# Title

This is a description paragraph.`);

		expect(result.og.description).toContain('description paragraph');
	});

	it('should use frontmatter over content', () => {
		const result = seo(
			`# Content Title

Content description.`,
			{ title: 'FM Title', description: 'FM Description' },
		);

		expect(result.og.title).toBe('FM Title');
		expect(result.og.description).toBe('FM Description');
	});

	it('should use Hero rune for OG when no frontmatter', () => {
		const result = seo(`{% hero %}
# Hero Headline

This is the hero blurb.

[Get Started](/start)
{% /hero %}`);

		expect(result.og.title).toBe('Hero Headline');
		expect(result.og.description).toContain('hero blurb');
	});

	it('should prefer frontmatter over hero', () => {
		const result = seo(
			`{% hero %}
# Hero Title

Hero blurb.
{% /hero %}`,
			{ title: 'FM Title' },
		);

		expect(result.og.title).toBe('FM Title');
	});

	it('should set url and type', () => {
		const result = seo(`# Test`, {}, '/about');

		expect(result.og.url).toBe('/about');
		expect(result.og.type).toBe('website');
	});

	it('should truncate description to 200 chars', () => {
		const longText = 'A'.repeat(300);
		const result = seo(`# Title\n\n${longText}`);

		expect(result.og.description!.length).toBeLessThanOrEqual(200);
	});
});
