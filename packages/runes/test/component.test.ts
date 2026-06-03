import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable } from '../src/lib/component.js';
import { RenderableNodeCursor } from '../src/lib/renderable.js';

describe('createComponentRenderable', () => {
	describe('property/ref uniqueness validation', () => {
		it('throws when a key appears in both properties and refs', () => {
			const meta = new Tag('meta', { content: 'value' });
			const div = new Tag('div', {}, ['content']);

			expect(() => createComponentRenderable({
				rune: 'test-rune',
				tag: 'article',
				properties: { headline: meta },
				refs: { headline: div },
				children: [],
			})).toThrow('Rune "test-rune" has naming collisions between properties and refs: headline');
		});

		it('includes all colliding keys in the error message', () => {
			const meta1 = new Tag('meta', { content: 'a' });
			const meta2 = new Tag('meta', { content: 'b' });
			const div1 = new Tag('div', {}, ['x']);
			const div2 = new Tag('div', {}, ['y']);

			expect(() => createComponentRenderable({
				rune: 'my-rune',
				tag: 'section',
				properties: { foo: meta1, bar: meta2 },
				refs: { foo: div1, bar: div2 },
				children: [],
			})).toThrow(/foo, bar/);
		});

		it('does not throw when properties and refs have no overlap', () => {
			const meta = new Tag('meta', { content: '15 min' });
			const list = new Tag('ul', {}, [new Tag('li', {}, ['item'])]);

			expect(() => createComponentRenderable({
				rune: 'recipe',
				tag: 'article',
				properties: { prepTime: meta },
				refs: { ingredients: list },
				children: [],
			})).not.toThrow();
		});

		it('does not throw when only properties are provided', () => {
			const meta = new Tag('meta', { content: 'info' });

			expect(() => createComponentRenderable({
				rune: 'hint',
				tag: 'div',
				properties: { hintType: meta },
				children: [],
			})).not.toThrow();
		});

		it('does not throw when only refs are provided', () => {
			const div = new Tag('div', {}, ['content']);

			expect(() => createComponentRenderable({
				rune: 'simple',
				tag: 'div',
				refs: { body: div },
				children: [],
			})).not.toThrow();
		});

		it('does not throw when both are empty', () => {
			expect(() => createComponentRenderable({
				rune: 'empty',
				tag: 'div',
				properties: {},
				refs: {},
				children: [],
			})).not.toThrow();
		});
	});

	describe('basic functionality', () => {
		it('sets data-rune attribute on the root tag', () => {
			const result = createComponentRenderable({
				rune: 'hint',
				tag: 'div',
				children: ['content'],
			});

			expect(result.attributes['data-rune']).toBe('hint');
		});

		it('sets data-field on property tags', () => {
			const meta = new Tag('meta', { content: '15 min' });

			createComponentRenderable({
				rune: 'recipe',
				tag: 'article',
				properties: { prepTime: meta },
				children: [],
			});

			expect(meta.attributes['data-field']).toBe('prep-time');
		});

		it('sets data-name on ref tags', () => {
			const list = new Tag('ul', {}, ['items']);

			createComponentRenderable({
				rune: 'recipe',
				tag: 'article',
				refs: { ingredients: list },
				children: [],
			});

			expect(list.attributes['data-name']).toBe('ingredients');
		});
	});

	describe('SPEC-082 fields channel (dual-emit)', () => {
		it('projects scalar properties into data-rune-fields AND the legacy metas', () => {
			const method = new Tag('meta', { content: 'GET' });
			const ratingTotal = new Tag('meta', { content: 5 }); // typed number

			const result = createComponentRenderable({
				rune: 'api',
				tag: 'article',
				properties: { method, ratingTotal },
				children: [method, ratingTotal],
			});

			// Legacy channel — data-field (kebab) still set on the metas.
			expect(method.attributes['data-field']).toBe('method');
			expect(ratingTotal.attributes['data-field']).toBe('rating-total');

			// New channel — parsed fields bag: camelCase keys (matching modifier
			// names), values typed (number stays a number).
			const fields = JSON.parse(result.attributes['data-rune-fields'] as string);
			expect(fields).toEqual({ method: 'GET', ratingTotal: 5 });
			expect(typeof fields.ratingTotal).toBe('number');
		});

		it('excludes non-meta content-marker properties from the fields bag', () => {
			const currency = new Tag('meta', { content: 'USD' });
			const categories = new Tag('div', {}, ['…']); // content node, not a <meta>

			const result = createComponentRenderable({
				rune: 'budget',
				tag: 'section',
				properties: { currency, category: categories },
				children: [currency, categories],
			});

			// The content-marker property still gets data-field…
			expect(categories.attributes['data-field']).toBe('category');
			// …but is not a scalar field value.
			const fields = JSON.parse(result.attributes['data-rune-fields'] as string);
			expect(fields).toEqual({ currency: 'USD' });
		});

		it('omits data-rune-fields entirely when there are no scalar properties', () => {
			const body = new Tag('div', {}, ['x']);

			const result = createComponentRenderable({
				rune: 'simple',
				tag: 'div',
				refs: { body },
				children: [body],
			});

			expect(result.attributes['data-rune-fields']).toBeUndefined();
		});
	});
});
