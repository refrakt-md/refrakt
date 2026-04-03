import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { mergeThemeConfig } from '../src/merge.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

function baseConfig(runes: ThemeConfig['runes']): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes };
}

describe('value mapping (valueMap)', () => {
	it('maps modifier value through valueMap', () => {
		const config = baseConfig({
			Beat: {
				block: 'beat',
				modifiers: {
					status: {
						source: 'meta',
						default: 'planned',
						valueMap: {
							complete: 'checked',
							active: 'active',
							planned: 'unchecked',
							abandoned: 'skipped',
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'beat' }, [
			makeTag('meta', { 'data-field': 'status', content: 'complete' }, []),
		]);

		const result = asTag(transform(tag));
		// Mapped value replaces original in data attribute
		expect(result.attributes['data-status']).toBe('checked');
	});

	it('unmapped values pass through unchanged', () => {
		const config = baseConfig({
			Beat: {
				block: 'beat',
				modifiers: {
					status: {
						source: 'meta',
						valueMap: { complete: 'checked' },
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'beat' }, [
			makeTag('meta', { 'data-field': 'status', content: 'unknown-value' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes['data-status']).toBe('unknown-value');
	});

	it('uses default value with valueMap', () => {
		const config = baseConfig({
			Beat: {
				block: 'beat',
				modifiers: {
					status: {
						source: 'meta',
						default: 'planned',
						valueMap: { planned: 'unchecked' },
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'beat' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes['data-status']).toBe('unchecked');
	});

	it('BEM class uses raw value, not mapped value', () => {
		const config = baseConfig({
			Beat: {
				block: 'beat',
				modifiers: {
					status: {
						source: 'meta',
						valueMap: { complete: 'checked' },
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'beat' }, [
			makeTag('meta', { 'data-field': 'status', content: 'complete' }, []),
		]);

		const result = asTag(transform(tag));
		// BEM class should use the raw value (for CSS targeting by domain concept)
		expect(result.attributes.class).toContain('rf-beat--complete');
		expect(result.attributes.class).not.toContain('rf-beat--checked');
	});
});

describe('value mapping with mapTarget', () => {
	it('emits mapped value on target attribute and raw value on original', () => {
		const config = baseConfig({
			Beat: {
				block: 'beat',
				modifiers: {
					status: {
						source: 'meta',
						default: 'planned',
						valueMap: {
							complete: 'checked',
							active: 'active',
							planned: 'unchecked',
							abandoned: 'skipped',
						},
						mapTarget: 'data-checked',
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'beat' }, [
			makeTag('meta', { 'data-field': 'status', content: 'complete' }, []),
		]);

		const result = asTag(transform(tag));
		// Original attribute retains raw value
		expect(result.attributes['data-status']).toBe('complete');
		// Mapped value goes to target attribute
		expect(result.attributes['data-checked']).toBe('checked');
	});

	it('mapTarget with unmapped value passes through to target', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				modifiers: {
					status: {
						source: 'meta',
						valueMap: { yes: 'true' },
						mapTarget: 'data-active',
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'test' }, [
			makeTag('meta', { 'data-field': 'status', content: 'no' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes['data-status']).toBe('no');
		expect(result.attributes['data-active']).toBe('no');
	});

	it('mapTarget without data- prefix gets data- added', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				modifiers: {
					status: {
						source: 'meta',
						valueMap: { on: 'true' },
						mapTarget: 'checked',
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'test' }, [
			makeTag('meta', { 'data-field': 'status', content: 'on' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes['data-checked']).toBe('true');
	});
});

describe('mergeThemeConfig with valueMap', () => {
	it('theme modifiers with valueMap replace base modifiers', () => {
		const base: ThemeConfig = baseConfig({
			Beat: {
				block: 'beat',
				modifiers: {
					status: { source: 'meta' as const, default: 'planned' },
				},
			},
		});
		const merged = mergeThemeConfig(base, {
			runes: {
				Beat: {
					modifiers: {
						status: {
							source: 'meta' as const,
							default: 'planned',
							valueMap: { complete: 'done' },
						},
					},
				},
			},
		});
		expect(merged.runes.Beat.modifiers!.status.valueMap).toEqual({ complete: 'done' });
	});
});
