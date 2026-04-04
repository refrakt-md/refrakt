import { describe, it, expect } from 'vitest';
import { extractComponentInterface, makeTag, fromKebabCase } from '../src/helpers.js';

describe('fromKebabCase', () => {
	it('converts kebab-case to camelCase', () => {
		expect(fromKebabCase('prep-time')).toBe('prepTime');
		expect(fromKebabCase('cook-time')).toBe('cookTime');
		expect(fromKebabCase('difficulty')).toBe('difficulty');
		expect(fromKebabCase('schema-org-type')).toBe('schemaOrgType');
	});

	it('returns single-word strings unchanged', () => {
		expect(fromKebabCase('name')).toBe('name');
	});
});

describe('extractComponentInterface', () => {
	it('extracts properties from meta children with data-field', () => {
		const tag = makeTag('article', { 'data-rune': 'recipe' }, [
			makeTag('meta', { 'data-field': 'prep-time', content: '15 min' }),
			makeTag('meta', { 'data-field': 'difficulty', content: 'easy' }),
		]);

		const result = extractComponentInterface(tag);

		expect(result.properties).toEqual({
			prepTime: '15 min',
			difficulty: 'easy',
		});
		expect(result.refs).toEqual({});
		expect(result.children).toEqual([]);
	});

	it('extracts top-level refs from children with data-name', () => {
		const ingredients = makeTag('ul', { 'data-name': 'ingredients' }, [
			makeTag('li', {}, ['flour']),
			makeTag('li', {}, ['sugar']),
		]);
		const steps = makeTag('ol', { 'data-name': 'steps' }, [
			makeTag('li', {}, ['mix']),
		]);

		const tag = makeTag('article', { 'data-rune': 'recipe' }, [
			ingredients,
			steps,
		]);

		const result = extractComponentInterface(tag);

		expect(result.properties).toEqual({});
		expect(Object.keys(result.refs)).toEqual(['ingredients', 'steps']);
		expect(result.refs.ingredients).toEqual([ingredients]);
		expect(result.refs.steps).toEqual([steps]);
		expect(result.children).toEqual([]);
	});

	it('groups multiple children with the same data-name', () => {
		const item1 = makeTag('div', { 'data-name': 'item' }, ['first']);
		const item2 = makeTag('div', { 'data-name': 'item' }, ['second']);

		const tag = makeTag('section', {}, [item1, item2]);
		const result = extractComponentInterface(tag);

		expect(result.refs.item).toEqual([item1, item2]);
	});

	it('returns remaining children as anonymous content', () => {
		const tag = makeTag('article', { 'data-rune': 'hint' }, [
			makeTag('meta', { 'data-field': 'hint-type', content: 'warning' }),
			'Some text content',
			makeTag('p', {}, ['A paragraph']),
		]);

		const result = extractComponentInterface(tag);

		expect(result.properties).toEqual({ hintType: 'warning' });
		expect(result.children).toHaveLength(2);
		expect(result.children[0]).toBe('Some text content');
	});

	it('does NOT extract nested refs — they stay inside their parent', () => {
		const nested = makeTag('span', { 'data-name': 'label' }, ['Label text']);
		const detail = makeTag('div', { 'data-name': 'detail' }, [
			nested,
			makeTag('span', { 'data-name': 'value' }, ['42']),
		]);

		const tag = makeTag('article', { 'data-rune': 'event' }, [detail]);
		const result = extractComponentInterface(tag);

		// Only the top-level 'detail' ref is extracted
		expect(Object.keys(result.refs)).toEqual(['detail']);
		expect(result.refs.detail).toEqual([detail]);
		// Nested 'label' and 'value' are still inside the detail tag
		expect(result.refs.detail[0].children).toHaveLength(2);
		expect((result.refs.detail[0].children[0] as any).attributes['data-name']).toBe('label');
	});

	it('handles empty tag with no children', () => {
		const tag = makeTag('div', {}, []);
		const result = extractComponentInterface(tag);

		expect(result.properties).toEqual({});
		expect(result.refs).toEqual({});
		expect(result.children).toEqual([]);
	});

	it('handles mixed children: properties, refs, and anonymous content', () => {
		const meta1 = makeTag('meta', { 'data-field': 'prep-time', content: '10 min' });
		const meta2 = makeTag('meta', { 'data-field': 'cook-time', content: '30 min' });
		const headline = makeTag('header', { 'data-name': 'headline' }, ['My Recipe']);
		const media = makeTag('div', { 'data-name': 'media' }, [
			makeTag('img', { src: 'photo.jpg' }),
		]);
		const textNode = 'Some body text';
		const paragraph = makeTag('p', {}, ['More content']);

		const tag = makeTag('article', { 'data-rune': 'recipe' }, [
			meta1,
			meta2,
			headline,
			media,
			textNode,
			paragraph,
		]);

		const result = extractComponentInterface(tag);

		expect(result.properties).toEqual({ prepTime: '10 min', cookTime: '30 min' });
		expect(Object.keys(result.refs).sort()).toEqual(['headline', 'media']);
		expect(result.children).toEqual([textNode, paragraph]);
	});

	it('handles meta tags without data-field as anonymous content', () => {
		// A meta tag that is not a property (e.g., an HTML meta tag without data-field)
		const plainMeta = makeTag('meta', { charset: 'utf-8' });
		const propertyMeta = makeTag('meta', { 'data-field': 'type', content: 'info' });

		const tag = makeTag('div', {}, [plainMeta, propertyMeta]);
		const result = extractComponentInterface(tag);

		expect(result.properties).toEqual({ type: 'info' });
		expect(result.children).toEqual([plainMeta]);
	});

	it('defaults missing content attribute to empty string', () => {
		const tag = makeTag('div', {}, [
			makeTag('meta', { 'data-field': 'empty-prop' }),
		]);

		const result = extractComponentInterface(tag);
		expect(result.properties).toEqual({ emptyProp: '' });
	});
});
