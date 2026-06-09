import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;
const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: { Card: { block: 'card' } },
};

describe('SPEC-086 universal elevation attribute', () => {
	it('emits data-elevation from the elevation attribute, no BEM class', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'card', elevation: 'md' }, []);
		const result = asTag(transform(tag));
		expect(result.attributes['data-elevation']).toBe('md');
		expect(result.attributes.class).toBe('rf-card'); // no rf-card--md
	});

	it('emits data-elevation="none" so a default shadow can be flattened', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'card', elevation: 'none' }, []);
		expect(asTag(transform(tag)).attributes['data-elevation']).toBe('none');
	});

	it('emits no data-elevation when the attribute is absent', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'card' }, []);
		expect(asTag(transform(tag)).attributes['data-elevation']).toBeUndefined();
	});
});
