import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

function baseConfig(runes: ThemeConfig['runes']): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes };
}

function findByDataName(node: SerializedTag, name: string): SerializedTag | undefined {
	for (const child of node.children) {
		if (typeof child !== 'object' || child === null) continue;
		const tag = child as SerializedTag;
		if (tag.attributes?.['data-name'] === name) return tag;
	}
	return undefined;
}

describe('repeated elements', () => {
	it('generates count copies of template element', () => {
		const config = baseConfig({
			Rating: {
				block: 'rating',
				modifiers: {
					total: { source: 'meta', noBemClass: true, default: '5' },
				},
				structure: {
					stars: {
						tag: 'div',
						repeat: {
							count: 'total',
							element: { tag: 'span', ref: 'star' },
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'rating' }, []);

		const result = asTag(transform(tag));
		const stars = findByDataName(result, 'stars');
		expect(stars).toBeDefined();
		expect(stars!.children).toHaveLength(5);
		for (const child of stars!.children) {
			expect((child as SerializedTag).attributes['data-name']).toBe('star');
		}
	});

	it('filled/unfilled split with filled modifier', () => {
		const config = baseConfig({
			Testimonial: {
				block: 'testimonial',
				modifiers: {
					rating: { source: 'meta', noBemClass: true },
					ratingTotal: { source: 'meta', noBemClass: true, default: '5' },
				},
				structure: {
					stars: {
						tag: 'div',
						repeat: {
							count: 'ratingTotal',
							filled: 'rating',
							element: { tag: 'span', ref: 'star' },
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'testimonial' }, [
			makeTag('meta', { 'data-field': 'rating', content: '3' }, []),
		]);

		const result = asTag(transform(tag));
		const stars = findByDataName(result, 'stars');
		expect(stars).toBeDefined();
		expect(stars!.children).toHaveLength(5);

		const filledCount = stars!.children.filter(
			(c: any) => c.attributes['data-filled'] === 'true'
		).length;
		const unfilledCount = stars!.children.filter(
			(c: any) => c.attributes['data-filled'] === 'false'
		).length;
		expect(filledCount).toBe(3);
		expect(unfilledCount).toBe(2);
	});

	it('max cap prevents runaway generation', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				modifiers: {
					count: { source: 'meta', noBemClass: true },
				},
				structure: {
					dots: {
						tag: 'div',
						repeat: {
							count: 'count',
							max: 5,
							element: { tag: 'span', ref: 'dot' },
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'test' }, [
			makeTag('meta', { 'data-field': 'count', content: '100' }, []),
		]);

		const result = asTag(transform(tag));
		const dots = findByDataName(result, 'dots');
		expect(dots!.children).toHaveLength(5);
	});

	it('default max is 10', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				modifiers: {
					count: { source: 'meta', noBemClass: true },
				},
				structure: {
					items: {
						tag: 'div',
						repeat: {
							count: 'count',
							element: { tag: 'span', ref: 'item' },
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'test' }, [
			makeTag('meta', { 'data-field': 'count', content: '50' }, []),
		]);

		const result = asTag(transform(tag));
		const items = findByDataName(result, 'items');
		expect(items!.children).toHaveLength(10);
	});

	it('non-numeric count produces zero elements', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				modifiers: {
					count: { source: 'meta', noBemClass: true },
				},
				structure: {
					items: {
						tag: 'div',
						repeat: {
							count: 'count',
							element: { tag: 'span', ref: 'item' },
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'test' }, [
			makeTag('meta', { 'data-field': 'count', content: 'abc' }, []),
		]);

		const result = asTag(transform(tag));
		const items = findByDataName(result, 'items');
		expect(items!.children).toHaveLength(0);
	});

	it('missing count modifier produces zero elements', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				structure: {
					items: {
						tag: 'div',
						repeat: {
							count: 'total',
							element: { tag: 'span', ref: 'item' },
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'test' }, []);

		const result = asTag(transform(tag));
		const items = findByDataName(result, 'items');
		expect(items!.children).toHaveLength(0);
	});

	it('zero count produces zero elements', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				modifiers: { count: { source: 'meta', noBemClass: true } },
				structure: {
					items: {
						tag: 'div',
						repeat: {
							count: 'count',
							element: { tag: 'span', ref: 'item' },
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'test' }, [
			makeTag('meta', { 'data-field': 'count', content: '0' }, []),
		]);

		const result = asTag(transform(tag));
		const items = findByDataName(result, 'items');
		expect(items!.children).toHaveLength(0);
	});

	it('filledElement template used for filled items', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				modifiers: {
					total: { source: 'meta', noBemClass: true, default: '3' },
					filled: { source: 'meta', noBemClass: true, default: '2' },
				},
				structure: {
					items: {
						tag: 'div',
						repeat: {
							count: 'total',
							filled: 'filled',
							element: { tag: 'span', ref: 'empty-star' },
							filledElement: { tag: 'span', ref: 'full-star' },
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'test' }, []);

		const result = asTag(transform(tag));
		const items = findByDataName(result, 'items');
		expect(items!.children).toHaveLength(3);

		const names = items!.children.map((c: any) => c.attributes['data-name']);
		expect(names).toEqual(['full-star', 'full-star', 'empty-star']);
	});
});
