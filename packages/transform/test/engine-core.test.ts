import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

/** Find a tag recursively by typeof */
function findByTypeof(node: any, typeof_: string): SerializedTag | undefined {
	if (!node || typeof node !== 'object') return undefined;
	if (Array.isArray(node)) {
		for (const child of node) {
			const found = findByTypeof(child, typeof_);
			if (found) return found;
		}
		return undefined;
	}
	if (node.$$mdtype === 'Tag') {
		if (node.attributes?.typeof === typeof_) return node;
		for (const child of node.children ?? []) {
			const found = findByTypeof(child, typeof_);
			if (found) return found;
		}
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Basic modifiers
// ---------------------------------------------------------------------------
describe('basic modifiers', () => {
	it('reads modifier value from meta tag and adds BEM modifier class', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: {
					block: 'hint',
					modifiers: { hintType: { source: 'meta' } },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, [
			makeTag('meta', { property: 'hintType', content: 'warning' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes.class).toContain('rf-hint');
		expect(result.attributes.class).toContain('rf-hint--warning');
	});

	it('applies default value when meta tag is absent', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: {
					block: 'hint',
					modifiers: { hintType: { source: 'meta', default: 'note' } },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes.class).toContain('rf-hint--note');
	});

	it('sets data attribute from modifier value with camelCase to kebab-case', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: {
					block: 'hint',
					modifiers: { hintType: { source: 'meta', default: 'warning' } },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes['data-hint-type']).toBe('warning');
	});

	it('handles multiple modifiers with separate classes and data attrs', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Figure: {
					block: 'figure',
					modifiers: {
						size: { source: 'meta' },
						align: { source: 'meta' },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('figure', { typeof: 'Figure' }, [
			makeTag('meta', { property: 'size', content: 'large' }, []),
			makeTag('meta', { property: 'align', content: 'left' }, []),
		]);

		const result = asTag(transform(tag));
		expect(result.attributes.class).toContain('rf-figure--large');
		expect(result.attributes.class).toContain('rf-figure--left');
		expect(result.attributes['data-size']).toBe('large');
		expect(result.attributes['data-align']).toBe('left');
	});

	it('produces no modifier class when value is missing and no default', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					modifiers: { opt: { source: 'meta' } },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes.class).toBe('rf-test');
		expect(result.attributes['data-opt']).toBeUndefined();
	});

	it('sets data-rune from typeof (lowercased)', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: { block: 'hint' },
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes['data-rune']).toBe('hint');
	});
});

// ---------------------------------------------------------------------------
// autoLabel
// ---------------------------------------------------------------------------
describe('autoLabel', () => {
	it('labels child by tag name', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				AccordionItem: {
					block: 'accordion-item',
					autoLabel: { name: 'header' },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('div', { typeof: 'AccordionItem' }, [
			makeTag('name', {}, ['Title']),
		]);

		const result = asTag(transform(tag));
		const child = result.children.find(
			(c: any) => c?.name === 'name'
		) as SerializedTag;
		expect(child.attributes['data-name']).toBe('header');
	});

	it('labels child by property attribute', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					autoLabel: { title: 'heading' },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, [
			makeTag('span', { property: 'title' }, ['My Title']),
		]);

		const result = asTag(transform(tag));
		const child = result.children.find(
			(c: any) => c?.attributes?.property === 'title'
		) as SerializedTag;
		expect(child.attributes['data-name']).toBe('heading');
	});

	it('does not override existing data-name', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					autoLabel: { summary: 'header' },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, [
			makeTag('summary', { 'data-name': 'custom' }, ['text']),
		]);

		const result = asTag(transform(tag));
		const child = result.children.find(
			(c: any) => c?.name === 'summary'
		) as SerializedTag;
		expect(child.attributes['data-name']).toBe('custom');
	});

	it('ignores children that do not match autoLabel keys', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					autoLabel: { summary: 'header' },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, [
			makeTag('p', {}, ['text']),
		]);

		const result = asTag(transform(tag));
		const child = result.children.find(
			(c: any) => c?.name === 'p'
		) as SerializedTag;
		expect(child.attributes['data-name']).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// contentWrapper
// ---------------------------------------------------------------------------
describe('contentWrapper', () => {
	it('wraps content children in configured element', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Recipe: {
					block: 'recipe',
					contentWrapper: { tag: 'div', ref: 'content' },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Recipe' }, [
			makeTag('ul', {}, ['item 1']),
			makeTag('ol', {}, ['item 2']),
		]);

		const result = asTag(transform(tag));
		// Should have one wrapper child
		expect(result.children.length).toBe(1);
		const wrapper = asTag(result.children[0] as any);
		expect(wrapper.name).toBe('div');
		expect(wrapper.attributes['data-name']).toBe('content');
		// Wrapper contains the original children
		expect(wrapper.children.length).toBe(2);
	});

	it('works together with structure injection', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Api: {
					block: 'api',
					contentWrapper: { tag: 'div', ref: 'body' },
					structure: {
						header: { tag: 'div', before: true },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Api' }, [
			makeTag('p', {}, ['Description']),
		]);

		const result = asTag(transform(tag));
		// First child: structure element (header), second: wrapped content
		const first = asTag(result.children[0] as any);
		const second = asTag(result.children[1] as any);
		expect(first.attributes['data-name']).toBe('header');
		expect(second.attributes['data-name']).toBe('body');
	});

	it('works without structure config', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					contentWrapper: { tag: 'div', ref: 'body' },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, [
			makeTag('p', {}, ['Para 1']),
			makeTag('p', {}, ['Para 2']),
		]);

		const result = asTag(transform(tag));
		expect(result.children.length).toBe(1);
		const wrapper = asTag(result.children[0] as any);
		expect(wrapper.name).toBe('div');
		expect(wrapper.attributes['data-name']).toBe('body');
		expect(wrapper.children.length).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Structure injection
// ---------------------------------------------------------------------------
describe('structure injection', () => {
	it('prepends element when before=true', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: {
					block: 'hint',
					structure: {
						header: { tag: 'div', before: true },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, [
			makeTag('p', {}, ['Content']),
		]);

		const result = asTag(transform(tag));
		const first = asTag(result.children[0] as any);
		expect(first.attributes['data-name']).toBe('header');
	});

	it('appends element by default (no before flag)', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					structure: {
						footer: { tag: 'div' },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, [
			makeTag('p', {}, ['Content']),
		]);

		const result = asTag(transform(tag));
		const last = asTag(result.children[result.children.length - 1] as any);
		expect(last.attributes['data-name']).toBe('footer');
	});

	it('builds nested structure children', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: {
					block: 'hint',
					structure: {
						header: {
							tag: 'div',
							before: true,
							children: [
								{ tag: 'span', ref: 'icon' },
								{ tag: 'span', ref: 'title' },
							],
						},
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, [
			makeTag('p', {}, ['Content']),
		]);

		const result = asTag(transform(tag));
		const header = asTag(result.children[0] as any);
		expect(header.attributes['data-name']).toBe('header');
		expect(header.children.length).toBe(2);
		const icon = asTag(header.children[0] as any);
		const title = asTag(header.children[1] as any);
		expect(icon.attributes['data-name']).toBe('icon');
		expect(title.attributes['data-name']).toBe('title');
	});

	it('skips element when condition modifier is absent', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Api: {
					block: 'api',
					modifiers: { auth: { source: 'meta' } },
					structure: {
						badge: { tag: 'span', condition: 'auth' },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Api' }, [
			makeTag('p', {}, ['Content']),
		]);

		const result = asTag(transform(tag));
		const hasBadge = result.children.some(
			(c: any) => c?.attributes?.['data-name'] === 'badge'
		);
		expect(hasBadge).toBe(false);
	});

	it('includes element when condition modifier is present', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Api: {
					block: 'api',
					modifiers: { auth: { source: 'meta' } },
					structure: {
						badge: { tag: 'span', condition: 'auth' },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Api' }, [
			makeTag('meta', { property: 'auth', content: 'Bearer' }, []),
			makeTag('p', {}, ['Content']),
		]);

		const result = asTag(transform(tag));
		const hasBadge = result.children.some(
			(c: any) => c?.attributes?.['data-name'] === 'badge'
		);
		expect(hasBadge).toBe(true);
	});

	it('includes element when conditionAny has at least one match', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Recipe: {
					block: 'recipe',
					modifiers: {
						prepTime: { source: 'meta' },
						cookTime: { source: 'meta' },
					},
					structure: {
						meta: { tag: 'div', conditionAny: ['prepTime', 'cookTime'], before: true },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Recipe' }, [
			makeTag('meta', { property: 'prepTime', content: 'PT30M' }, []),
		]);

		const result = asTag(transform(tag));
		const hasMeta = result.children.some(
			(c: any) => c?.attributes?.['data-name'] === 'meta'
		);
		expect(hasMeta).toBe(true);
	});

	it('skips element when conditionAny has no matches', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Recipe: {
					block: 'recipe',
					modifiers: {
						prepTime: { source: 'meta' },
						cookTime: { source: 'meta' },
					},
					structure: {
						meta: { tag: 'div', conditionAny: ['prepTime', 'cookTime'], before: true },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Recipe' }, [
			makeTag('p', {}, ['Content']),
		]);

		const result = asTag(transform(tag));
		const hasMeta = result.children.some(
			(c: any) => c?.attributes?.['data-name'] === 'meta'
		);
		expect(hasMeta).toBe(false);
	});

	it('uses ref as data-name instead of structure key', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					structure: {
						myKey: { tag: 'span', ref: 'custom-name' },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, []);

		const result = asTag(transform(tag));
		const element = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'custom-name'
		);
		expect(element).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Structure metaText
// ---------------------------------------------------------------------------
describe('structure metaText', () => {
	it('injects modifier value as text content', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Api: {
					block: 'api',
					modifiers: { method: { source: 'meta', default: 'GET' } },
					structure: {
						badge: { tag: 'span', metaText: 'method' },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Api' }, []);

		const result = asTag(transform(tag));
		const badge = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'badge'
		) as SerializedTag;
		expect(badge.children).toContain('GET');
	});

	it('applies duration transform (ISO 8601)', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Recipe: {
					block: 'recipe',
					modifiers: { prepTime: { source: 'meta' } },
					structure: {
						time: { tag: 'span', metaText: 'prepTime', transform: 'duration' },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Recipe' }, [
			makeTag('meta', { property: 'prepTime', content: 'PT1H30M' }, []),
		]);

		const result = asTag(transform(tag));
		const time = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'time'
		) as SerializedTag;
		expect(time.children).toContain('1h 30m');
	});

	it('applies uppercase transform', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					modifiers: { method: { source: 'meta' } },
					structure: {
						badge: { tag: 'span', metaText: 'method', transform: 'uppercase' },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, [
			makeTag('meta', { property: 'method', content: 'get' }, []),
		]);

		const result = asTag(transform(tag));
		const badge = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'badge'
		) as SerializedTag;
		expect(badge.children).toContain('GET');
	});

	it('applies capitalize transform', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					modifiers: { difficulty: { source: 'meta' } },
					structure: {
						label: { tag: 'span', metaText: 'difficulty', transform: 'capitalize' },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, [
			makeTag('meta', { property: 'difficulty', content: 'easy' }, []),
		]);

		const result = asTag(transform(tag));
		const label = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'label'
		) as SerializedTag;
		expect(label.children).toContain('Easy');
	});

	it('applies textPrefix and textSuffix', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Recipe: {
					block: 'recipe',
					modifiers: { servings: { source: 'meta' } },
					structure: {
						serving: { tag: 'span', metaText: 'servings', textPrefix: 'Serves: ', textSuffix: ' people' },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Recipe' }, [
			makeTag('meta', { property: 'servings', content: '4' }, []),
		]);

		const result = asTag(transform(tag));
		const serving = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'serving'
		) as SerializedTag;
		expect(serving.children).toContain('Serves: 4 people');
	});
});

// ---------------------------------------------------------------------------
// Structure attrs
// ---------------------------------------------------------------------------
describe('structure attrs', () => {
	it('sets literal string attrs on element', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					structure: {
						nav: { tag: 'nav', attrs: { role: 'navigation' } },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, []);

		const result = asTag(transform(tag));
		const nav = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'nav'
		) as SerializedTag;
		expect(nav.attributes.role).toBe('navigation');
	});

	it('resolves fromModifier attrs to modifier value', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Event: {
					block: 'event',
					modifiers: { url: { source: 'meta' } },
					structure: {
						link: { tag: 'a', attrs: { href: { fromModifier: 'url' } } },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Event' }, [
			makeTag('meta', { property: 'url', content: 'https://example.com' }, []),
		]);

		const result = asTag(transform(tag));
		const link = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'link'
		) as SerializedTag;
		expect(link.attributes.href).toBe('https://example.com');
	});

	it('produces empty string when fromModifier modifier is missing', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Event: {
					block: 'event',
					modifiers: { url: { source: 'meta' } },
					structure: {
						link: { tag: 'a', attrs: { href: { fromModifier: 'url' } } },
					},
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Event' }, []);

		const result = asTag(transform(tag));
		const link = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'link'
		) as SerializedTag;
		expect(link.attributes.href).toBe('');
	});
});

// ---------------------------------------------------------------------------
// rootAttributes
// ---------------------------------------------------------------------------
describe('rootAttributes', () => {
	it('adds extra attributes to root element', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					rootAttributes: { role: 'alert', 'aria-live': 'polite' },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes.role).toBe('alert');
		expect(result.attributes['aria-live']).toBe('polite');
	});

	it('coexists with standard attributes', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Test: {
					block: 'test',
					rootAttributes: { 'data-custom': 'value' },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Test' }, []);

		const result = asTag(transform(tag));
		expect(result.attributes['data-custom']).toBe('value');
		expect(result.attributes.class).toContain('rf-test');
		expect(result.attributes['data-rune']).toBe('test');
	});
});

// ---------------------------------------------------------------------------
// BEM class application
// ---------------------------------------------------------------------------
describe('BEM class application', () => {
	it('applies BEM element class to data-name children', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: { block: 'hint' },
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, [
			makeTag('div', { 'data-name': 'header' }, ['Content']),
		]);

		const result = asTag(transform(tag));
		const header = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'header'
		) as SerializedTag;
		expect(header.attributes.class).toContain('rf-hint__header');
	});

	it('applies BEM classes recursively to nested data-name children', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: { block: 'hint' },
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, [
			makeTag('div', { 'data-name': 'header' }, [
				makeTag('span', { 'data-name': 'icon' }, []),
			]),
		]);

		const result = asTag(transform(tag));
		const header = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'header'
		) as SerializedTag;
		expect(header.attributes.class).toContain('rf-hint__header');
		const icon = header.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'icon'
		) as SerializedTag;
		expect(icon.attributes.class).toContain('rf-hint__icon');
	});

	it('preserves existing class on data-name children', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: { block: 'hint' },
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, [
			makeTag('div', { 'data-name': 'header', class: 'custom' }, ['Content']),
		]);

		const result = asTag(transform(tag));
		const header = result.children.find(
			(c: any) => c?.attributes?.['data-name'] === 'header'
		) as SerializedTag;
		expect(header.attributes.class).toContain('rf-hint__header');
		expect(header.attributes.class).toContain('custom');
	});

	it('recurses into nested runes with separate BEM namespace', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Grid: { block: 'grid' },
				Hint: { block: 'hint' },
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Grid' }, [
			makeTag('section', { typeof: 'Hint' }, ['Nested hint']),
		]);

		const result = asTag(transform(tag));
		const hint = findByTypeof(result, 'Hint')!;
		expect(hint.attributes.class).toContain('rf-hint');
		expect(hint.attributes.class).not.toContain('rf-grid__');
	});
});

// ---------------------------------------------------------------------------
// Meta tag filtering
// ---------------------------------------------------------------------------
describe('meta tag filtering', () => {
	it('removes consumed modifier meta tags from output', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: {
					block: 'hint',
					modifiers: { hintType: { source: 'meta', default: 'note' } },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, [
			makeTag('meta', { property: 'hintType', content: 'warning' }, []),
			makeTag('p', {}, ['Content']),
		]);

		const result = asTag(transform(tag));
		const hasMeta = result.children.some(
			(c: any) => c?.name === 'meta' && c?.attributes?.property === 'hintType'
		);
		expect(hasMeta).toBe(false);
		// Paragraph is preserved
		const hasParagraph = result.children.some((c: any) => c?.name === 'p');
		expect(hasParagraph).toBe(true);
	});

	it('preserves non-modifier meta tags', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: {
					block: 'hint',
					modifiers: { hintType: { source: 'meta' } },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, [
			makeTag('meta', { property: 'hintType', content: 'warning' }, []),
			makeTag('meta', { property: 'other', content: 'keep' }, []),
		]);

		const result = asTag(transform(tag));
		const hasOtherMeta = result.children.some(
			(c: any) => c?.name === 'meta' && c?.attributes?.property === 'other'
		);
		expect(hasOtherMeta).toBe(true);
	});

	it('preserves meta tags without property attribute', () => {
		const config: ThemeConfig = {
			prefix: 'rf', tokenPrefix: '--rf', icons: {},
			runes: {
				Hint: {
					block: 'hint',
					modifiers: { hintType: { source: 'meta' } },
				},
			},
		};
		const transform = createTransform(config);
		const tag = makeTag('section', { typeof: 'Hint' }, [
			makeTag('meta', { charset: 'utf-8' }, []),
		]);

		const result = asTag(transform(tag));
		const hasCharsetMeta = result.children.some(
			(c: any) => c?.name === 'meta' && c?.attributes?.charset === 'utf-8'
		);
		expect(hasCharsetMeta).toBe(true);
	});
});
