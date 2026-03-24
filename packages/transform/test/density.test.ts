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

describe('density dimension', () => {
	it('emits data-density="full" by default when no defaultDensity is set', () => {
		const config = baseConfig({
			Hint: { block: 'hint' },
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes['data-density']).toBe('full');
	});

	it('emits data-density from config defaultDensity', () => {
		const config = baseConfig({
			Hint: { block: 'hint', defaultDensity: 'compact' },
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes['data-density']).toBe('compact');
	});

	it('author density attribute overrides config default', () => {
		const config = baseConfig({
			Hint: { block: 'hint', defaultDensity: 'full' },
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint', density: 'minimal' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes['data-density']).toBe('minimal');
	});

	it('strips density attribute from output (consumed)', () => {
		const config = baseConfig({
			Hint: { block: 'hint' },
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint', density: 'compact' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes.density).toBeUndefined();
		expect(result.attributes['data-density']).toBe('compact');
	});

	it('context inside Grid parent sets density to compact', () => {
		const config = baseConfig({
			Grid: { block: 'grid' },
			Hint: { block: 'hint', defaultDensity: 'full' },
		});
		const transform = createTransform(config);

		// Hint nested inside Grid
		const hint = makeTag('section', { 'data-rune': 'hint' }, []);
		const grid = makeTag('div', { 'data-rune': 'grid' }, [hint]);

		const result = asTag(transform(grid));
		// Find the nested hint
		const nestedHint = result.children.find(
			(c: any) => c?.attributes?.['data-rune'] === 'hint'
		) as SerializedTag;
		expect(nestedHint).toBeDefined();
		expect(nestedHint.attributes['data-density']).toBe('compact');
	});

	it('context inside Backlog parent sets density to minimal', () => {
		const config = baseConfig({
			Backlog: { block: 'backlog' },
			Work: { block: 'work', defaultDensity: 'full' },
		});
		const transform = createTransform(config);

		const work = makeTag('section', { 'data-rune': 'work' }, []);
		const backlog = makeTag('div', { 'data-rune': 'backlog' }, [work]);

		const result = asTag(transform(backlog));
		const nestedWork = result.children.find(
			(c: any) => c?.attributes?.['data-rune'] === 'work'
		) as SerializedTag;
		expect(nestedWork).toBeDefined();
		expect(nestedWork.attributes['data-density']).toBe('minimal');
	});

	it('author override takes precedence over context', () => {
		const config = baseConfig({
			Grid: { block: 'grid' },
			Hint: { block: 'hint', defaultDensity: 'full' },
		});
		const transform = createTransform(config);

		// Hint with explicit density inside Grid
		const hint = makeTag('section', { 'data-rune': 'hint', density: 'full' }, []);
		const grid = makeTag('div', { 'data-rune': 'grid' }, [hint]);

		const result = asTag(transform(grid));
		const nestedHint = result.children.find(
			(c: any) => c?.attributes?.['data-rune'] === 'hint'
		) as SerializedTag;
		expect(nestedHint.attributes['data-density']).toBe('full');
	});

	it('non-container parent does not override density', () => {
		const config = baseConfig({
			Hint: { block: 'hint', defaultDensity: 'compact' },
			Details: { block: 'details' },
		});
		const transform = createTransform(config);

		// Hint inside Details (not a compact/minimal context)
		const hint = makeTag('section', { 'data-rune': 'hint' }, []);
		const details = makeTag('div', { 'data-rune': 'details' }, [hint]);

		const result = asTag(transform(details));
		const nestedHint = result.children.find(
			(c: any) => c?.attributes?.['data-rune'] === 'hint'
		) as SerializedTag;
		expect(nestedHint.attributes['data-density']).toBe('compact');
	});
});
