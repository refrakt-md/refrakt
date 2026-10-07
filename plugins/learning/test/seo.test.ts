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

// SPEC-146 / WORK-609 — `step` is the child key of both rows and a rune name
// (`{% steps %}` emits `data-rune="step"`). The resolver no longer reaches into
// a nested rune for it; these pin that each rune still resolves the steps it
// builds itself. The cross-plugin case — a `{% steps %}` block inside a recipe —
// is the `recipe.foreign-steps` fixture in `contracts/seo-baseline`, because
// `steps` lives in the marketing plugin.
describe('SEO: recipe and howto resolve their own steps', () => {
	it('recipe publishes exactly its own ordered list as instructions', () => {
		const recipe = seo(`{% recipe %}
# Carbonara

- 200g spaghetti

1. Cook pasta al dente
2. Combine with egg mixture
{% /recipe %}`).jsonLd[0] as any;
		expect(recipe.recipeInstructions).toEqual([
			{ '@type': 'HowToStep', text: 'Cook pasta al dente' },
			{ '@type': 'HowToStep', text: 'Combine with egg mixture' },
		]);
	});

	it('howto publishes exactly its own ordered list as steps', () => {
		const howto = seo(`{% howto %}
# Birdhouse

- Hammer

1. Cut the wood
2. Attach the roof
{% /howto %}`).jsonLd[0] as any;
		expect(howto.step.map((s: any) => s.text)).toEqual(['Cut the wood', 'Attach the roof']);
		expect(howto.tool).toEqual({ '@type': 'HowToTool', name: 'Hammer' });
	});
});
