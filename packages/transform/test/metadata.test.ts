import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

function findByDataName(node: SerializedTag, name: string): SerializedTag | undefined {
	for (const child of node.children) {
		if (typeof child !== 'object' || child === null || Array.isArray(child)) continue;
		const tag = child as SerializedTag;
		if (tag.attributes?.['data-name'] === name) return tag;
		if (tag.children?.length) {
			const found = findByDataName(tag, name);
			if (found) return found;
		}
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Metadata dimension attributes on structure entries
// ---------------------------------------------------------------------------
describe('metadata dimensions', () => {
	it('emits data-meta-type on a structure entry with metaType', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Recipe: {
					block: 'recipe',
					modifiers: { difficulty: { source: 'meta' } },
					structure: {
						difficulty: {
							tag: 'span',
							metaText: 'difficulty',
							metaType: 'category',
						},
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'recipe' }, [
			makeTag('meta', { 'data-field': 'difficulty', content: 'easy' }, []),
		]);

		const result = asTag(transform(tag));
		const badge = findByDataName(result, 'difficulty');
		expect(badge).toBeDefined();
		expect(badge!.attributes['data-meta-type']).toBe('category');
		// No sentiment map defined, so no sentiment attribute
		expect(badge!.attributes['data-meta-sentiment']).toBeUndefined();
	});

	it('emits data-meta-rank on a structure entry with metaRank', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Recipe: {
					block: 'recipe',
					modifiers: { servings: { source: 'meta' } },
					structure: {
						servings: {
							tag: 'span',
							metaText: 'servings',
							metaType: 'quantity',
							metaRank: 'secondary',
						},
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'recipe' }, [
			makeTag('meta', { 'data-field': 'servings', content: '4' }, []),
		]);

		const result = asTag(transform(tag));
		const badge = findByDataName(result, 'servings');
		expect(badge).toBeDefined();
		expect(badge!.attributes['data-meta-type']).toBe('quantity');
		expect(badge!.attributes['data-meta-rank']).toBe('secondary');
	});

	it('emits data-meta-sentiment when modifier value matches sentimentMap', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Work: {
					block: 'work',
					modifiers: { status: { source: 'meta' } },
					structure: {
						status: {
							tag: 'span',
							metaText: 'status',
							metaType: 'status',
							metaRank: 'primary',
							sentimentMap: {
								done: 'positive',
								blocked: 'negative',
								'in-progress': 'caution',
								ready: 'neutral',
							},
						},
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'work' }, [
			makeTag('meta', { 'data-field': 'status', content: 'done' }, []),
		]);

		const result = asTag(transform(tag));
		const badge = findByDataName(result, 'status');
		expect(badge).toBeDefined();
		expect(badge!.attributes['data-meta-type']).toBe('status');
		expect(badge!.attributes['data-meta-rank']).toBe('primary');
		expect(badge!.attributes['data-meta-sentiment']).toBe('positive');
	});

	it('does not emit data-meta-sentiment when modifier value is not in sentimentMap', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Work: {
					block: 'work',
					modifiers: { status: { source: 'meta' } },
					structure: {
						status: {
							tag: 'span',
							metaText: 'status',
							metaType: 'status',
							sentimentMap: {
								done: 'positive',
								blocked: 'negative',
							},
						},
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'work' }, [
			makeTag('meta', { 'data-field': 'status', content: 'draft' }, []),
		]);

		const result = asTag(transform(tag));
		const badge = findByDataName(result, 'status');
		expect(badge).toBeDefined();
		expect(badge!.attributes['data-meta-type']).toBe('status');
		expect(badge!.attributes['data-meta-sentiment']).toBeUndefined();
	});

	it('emits temporal metaType correctly', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Recipe: {
					block: 'recipe',
					modifiers: { prepTime: { source: 'meta' } },
					structure: {
						'prep-time': {
							tag: 'span',
							metaText: 'prepTime',
							metaType: 'temporal',
							metaRank: 'primary',
							transform: 'duration',
						},
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'recipe' }, [
			makeTag('meta', { 'data-field': 'prep-time', content: 'PT30M' }, []),
		]);

		const result = asTag(transform(tag));
		const badge = findByDataName(result, 'prep-time');
		expect(badge).toBeDefined();
		expect(badge!.attributes['data-meta-type']).toBe('temporal');
		expect(badge!.attributes['data-meta-rank']).toBe('primary');
		// Text should be transformed by the duration transform
		expect(badge!.children[0]).toBe('30m');
	});

	it('emits tag metaType correctly', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Lore: {
					block: 'lore',
					modifiers: { category: { source: 'meta' } },
					structure: {
						category: {
							tag: 'span',
							metaText: 'category',
							metaType: 'tag',
							metaRank: 'secondary',
						},
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'lore' }, [
			makeTag('meta', { 'data-field': 'category', content: 'mythology' }, []),
		]);

		const result = asTag(transform(tag));
		const badge = findByDataName(result, 'category');
		expect(badge).toBeDefined();
		expect(badge!.attributes['data-meta-type']).toBe('tag');
		expect(badge!.attributes['data-meta-rank']).toBe('secondary');
	});

	it('emits id metaType correctly', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Spec: {
					block: 'spec',
					modifiers: { id: { source: 'meta' } },
					structure: {
						id: {
							tag: 'span',
							metaText: 'id',
							metaType: 'id',
							metaRank: 'secondary',
						},
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'spec' }, [
			makeTag('meta', { 'data-field': 'id', content: 'SPEC-024' }, []),
		]);

		const result = asTag(transform(tag));
		const badge = findByDataName(result, 'id');
		expect(badge).toBeDefined();
		expect(badge!.attributes['data-meta-type']).toBe('id');
		expect(badge!.attributes['data-meta-rank']).toBe('secondary');
		expect(badge!.children[0]).toBe('SPEC-024');
	});

	it('structure entries without metadata fields continue to work unchanged', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: {
					block: 'hint',
					modifiers: { hintType: { source: 'meta', default: 'note' } },
					structure: {
						icon: { tag: 'span', icon: { group: 'hint', variant: 'hintType' } },
						title: { tag: 'span', metaText: 'hintType', transform: 'capitalize' },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, [
			makeTag('meta', { 'data-field': 'hint-type', content: 'warning' }, []),
		]);

		const result = asTag(transform(tag));
		const icon = findByDataName(result, 'icon');
		const title = findByDataName(result, 'title');
		expect(icon).toBeDefined();
		expect(icon!.attributes['data-meta-type']).toBeUndefined();
		expect(title).toBeDefined();
		expect(title!.attributes['data-meta-type']).toBeUndefined();
		expect(title!.children[0]).toBe('Warning');
	});

	it('all four sentiment values work correctly', () => {
		const sentimentMap = {
			done: 'positive' as const,
			blocked: 'negative' as const,
			review: 'caution' as const,
			backlog: 'neutral' as const,
		};
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Task: {
					block: 'task',
					modifiers: { status: { source: 'meta' } },
					structure: {
						status: {
							tag: 'span',
							metaText: 'status',
							metaType: 'status',
							sentimentMap,
						},
					},
				},
			},
		};

		for (const [value, expected] of Object.entries(sentimentMap)) {
			const transform = createTransform(config);
			const tag = makeTag('section', { 'data-rune': 'task' }, [
				makeTag('meta', { 'data-field': 'status', content: value }, []),
			]);
			const result = asTag(transform(tag));
			const badge = findByDataName(result, 'status');
			expect(badge!.attributes['data-meta-sentiment']).toBe(expected);
		}
	});

	it('metadata attributes coexist with existing data attributes and BEM classes', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Api: {
					block: 'api',
					modifiers: { method: { source: 'meta' } },
					structure: {
						method: {
							tag: 'span',
							metaText: 'method',
							metaType: 'category',
							metaRank: 'primary',
							sentimentMap: {
								GET: 'positive',
								DELETE: 'negative',
							},
						},
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'api' }, [
			makeTag('meta', { 'data-field': 'method', content: 'GET' }, []),
		]);

		const result = asTag(transform(tag));
		// Root should still have normal BEM and data attributes
		expect(result.attributes.class).toContain('rf-api');
		expect(result.attributes['data-method']).toBe('GET');

		// Badge should have both metadata and normal attributes
		const badge = findByDataName(result, 'method');
		expect(badge).toBeDefined();
		expect(badge!.attributes['data-meta-type']).toBe('category');
		expect(badge!.attributes['data-meta-rank']).toBe('primary');
		expect(badge!.attributes['data-meta-sentiment']).toBe('positive');
	});
});
