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

		const tag = findTag(result as any, t => t.attributes.typeof === 'Recipe');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass attributes as meta tags', () => {
		const result = parse(`{% recipe prepTime="PT10M" difficulty="hard" %}
# Test Recipe

- ingredient one

1. step one
{% /recipe %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Recipe');
		expect(tag).toBeDefined();

		const metas = findAllTags(tag!, t => t.name === 'meta');
		const prepTime = metas.find(m => m.attributes.property === 'prepTime');
		expect(prepTime).toBeDefined();
		expect(prepTime!.attributes.content).toBe('PT10M');

		const difficulty = metas.find(m => m.attributes.property === 'difficulty');
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

		const tag = findTag(result as any, t => t.attributes.typeof === 'Recipe');
		expect(tag).toBeDefined();

		const ingredients = findTag(tag!, t => t.name === 'ul' && t.attributes['data-name'] === 'ingredients');
		expect(ingredients).toBeDefined();

		const steps = findTag(tag!, t => t.name === 'ol' && t.attributes['data-name'] === 'steps');
		expect(steps).toBeDefined();
	});
});
