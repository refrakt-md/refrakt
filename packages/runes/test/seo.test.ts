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

	it('should extract Recipe with ingredients and steps', () => {
		const result = seo(`{% recipe prepTime="PT15M" cookTime="PT30M" servings=4 %}
# Chocolate Cake

A rich chocolate cake recipe.

- 2 cups flour
- 1 cup sugar
- 3 eggs

1. Mix dry ingredients
2. Add wet ingredients
3. Bake at 350°F for 30 minutes
{% /recipe %}`);

		expect(result.jsonLd).toHaveLength(1);
		const recipe = result.jsonLd[0] as any;
		expect(recipe['@context']).toBe('https://schema.org');
		expect(recipe['@type']).toBe('Recipe');
		expect(recipe.name).toBe('Chocolate Cake');
		expect(recipe.description).toContain('chocolate cake');
		expect(recipe.prepTime).toBe('PT15M');
		expect(recipe.cookTime).toBe('PT30M');
		expect(recipe.recipeYield).toBe('4');
		expect(recipe.recipeIngredient).toHaveLength(3);
		expect(recipe.recipeIngredient[0]).toContain('flour');
		expect(recipe.recipeInstructions).toHaveLength(3);
		expect(recipe.recipeInstructions[0]['@type']).toBe('HowToStep');
		expect(recipe.recipeInstructions[0].text).toContain('Mix dry');
	});

	it('should extract HowTo with tools and steps', () => {
		const result = seo(`{% howto estimatedTime="PT2H" difficulty="medium" %}
# Build a Bookshelf

A guide to building a simple bookshelf.

- Hammer
- Screwdriver
- Wood glue

1. Cut the wood to size
2. Sand all surfaces
3. Assemble with screws and glue
{% /howto %}`);

		expect(result.jsonLd).toHaveLength(1);
		const howto = result.jsonLd[0] as any;
		expect(howto['@context']).toBe('https://schema.org');
		expect(howto['@type']).toBe('HowTo');
		expect(howto.name).toBe('Build a Bookshelf');
		expect(howto.description).toContain('bookshelf');
		expect(howto.totalTime).toBe('PT2H');
		expect(howto.tool).toHaveLength(3);
		expect(howto.tool[0]['@type']).toBe('HowToTool');
		expect(howto.tool[0].name).toContain('Hammer');
		expect(howto.step).toHaveLength(3);
		expect(howto.step[0]['@type']).toBe('HowToStep');
		expect(howto.step[0].text).toContain('Cut the wood');
	});

	it('should extract Event with date and location', () => {
		const result = seo(`{% event date="2025-06-15T09:00:00Z" endDate="2025-06-15T17:00:00Z" location="Convention Center" url="https://example.com/event" %}
# Tech Conference 2025

Join us for an exciting day of talks and workshops.
{% /event %}`);

		expect(result.jsonLd).toHaveLength(1);
		const event = result.jsonLd[0] as any;
		expect(event['@context']).toBe('https://schema.org');
		expect(event['@type']).toBe('Event');
		expect(event.name).toBe('Tech Conference 2025');
		expect(event.description).toContain('exciting day');
		expect(event.startDate).toBe('2025-06-15T09:00:00Z');
		expect(event.endDate).toBe('2025-06-15T17:00:00Z');
		expect(event.location['@type']).toBe('Place');
		expect(event.location.name).toBe('Convention Center');
		expect(event.url).toBe('https://example.com/event');
	});

	it('should extract Person from cast with multiple members', () => {
		const result = seo(`{% cast %}
- Jane Smith - Director
- John Doe - Producer
- Alice Johnson - Lead Actor
{% /cast %}`);

		expect(result.jsonLd).toHaveLength(3);
		const people = result.jsonLd as any[];
		expect(people[0]['@type']).toBe('Person');
		expect(people[0].name).toBe('Jane Smith');
		expect(people[0].jobTitle).toBe('Director');
		expect(people[1].name).toBe('John Doe');
		expect(people[2].name).toBe('Alice Johnson');
	});

	it('should extract single Person from cast with one member', () => {
		const result = seo(`{% cast %}
- Jane Smith - Director
{% /cast %}`);

		expect(result.jsonLd).toHaveLength(1);
		const person = result.jsonLd[0] as any;
		expect(person['@type']).toBe('Person');
		expect(person.name).toBe('Jane Smith');
		expect(person.jobTitle).toBe('Director');
	});

	it('should extract Organization with sub-type', () => {
		const result = seo(`{% organization type="LocalBusiness" %}
# Acme Corp

A leading provider of innovative solutions.
{% /organization %}`);

		expect(result.jsonLd).toHaveLength(1);
		const org = result.jsonLd[0] as any;
		expect(org['@context']).toBe('https://schema.org');
		expect(org['@type']).toBe('LocalBusiness');
		expect(org.name).toBe('Acme Corp');
		expect(org.description).toContain('innovative solutions');
	});

	it('should extract Organization with default type', () => {
		const result = seo(`{% organization %}
# Some Org

Description here.
{% /organization %}`);

		const org = result.jsonLd[0] as any;
		expect(org['@type']).toBe('Organization');
	});

	it('should extract Dataset from datatable', () => {
		const result = seo(`{% datatable sortable="name,age" searchable=true %}
| Name | Age | City |
|------|-----|------|
| Alice | 30 | NYC |
| Bob | 25 | LA |
{% /datatable %}`);

		expect(result.jsonLd).toHaveLength(1);
		const dataset = result.jsonLd[0] as any;
		expect(dataset['@context']).toBe('https://schema.org');
		expect(dataset['@type']).toBe('Dataset');
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
