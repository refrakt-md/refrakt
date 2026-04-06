import { describe, it, expect } from 'vitest';
import { registry } from '../src/registry.js';
import { extractComponentInterface, makeTag, renderToHtml } from '@refrakt-md/transform';
import type { SerializedTag } from '@refrakt-md/types';

describe('Astro component registry', () => {
	it('default registry is an empty object', () => {
		expect(registry).toEqual({});
	});

	it('registry accepts component-like values keyed by rune type', () => {
		const components = {
			...registry,
			recipe: { name: 'MockRecipeComponent' },
			hint: { name: 'MockHintComponent' },
		};

		expect(components.recipe).toBeDefined();
		expect(components.hint).toBeDefined();
		expect(components.unknown).toBeUndefined();
	});
});

describe('Astro renderer extraction (shared with RfRenderer.astro)', () => {
	/**
	 * These tests verify the extraction logic that RfRenderer.astro uses.
	 * The actual .astro component rendering is tested via Astro integration tests,
	 * but the TypeScript extraction pipeline is testable here.
	 */

	it('extracts properties for Astro props', () => {
		const tag = makeTag('article', { 'data-rune': 'recipe' }, [
			makeTag('meta', { 'data-field': 'prep-time', content: '15 min' }),
			makeTag('meta', { 'data-field': 'servings', content: '4' }),
			makeTag('meta', { 'data-field': 'difficulty', content: 'easy' }),
		]);

		const iface = extractComponentInterface(tag);
		expect(iface.properties).toEqual({
			prepTime: '15 min',
			servings: '4',
			difficulty: 'easy',
		});
	});

	it('extracts named refs that become Astro named slots', () => {
		const tag = makeTag('article', { 'data-rune': 'recipe' }, [
			makeTag('div', { 'data-name': 'headline' }, [
				makeTag('h2', {}, ['Chocolate Cake']),
			]),
			makeTag('div', { 'data-name': 'ingredients' }, [
				makeTag('ul', {}, [makeTag('li', {}, ['flour'])]),
			]),
		]);

		const iface = extractComponentInterface(tag);

		// Refs are pre-rendered to HTML for <Fragment slot="name" set:html={html} />
		const headlineHtml = iface.refs.headline.map(t => renderToHtml(t)).join('');
		const ingredientsHtml = iface.refs.ingredients.map(t => renderToHtml(t)).join('');

		expect(headlineHtml).toContain('<h2>Chocolate Cake</h2>');
		expect(ingredientsHtml).toContain('<li>flour</li>');
	});

	it('anonymous children become default slot content', () => {
		const tag = makeTag('div', { 'data-rune': 'hint' }, [
			makeTag('meta', { 'data-field': 'hint-type', content: 'warning' }),
			makeTag('p', {}, ['Be careful.']),
			makeTag('p', {}, ['Second paragraph.']),
		]);

		const iface = extractComponentInterface(tag);

		expect(iface.children).toHaveLength(2);
		expect((iface.children[0] as SerializedTag).name).toBe('p');
		expect((iface.children[1] as SerializedTag).name).toBe('p');
	});

	it('original tag preserved for escape-hatch access', () => {
		const tag = makeTag('div', { 'data-rune': 'hint', class: 'rf-hint' }, [
			makeTag('meta', { 'data-field': 'hint-type', content: 'warning' }),
		]);

		// The tag is passed alongside extracted props in RfRenderer.astro
		expect(tag.attributes['data-rune']).toBe('hint');
		expect(tag.attributes.class).toBe('rf-hint');
	});

	it('dispatching logic: component found when data-rune matches registry', () => {
		const components = { recipe: { name: 'Recipe' }, hint: { name: 'Hint' } };
		const tag = makeTag('article', { 'data-rune': 'recipe' }, []);

		const runeType = tag.attributes['data-rune'];
		const Component = runeType && components[runeType as keyof typeof components];

		expect(Component).toBeDefined();
		expect(Component?.name).toBe('Recipe');
	});

	it('dispatching logic: falls back when no component matches', () => {
		const components = { recipe: { name: 'Recipe' } };
		const tag = makeTag('div', { 'data-rune': 'unknown' }, [makeTag('p', {}, ['content'])]);

		const runeType = tag.attributes['data-rune'];
		const Component = runeType && components[runeType as keyof typeof components];

		expect(Component).toBeUndefined();

		// Fallback: render to HTML
		const html = renderToHtml(tag);
		expect(html).toContain('content');
	});
});
