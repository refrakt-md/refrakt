import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { runes, extractSeo, buildSeoTypeMap } from '@refrakt-md/runes';

const seoTypeMap = buildSeoTypeMap(runes);
seoTypeMap.set('recipe', 'Recipe');
seoTypeMap.set('how-to', 'HowTo');

function seo(content: string) {
	const tree = parse(content);
	return extractSeo(tree, seoTypeMap, {} as any, '/test');
}

describe('SEO: Recipe', () => {
	it('should extract Recipe with name, description, and times', () => {
		const result = seo(`{% recipe prepTime="PT15M" cookTime="PT30M" servings=4 difficulty="easy" %}
# Pasta Carbonara

A classic Italian pasta dish.

- 200g spaghetti
- 100g pancetta
- 2 eggs

1. Cook pasta al dente
2. Fry pancetta until crispy
3. Combine with egg mixture
{% /recipe %}`);

		expect(result.jsonLd).toHaveLength(1);
		const recipe = result.jsonLd[0] as any;
		expect(recipe['@context']).toBe('https://schema.org');
		expect(recipe['@type']).toBe('Recipe');
		expect(recipe.name).toBe('Pasta Carbonara');
		expect(recipe.description).toContain('classic Italian');
		expect(recipe.prepTime).toBe('PT15M');
		expect(recipe.cookTime).toBe('PT30M');
		expect(recipe.recipeYield).toBe('4');
		expect(recipe.recipeIngredient).toBeDefined();
		expect(recipe.recipeIngredient.length).toBeGreaterThanOrEqual(3);
		expect(recipe.recipeInstructions).toBeDefined();
		expect(recipe.recipeInstructions.length).toBeGreaterThanOrEqual(3);
		expect(recipe.recipeInstructions[0]['@type']).toBe('HowToStep');
	});
});

describe('SEO: HowTo', () => {
	it('should extract HowTo with name, description, and steps', () => {
		const result = seo(`{% howto estimatedTime="PT1H" %}
# How to Build a Birdhouse

A simple guide to building a wooden birdhouse.

- Hammer
- Nails
- Saw

1. Cut the wood to size
2. Assemble the walls
3. Attach the roof
{% /howto %}`);

		expect(result.jsonLd).toHaveLength(1);
		const howto = result.jsonLd[0] as any;
		expect(howto['@context']).toBe('https://schema.org');
		expect(howto['@type']).toBe('HowTo');
		expect(howto.name).toBe('How to Build a Birdhouse');
		expect(howto.description).toContain('simple guide');
		expect(howto.totalTime).toBe('PT1H');
		expect(howto.step).toBeDefined();
		expect(howto.step.length).toBeGreaterThanOrEqual(3);
		expect(howto.step[0]['@type']).toBe('HowToStep');
	});
});
