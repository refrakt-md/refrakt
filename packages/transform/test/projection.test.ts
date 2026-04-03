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

function findByDataName(node: SerializedTag, name: string): SerializedTag | undefined {
	for (const child of node.children) {
		if (typeof child !== 'object' || child === null) continue;
		const tag = child as SerializedTag;
		if (tag.attributes?.['data-name'] === name) return tag;
		// Recurse
		const found = findByDataName(tag, name);
		if (found) return found;
	}
	return undefined;
}

function childNames(node: SerializedTag): string[] {
	return node.children
		.filter((c: any) => typeof c === 'object' && c?.attributes?.['data-name'])
		.map((c: any) => c.attributes['data-name']);
}

describe('projection: hide', () => {
	it('removes elements matching hide entries', () => {
		const config = baseConfig({
			Hint: {
				block: 'hint',
				structure: {
					icon: { tag: 'span', before: true },
					badge: { tag: 'span', before: true },
				},
				projection: {
					hide: ['badge'],
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, ['Content']);

		const result = asTag(transform(tag));
		expect(findByDataName(result, 'icon')).toBeDefined();
		expect(findByDataName(result, 'badge')).toBeUndefined();
	});

	it('hides multiple elements', () => {
		const config = baseConfig({
			Work: {
				block: 'work',
				structure: {
					meta: { tag: 'div', before: true },
					description: { tag: 'div' },
					footer: { tag: 'div' },
				},
				projection: {
					hide: ['meta', 'description'],
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('article', { 'data-rune': 'work' }, ['Title']);

		const result = asTag(transform(tag));
		expect(findByDataName(result, 'meta')).toBeUndefined();
		expect(findByDataName(result, 'description')).toBeUndefined();
		expect(findByDataName(result, 'footer')).toBeDefined();
	});
});

describe('projection: group', () => {
	it('collects members into a wrapper', () => {
		const config = baseConfig({
			Hint: {
				block: 'hint',
				structure: {
					icon: { tag: 'span', before: true },
					badge: { tag: 'span', before: true },
					body: { tag: 'div' },
				},
				projection: {
					group: {
						chrome: {
							tag: 'div',
							members: ['icon', 'badge'],
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, ['Content']);

		const result = asTag(transform(tag));
		const chrome = findByDataName(result, 'chrome');
		expect(chrome).toBeDefined();
		expect(chrome!.name).toBe('div');

		// Members should be inside the group
		const memberNames = childNames(chrome!);
		expect(memberNames).toContain('icon');
		expect(memberNames).toContain('badge');

		// Members should NOT be at the root level anymore
		const rootNames = childNames(result);
		expect(rootNames).not.toContain('icon');
		expect(rootNames).not.toContain('badge');
		expect(rootNames).toContain('chrome');
	});

	it('group wrapper gets BEM element class', () => {
		const config = baseConfig({
			Hint: {
				block: 'hint',
				structure: {
					icon: { tag: 'span', before: true },
					badge: { tag: 'span', before: true },
				},
				projection: {
					group: {
						chrome: {
							tag: 'div',
							members: ['icon', 'badge'],
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, ['Content']);

		const result = asTag(transform(tag));
		const chrome = findByDataName(result, 'chrome');
		expect(chrome!.attributes.class).toContain('rf-hint__chrome');
	});

	it('group placed at first collected member position', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				structure: {
					icon: { tag: 'span', before: true },
					title: { tag: 'h2', before: true },
					badge: { tag: 'span', before: true },
				},
				projection: {
					group: {
						header: {
							tag: 'div',
							members: ['icon', 'badge'],
						},
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('article', { 'data-rune': 'card' }, ['Body']);

		const result = asTag(transform(tag));
		const names = childNames(result);
		// header group should be before title since icon was before title
		const headerIdx = names.indexOf('header');
		const titleIdx = names.indexOf('title');
		expect(headerIdx).toBeLessThan(titleIdx);
	});
});

describe('projection: relocate', () => {
	it('moves element into target', () => {
		const config = baseConfig({
			Gallery: {
				block: 'gallery',
				structure: {
					header: { tag: 'div', before: true },
					caption: { tag: 'figcaption' },
				},
				projection: {
					relocate: {
						caption: { into: 'header', position: 'append' },
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('figure', { 'data-rune': 'gallery' }, ['Images']);

		const result = asTag(transform(tag));
		// Caption should be inside header now
		const header = findByDataName(result, 'header');
		expect(header).toBeDefined();
		const captionInHeader = findByDataName(header!, 'caption');
		expect(captionInHeader).toBeDefined();

		// Caption should not be at root level
		const rootNames = childNames(result);
		expect(rootNames).not.toContain('caption');
	});

	it('relocate with prepend position', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				structure: {
					header: { tag: 'div', before: true, children: [
						{ tag: 'h2', ref: 'title' },
					] },
					badge: { tag: 'span' },
				},
				projection: {
					relocate: {
						badge: { into: 'header', position: 'prepend' },
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('article', { 'data-rune': 'card' }, ['Body']);

		const result = asTag(transform(tag));
		const header = findByDataName(result, 'header');
		expect(header).toBeDefined();
		// Badge should be first child of header
		const firstChild = header!.children[0] as SerializedTag;
		expect(firstChild.attributes?.['data-name']).toBe('badge');
	});

	it('invalid data-name reference is a no-op', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				structure: {
					icon: { tag: 'span', before: true },
				},
				projection: {
					relocate: {
						icon: { into: 'nonexistent' },
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'test' }, ['Content']);

		const result = asTag(transform(tag));
		// Icon is extracted but target not found — element is dropped
		expect(findByDataName(result, 'icon')).toBeUndefined();
	});
});

describe('projection: combined operations', () => {
	it('hide + group + relocate in correct order', () => {
		const config = baseConfig({
			Widget: {
				block: 'widget',
				structure: {
					icon: { tag: 'span', before: true },
					badge: { tag: 'span', before: true },
					meta: { tag: 'div', before: true },
					header: { tag: 'div', before: true },
				},
				projection: {
					hide: ['meta'],
					group: {
						chrome: {
							tag: 'div',
							members: ['icon', 'badge'],
						},
					},
					relocate: {
						chrome: { into: 'header', position: 'prepend' },
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('div', { 'data-rune': 'widget' }, ['Content']);

		const result = asTag(transform(tag));

		// meta should be hidden
		expect(findByDataName(result, 'meta')).toBeUndefined();

		// chrome group should be inside header
		const header = findByDataName(result, 'header');
		expect(header).toBeDefined();
		const chrome = findByDataName(header!, 'chrome');
		expect(chrome).toBeDefined();

		// icon and badge inside chrome
		expect(findByDataName(chrome!, 'icon')).toBeDefined();
		expect(findByDataName(chrome!, 'badge')).toBeDefined();
	});

	it('groups can be relocation targets (group runs before relocate)', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				structure: {
					icon: { tag: 'span', before: true },
					badge: { tag: 'span', before: true },
					subtitle: { tag: 'span' },
				},
				projection: {
					group: {
						header: {
							tag: 'div',
							members: ['icon', 'badge'],
						},
					},
					relocate: {
						subtitle: { into: 'header', position: 'append' },
					},
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('article', { 'data-rune': 'card' }, ['Body']);

		const result = asTag(transform(tag));
		const header = findByDataName(result, 'header');
		expect(header).toBeDefined();
		// subtitle should be relocated into the group
		expect(findByDataName(header!, 'subtitle')).toBeDefined();
	});
});

describe('mergeThemeConfig with projection', () => {
	it('theme projection fully replaces base projection', () => {
		const base = baseConfig({
			Card: {
				block: 'card',
				projection: {
					hide: ['meta'],
				},
			},
		});
		const merged = mergeThemeConfig(base, {
			runes: {
				Card: {
					projection: {
						hide: ['footer'],
						group: {
							chrome: { tag: 'div', members: ['icon'] },
						},
					},
				},
			},
		});
		// Theme projection replaces base entirely
		expect(merged.runes.Card.projection!.hide).toEqual(['footer']);
		expect(merged.runes.Card.projection!.group).toBeDefined();
	});
});
