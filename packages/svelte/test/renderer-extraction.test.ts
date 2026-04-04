import { describe, it, expect } from 'vitest';
import { extractComponentInterface, makeTag } from '@refrakt-md/transform';
import type { SerializedTag, RendererNode } from '@refrakt-md/types';

/**
 * Integration tests verifying the extraction logic that the Renderer uses
 * when dispatching to registered component overrides (ADR-008).
 *
 * These test the framework-agnostic extraction — the Svelte-specific
 * snippet creation is tested via the Renderer component itself.
 */
describe('Renderer extraction integration', () => {
	/** Build a mock recipe tag as it would appear after serialization (pre-identity-transform) */
	function mockRecipeTag(): SerializedTag {
		return makeTag('article', { 'data-rune': 'recipe', typeof: 'Recipe' }, [
			makeTag('meta', { 'data-field': 'prep-time', content: '15 min' }),
			makeTag('meta', { 'data-field': 'cook-time', content: '30 min' }),
			makeTag('meta', { 'data-field': 'servings', content: '4' }),
			makeTag('meta', { 'data-field': 'difficulty', content: 'easy' }),
			makeTag('div', { 'data-name': 'media' }, [
				makeTag('img', { src: '/photo.jpg', alt: 'Dish photo' }),
			]),
			makeTag('div', { 'data-name': 'content' }, [
				makeTag('header', { 'data-name': 'headline' }, [
					makeTag('h2', {}, ['Chocolate Cake']),
				]),
				makeTag('ul', { 'data-name': 'ingredients' }, [
					makeTag('li', {}, ['flour']),
					makeTag('li', {}, ['sugar']),
				]),
				makeTag('ol', { 'data-name': 'steps' }, [
					makeTag('li', {}, ['Mix dry ingredients']),
					makeTag('li', {}, ['Add wet ingredients']),
				]),
			]),
		]);
	}

	it('extracts all properties as camelCase keys with content values', () => {
		const tag = mockRecipeTag();
		const iface = extractComponentInterface(tag);

		expect(iface.properties).toEqual({
			prepTime: '15 min',
			cookTime: '30 min',
			servings: '4',
			difficulty: 'easy',
		});
	});

	it('extracts top-level refs by data-name', () => {
		const tag = mockRecipeTag();
		const iface = extractComponentInterface(tag);

		expect(Object.keys(iface.refs).sort()).toEqual(['content', 'media']);
		expect(iface.refs.media).toHaveLength(1);
		expect(iface.refs.media[0].attributes['data-name']).toBe('media');
		expect(iface.refs.content).toHaveLength(1);
		expect(iface.refs.content[0].attributes['data-name']).toBe('content');
	});

	it('nested data-name children remain inside their parent ref', () => {
		const tag = mockRecipeTag();
		const iface = extractComponentInterface(tag);

		// The 'content' ref has nested data-name children: headline, ingredients, steps
		const contentRef = iface.refs.content[0];
		const nestedNames = contentRef.children
			.filter((c): c is SerializedTag => typeof c === 'object' && c !== null && !Array.isArray(c) && (c as any).$$mdtype === 'Tag')
			.map(c => c.attributes['data-name'])
			.filter(Boolean);

		expect(nestedNames).toContain('headline');
		expect(nestedNames).toContain('ingredients');
		expect(nestedNames).toContain('steps');

		// These should NOT appear as top-level refs
		expect(iface.refs.headline).toBeUndefined();
		expect(iface.refs.ingredients).toBeUndefined();
		expect(iface.refs.steps).toBeUndefined();
	});

	it('returns empty children when all content is in properties and refs', () => {
		const tag = mockRecipeTag();
		const iface = extractComponentInterface(tag);

		expect(iface.children).toEqual([]);
	});

	it('a component override receives correct props and slots for a simple hint rune', () => {
		const tag = makeTag('div', { 'data-rune': 'hint', class: 'rf-hint rf-hint--warning' }, [
			makeTag('meta', { 'data-field': 'hint-type', content: 'warning' }),
			makeTag('p', {}, ['Be careful with this API.']),
			makeTag('p', {}, ['It may change in future versions.']),
		]);

		const iface = extractComponentInterface(tag);

		expect(iface.properties).toEqual({ hintType: 'warning' });
		expect(iface.refs).toEqual({});
		expect(iface.children).toHaveLength(2);
		expect((iface.children[0] as SerializedTag).name).toBe('p');
		expect((iface.children[1] as SerializedTag).name).toBe('p');
	});

	it('the tag prop is preserved for backwards compatibility', () => {
		const tag = mockRecipeTag();
		const iface = extractComponentInterface(tag);

		// The original tag should still be passed as-is to the component
		// (extraction is non-destructive — it reads from the tag, doesn't modify it)
		expect(tag.attributes['data-rune']).toBe('recipe');
		expect(tag.children).toHaveLength(6); // 4 meta + media + content
	});
});
