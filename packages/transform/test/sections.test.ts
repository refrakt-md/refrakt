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

/** Find a child element by data-name */
function findByName(node: SerializedTag, name: string): SerializedTag | undefined {
	for (const child of node.children) {
		if (typeof child === 'object' && child !== null && '$$mdtype' in child) {
			const tag = child as SerializedTag;
			if (tag.attributes?.['data-name'] === name) return tag;
			const found = findByName(tag, name);
			if (found) return found;
		}
	}
	return undefined;
}

describe('section anatomy', () => {
	it('emits data-section on structure elements matching sections map', () => {
		const config = baseConfig({
			Hint: {
				block: 'hint',
				modifiers: { hintType: { source: 'meta', default: 'note' } },
				sections: { header: 'header' },
				structure: {
					header: {
						tag: 'div', before: true,
						children: [
							{ tag: 'span', ref: 'title', metaText: 'hintType' },
						],
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, []);

		const result = asTag(transform(tag));
		const header = findByName(result, 'header');
		expect(header).toBeDefined();
		expect(header!.attributes['data-section']).toBe('header');
	});

	it('emits data-section on content wrapper when mapped', () => {
		const config = baseConfig({
			Api: {
				block: 'api',
				sections: { body: 'body' },
				contentWrapper: { tag: 'div', ref: 'body' },
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'api' }, [
			'Some content',
		]);

		const result = asTag(transform(tag));
		const body = findByName(result, 'body');
		expect(body).toBeDefined();
		expect(body!.attributes['data-section']).toBe('body');
	});

	it('does not emit data-section when no sections map is defined', () => {
		const config = baseConfig({
			Hint: {
				block: 'hint',
				structure: {
					header: {
						tag: 'div', before: true,
						children: [],
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, []);

		const result = asTag(transform(tag));
		const header = findByName(result, 'header');
		expect(header).toBeDefined();
		expect(header!.attributes['data-section']).toBeUndefined();
	});

	it('does not emit data-section on refs not in the sections map', () => {
		const config = baseConfig({
			Hint: {
				block: 'hint',
				sections: { header: 'header' },
				structure: {
					header: {
						tag: 'div', before: true,
						children: [
							{ tag: 'span', ref: 'icon' },
						],
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, []);

		const result = asTag(transform(tag));
		const icon = findByName(result, 'icon');
		expect(icon).toBeDefined();
		expect(icon!.attributes['data-section']).toBeUndefined();
	});

	it('preserves existing BEM classes alongside data-section', () => {
		const config = baseConfig({
			Work: {
				block: 'work',
				sections: { header: 'header', body: 'body' },
				contentWrapper: { tag: 'div', ref: 'body' },
				structure: {
					header: { tag: 'div', before: true, children: [] },
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'work' }, ['content']);

		const result = asTag(transform(tag));
		const header = findByName(result, 'header');
		expect(header!.attributes.class).toContain('rf-work__header');
		expect(header!.attributes['data-section']).toBe('header');
		expect(header!.attributes['data-name']).toBe('header');

		const body = findByName(result, 'body');
		expect(body!.attributes.class).toContain('rf-work__body');
		expect(body!.attributes['data-section']).toBe('body');
	});

	it('emits data-section on autoLabel children', () => {
		const config = baseConfig({
			Accordion: {
				block: 'accordion',
				sections: { headline: 'title', blurb: 'description' },
				autoLabel: { headline: 'headline', blurb: 'blurb' },
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'accordion' }, [
			makeTag('headline', {}, ['My Title']),
			makeTag('blurb', {}, ['My Description']),
		]);

		const result = asTag(transform(tag));
		const headline = findByName(result, 'headline');
		expect(headline).toBeDefined();
		expect(headline!.attributes['data-section']).toBe('title');

		const blurb = findByName(result, 'blurb');
		expect(blurb).toBeDefined();
		expect(blurb!.attributes['data-section']).toBe('description');
	});
});
