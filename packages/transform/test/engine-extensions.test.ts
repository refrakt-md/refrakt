import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

describe('styles config', () => {
	const config: ThemeConfig = {
		prefix: 'rf',
		tokenPrefix: '--rf',
		icons: {},
		runes: {
			Storyboard: {
				block: 'storyboard',
				modifiers: {
					style: { source: 'meta', default: 'clean' },
					columns: { source: 'meta', default: '3' },
				},
				styles: { columns: '--sb-columns' },
			},
		},
	};

	const transform = createTransform(config);

	it('should add inline style from modifier value', () => {
		const tag = makeTag('div', { typeof: 'Storyboard' }, [
			makeTag('meta', { property: 'style', content: 'comic' }, []),
			makeTag('meta', { property: 'columns', content: '4' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes.style).toBe('--sb-columns: 4');
		expect(result.attributes.class).toContain('rf-storyboard');
	});

	it('should use default value when meta is absent', () => {
		const tag = makeTag('div', { typeof: 'Storyboard' }, [
			makeTag('meta', { property: 'style', content: 'clean' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes.style).toBe('--sb-columns: 3');
	});

	it('should not add style when modifier has no value and no default', () => {
		const noDefaultConfig: ThemeConfig = {
			prefix: 'rf',
			tokenPrefix: '--rf',
			icons: {},
			runes: {
				Widget: {
					block: 'widget',
					modifiers: { size: { source: 'meta' } },
					styles: { size: '--widget-size' },
				},
			},
		};

		const t = createTransform(noDefaultConfig);
		const tag = makeTag('div', { typeof: 'Widget' }, []);
		const result = asTag(t(tag));
		expect(result.attributes.style).toBeUndefined();
	});

	it('should append to existing style attribute', () => {
		const tag = makeTag('div', { typeof: 'Storyboard', style: 'color: red' }, [
			makeTag('meta', { property: 'columns', content: '2' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes.style).toBe('color: red; --sb-columns: 2');
	});
});

describe('staticModifiers config', () => {
	const config: ThemeConfig = {
		prefix: 'rf',
		tokenPrefix: '--rf',
		icons: {},
		runes: {
			Tier: { block: 'tier' },
			FeaturedTier: { block: 'tier', staticModifiers: ['featured'] },
		},
	};

	const transform = createTransform(config);

	it('should add static modifier classes unconditionally', () => {
		const tag = makeTag('li', { typeof: 'FeaturedTier' }, [
			'Featured content',
		]);

		const result = asTag(transform(tag));
		expect(result.attributes.class).toContain('rf-tier');
		expect(result.attributes.class).toContain('rf-tier--featured');
	});

	it('should not add static modifiers to rune without them', () => {
		const tag = makeTag('li', { typeof: 'Tier' }, [
			'Regular content',
		]);

		const result = asTag(transform(tag));
		expect(result.attributes.class).toBe('rf-tier');
		expect(result.attributes.class).not.toContain('rf-tier--featured');
	});

	it('should combine with regular modifiers', () => {
		const combinedConfig: ThemeConfig = {
			prefix: 'rf',
			tokenPrefix: '--rf',
			icons: {},
			runes: {
				Card: {
					block: 'card',
					modifiers: { size: { source: 'meta', default: 'medium' } },
					staticModifiers: ['highlighted'],
				},
			},
		};

		const t = createTransform(combinedConfig);
		const tag = makeTag('div', { typeof: 'Card' }, [
			makeTag('meta', { property: 'size', content: 'large' }, []),
		]);

		const result = asTag(t(tag));
		expect(result.attributes.class).toContain('rf-card');
		expect(result.attributes.class).toContain('rf-card--large');
		expect(result.attributes.class).toContain('rf-card--highlighted');
	});
});
