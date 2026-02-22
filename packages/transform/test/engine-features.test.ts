import { describe, it, expect, vi } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

describe('styles', () => {
	it('simple form: maps modifier value to CSS custom property', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Storyboard: {
					block: 'storyboard',
					modifiers: { columns: { source: 'meta' } },
					styles: { columns: '--sb-columns' },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Storyboard' }, [
			makeTag('meta', { property: 'columns', content: '4' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes.style).toBe('--sb-columns: 4');
	});

	it('template form: interpolates modifier value into CSS property', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Bento: {
					block: 'bento',
					modifiers: { columns: { source: 'meta', default: '3' } },
					styles: { columns: { prop: 'grid-template-columns', template: 'repeat({}, 1fr)' } },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Bento' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes.style).toBe('grid-template-columns: repeat(3, 1fr)');
	});

	it('multiple style entries produce semicolon-separated inline style', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Bento: {
					block: 'bento',
					modifiers: {
						columns: { source: 'meta', default: '3' },
						gap: { source: 'meta' },
					},
					styles: {
						columns: '--bento-columns',
						gap: '--bento-gap',
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Bento' }, [
			makeTag('meta', { property: 'gap', content: '1.5rem' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes.style).toContain('--bento-columns: 3');
		expect(result.attributes.style).toContain('--bento-gap: 1.5rem');
	});

	it('skips style entry when modifier has no value', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					modifiers: { gap: { source: 'meta' } },
					styles: { gap: '--test-gap' },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes.style).toBeUndefined();
	});

	it('preserves existing inline style on the tag', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					modifiers: { columns: { source: 'meta' } },
					styles: { columns: '--cols' },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test', style: 'color: red' }, [
			makeTag('meta', { property: 'columns', content: '2' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes.style).toBe('color: red; --cols: 2');
	});
});

describe('staticModifiers', () => {
	it('adds static modifier classes unconditionally', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				FeaturedTier: {
					block: 'tier',
					staticModifiers: ['featured'],
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('li', { typeof: 'FeaturedTier' }, ['Content']);

		const result = asTag(transform(tag));
		expect(result.attributes.class).toContain('rf-tier');
		expect(result.attributes.class).toContain('rf-tier--featured');
	});

	it('combines with regular modifiers', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Card: {
					block: 'card',
					modifiers: { variant: { source: 'meta' } },
					staticModifiers: ['interactive'],
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('div', { typeof: 'Card' }, [
			makeTag('meta', { property: 'variant', content: 'hero' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes.class).toContain('rf-card');
		expect(result.attributes.class).toContain('rf-card--hero');
		expect(result.attributes.class).toContain('rf-card--interactive');
	});

	it('multiple static modifiers all applied', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Widget: {
					block: 'widget',
					staticModifiers: ['enhanced', 'bordered'],
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('div', { typeof: 'Widget' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes.class).toContain('rf-widget--enhanced');
		expect(result.attributes.class).toContain('rf-widget--bordered');
	});
});

describe('postTransform', () => {
	it('receives transformed node and modifiers, returns modified node', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Grid: {
					block: 'grid',
					modifiers: { columns: { source: 'meta', default: '3' } },
					postTransform(node, ctx) {
						return {
							...node,
							attributes: {
								...node.attributes,
								'data-custom': `cols-${ctx.modifiers.columns}`,
							},
						};
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Grid' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes['data-custom']).toBe('cols-3');
		// Should still have normal BEM classes
		expect(result.attributes.class).toContain('rf-grid');
	});

	it('receives parentType in context when nested', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hero: { block: 'hero' },
				Child: {
					block: 'child',
					postTransform(node, ctx) {
						return {
							...node,
							attributes: {
								...node.attributes,
								'data-parent': ctx.parentType || 'none',
							},
						};
					},
				},
			},
		};
		const transform = createTransform(config);
		const hero = makeTag('section', { typeof: 'Hero' }, [
			makeTag('div', { typeof: 'Child' }, ['Nested']),
		]);

		const result = asTag(transform(hero));
		const child = result.children.find(
			(c: any) => c?.attributes?.typeof === 'Child'
		) as SerializedTag;
		expect(child.attributes['data-parent']).toBe('Hero');
	});

	it('runs after all declarative processing', () => {
		const spy = vi.fn((node: SerializedTag) => node);
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					modifiers: { variant: { source: 'meta' } },
					postTransform: spy,
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, [
			makeTag('meta', { property: 'variant', content: 'primary' }, []),
		]);

		transform(tag);
		expect(spy).toHaveBeenCalledOnce();

		// The node passed to postTransform should already have BEM classes applied
		const [node, ctx] = spy.mock.calls[0];
		expect(node.attributes.class).toContain('rf-test');
		expect(node.attributes.class).toContain('rf-test--primary');
		expect(node.attributes['data-rune']).toBe('test');
		expect(ctx.modifiers.variant).toBe('primary');
	});

	it('does not run when not defined', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Simple: { block: 'simple' },
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Simple' }, ['Content']);

		const result = asTag(transform(tag));
		expect(result.attributes.class).toBe('rf-simple');
	});
});
