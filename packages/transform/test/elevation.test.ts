import { describe, it, expect, vi } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;
const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: {
		Card: { block: 'card' },
		// a rune with a per-rune default elevation
		Chart: { block: 'chart', defaultElevation: 'sunken' },
	},
};

describe('SPEC-107 elevation depth-ladder axis', () => {
	it('emits a ladder value from the elevation attribute, no BEM class', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'card', elevation: 'raised' }, []);
		const result = asTag(transform(tag));
		expect(result.attributes['data-elevation']).toBe('raised');
		expect(result.attributes.class).toBe('rf-card'); // styled by attribute, no rf-card--raised
	});

	it('passes flush through (the no-surface rung)', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'card', elevation: 'flush' }, []);
		expect(asTag(transform(tag)).attributes['data-elevation']).toBe('flush');
	});

	it('emits no data-elevation when neither attribute nor default is set', () => {
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'card' }, []);
		expect(asTag(transform(tag)).attributes['data-elevation']).toBeUndefined();
	});

	describe('per-rune defaultElevation', () => {
		it('applies the rune default when the author sets no elevation', () => {
			const transform = createTransform(config);
			const tag = makeTag('div', { 'data-rune': 'chart' }, []);
			expect(asTag(transform(tag)).attributes['data-elevation']).toBe('sunken');
		});

		it('lets an author attribute override the default', () => {
			const transform = createTransform(config);
			const tag = makeTag('div', { 'data-rune': 'chart', elevation: 'raised' }, []);
			expect(asTag(transform(tag)).attributes['data-elevation']).toBe('raised');
		});
	});

	describe('deprecated shadow-scale aliases (none/sm/md/lg)', () => {
		const cases: Array<[string, string]> = [
			['none', 'flat'],   // ⚠ keeps the surface — NOT flush
			['sm', 'raised'],
			['md', 'raised'],
			['lg', 'floating'],
		];
		for (const [old, mapped] of cases) {
			it(`maps elevation="${old}" → "${mapped}" with a dev warning`, () => {
				const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
				const transform = createTransform(config);
				const tag = makeTag('div', { 'data-rune': 'card', elevation: old }, []);
				expect(asTag(transform(tag)).attributes['data-elevation']).toBe(mapped);
				expect(warn).toHaveBeenCalledWith(expect.stringContaining(`elevation="${old}" is deprecated`));
				warn.mockRestore();
			});
		}

		it('does not map none to flush (that would wrongly strip the surface)', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const transform = createTransform(config);
			const tag = makeTag('div', { 'data-rune': 'card', elevation: 'none' }, []);
			expect(asTag(transform(tag)).attributes['data-elevation']).not.toBe('flush');
			warn.mockRestore();
		});
	});
});
