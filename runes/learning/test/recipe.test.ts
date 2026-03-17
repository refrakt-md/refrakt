import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('recipe tag', () => {
	it('should transform a basic recipe', () => {
		const result = parse(`{% recipe prepTime="PT15M" cookTime="PT30M" servings=4 difficulty="easy" %}
# Pasta Carbonara

A classic Italian pasta dish.

- 200g spaghetti
- 100g pancetta
- 2 eggs

1. Cook the pasta
2. Fry the pancetta
3. Mix eggs and cheese
4. Combine everything

> Use freshly ground black pepper for best results.
{% /recipe %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'recipe');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass attributes as meta tags', () => {
		const result = parse(`{% recipe prepTime="PT10M" difficulty="hard" %}
# Test Recipe

- ingredient one

1. step one
{% /recipe %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'recipe');
		expect(tag).toBeDefined();

		const metas = findAllTags(tag!, t => t.name === 'meta');
		const prepTime = metas.find(m => m.attributes['data-field'] === 'prep-time');
		expect(prepTime).toBeDefined();
		expect(prepTime!.attributes.content).toBe('PT10M');

		const difficulty = metas.find(m => m.attributes['data-field'] === 'difficulty');
		expect(difficulty).toBeDefined();
		expect(difficulty!.attributes.content).toBe('hard');
	});

	it('should create ingredients list and steps list', () => {
		const result = parse(`{% recipe %}
# Simple Recipe

- flour
- sugar

1. Mix ingredients
2. Bake
{% /recipe %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'recipe');
		expect(tag).toBeDefined();

		const ingredients = findTag(tag!, t => t.name === 'ul' && t.attributes['data-name'] === 'ingredients');
		expect(ingredients).toBeDefined();

		const steps = findTag(tag!, t => t.name === 'ol' && t.attributes['data-name'] === 'steps');
		expect(steps).toBeDefined();
	});

	it('should support split layout with media zone', () => {
		const result = parse(`{% recipe prepTime="PT15M" layout="split" %}
# Split Recipe

A recipe with a photo.

- ingredient one

1. step one

---

![Photo](./photo.jpg)
{% /recipe %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'recipe');
		expect(tag).toBeDefined();

		// Layout meta
		const metas = findAllTags(tag!, t => t.name === 'meta');
		const layoutMeta = metas.find(m => m.attributes['data-field'] === 'layout');
		expect(layoutMeta).toBeDefined();
		expect(layoutMeta!.attributes.content).toBe('split');

		// Media zone should have an image
		const media = findTag(tag!, t => t.attributes['data-name'] === 'media');
		expect(media).toBeDefined();
		const img = findTag(media!, t => t.name === 'img');
		expect(img).toBeDefined();
	});

	it('should work without media zone (stacked default)', () => {
		const result = parse(`{% recipe %}
# No Media Recipe

- flour

1. Mix
{% /recipe %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'recipe');
		expect(tag).toBeDefined();

		// Should still have content zone
		const content = findTag(tag!, t => t.attributes['data-name'] === 'content');
		expect(content).toBeDefined();

		// Layout defaults to stacked
		const metas = findAllTags(tag!, t => t.name === 'meta');
		const layoutMeta = metas.find(m => m.attributes['data-field'] === 'layout');
		expect(layoutMeta).toBeDefined();
		expect(layoutMeta!.attributes.content).toBe('stacked');
	});

	it('should handle recipe with only ingredients', () => {
		const result = parse(`{% recipe %}
# Salad

- lettuce
- tomatoes
- cucumbers
{% /recipe %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'recipe');
		expect(tag).toBeDefined();

		const ingredients = findTag(tag!, t => t.name === 'ul' && t.attributes['data-name'] === 'ingredients');
		expect(ingredients).toBeDefined();
		expect(ingredients!.children.length).toBe(3);

		// Steps list should still exist but be empty
		const steps = findTag(tag!, t => t.name === 'ol' && t.attributes['data-name'] === 'steps');
		expect(steps).toBeDefined();
		expect(steps!.children.length).toBe(0);
	});

	it('should handle recipe with only steps', () => {
		const result = parse(`{% recipe %}
# Quick Guide

1. Preheat oven
2. Place food inside
3. Wait 20 minutes
{% /recipe %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'recipe');
		expect(tag).toBeDefined();

		const steps = findTag(tag!, t => t.name === 'ol' && t.attributes['data-name'] === 'steps');
		expect(steps).toBeDefined();
		expect(steps!.children.length).toBe(3);

		// Ingredients list should still exist but be empty
		const ingredients = findTag(tag!, t => t.name === 'ul' && t.attributes['data-name'] === 'ingredients');
		expect(ingredients).toBeDefined();
		expect(ingredients!.children.length).toBe(0);
	});

	it('should capture multiple tips', () => {
		const result = parse(`{% recipe %}
# Recipe With Tips

- flour

1. Mix

> Tip one about mixing

> Tip two about baking
{% /recipe %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'recipe');
		expect(tag).toBeDefined();

		const tips = findTag(tag!, t => t.attributes['data-name'] === 'tips');
		expect(tips).toBeDefined();
		// Should contain both blockquotes
		const blockquotes = findAllTags(tips!, t => t.name === 'blockquote');
		expect(blockquotes.length).toBe(2);
	});

	it('should extract page section header fields', () => {
		const result = parse(`{% recipe %}
Quick and easy

# Amazing Pasta

A delightful pasta recipe.

- pasta

1. Cook
{% /recipe %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'recipe');
		expect(tag).toBeDefined();

		// Header wrapper should exist
		const header = findTag(tag!, t => t.name === 'header');
		expect(header).toBeDefined();

		// Should contain the eyebrow paragraph, heading, and blurb paragraph
		const eyebrow = findTag(header!, t => t.name === 'p' && t.attributes['data-name'] === 'eyebrow');
		expect(eyebrow).toBeDefined();

		const headline = findTag(header!, t => /^h[1-6]$/.test(t.name));
		expect(headline).toBeDefined();

		const blurb = findTag(header!, t => t.name === 'p' && t.attributes['data-name'] === 'blurb');
		expect(blurb).toBeDefined();
	});
});
