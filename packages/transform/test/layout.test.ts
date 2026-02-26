import { describe, it, expect } from 'vitest';
import { layoutTransform } from '../src/layout.js';
import { makeTag } from '../src/helpers.js';
import type { LayoutConfig, LayoutPageData, LayoutStructureEntry } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

function makePage(overrides?: Partial<LayoutPageData>): LayoutPageData {
	return {
		renderable: makeTag('div', {}, ['Page content']),
		regions: {},
		title: 'Test Page',
		url: '/test',
		pages: [],
		frontmatter: {},
		headings: [],
		...overrides,
	};
}

function minimalConfig(overrides?: Partial<LayoutConfig>): LayoutConfig {
	return {
		block: 'test',
		slots: {},
		...overrides,
	};
}

// ─── Root Element ─────────────────────────────────────────────────────

describe('root element', () => {
	it('wraps output in div with data-layout and BEM class', () => {
		const config = minimalConfig({ block: 'docs' });
		const result = layoutTransform(config, makePage(), 'rf');

		expect(result.name).toBe('div');
		expect(result.attributes['data-layout']).toBe('docs');
		expect(result.attributes.class).toBe('rf-layout-docs');
	});

	it('uses custom root tag', () => {
		const config = minimalConfig({ tag: 'section' });
		const result = layoutTransform(config, makePage(), 'rf');
		expect(result.name).toBe('section');
	});

	it('adds data-layout-behaviors when behaviors specified', () => {
		const config = minimalConfig({ behaviors: ['mobile-menu'] });
		const result = layoutTransform(config, makePage(), 'rf');
		expect(result.attributes['data-layout-behaviors']).toBe('mobile-menu');
	});

	it('joins multiple behaviors with space', () => {
		const config = minimalConfig({ behaviors: ['mobile-menu', 'scrollspy'] });
		const result = layoutTransform(config, makePage(), 'rf');
		expect(result.attributes['data-layout-behaviors']).toBe('mobile-menu scrollspy');
	});

	it('omits data-layout-behaviors when no behaviors', () => {
		const config = minimalConfig();
		const result = layoutTransform(config, makePage(), 'rf');
		expect(result.attributes['data-layout-behaviors']).toBeUndefined();
	});
});

// ─── Source Resolution ────────────────────────────────────────────────

describe('source resolution', () => {
	it('resolves content source to page renderable', () => {
		const config = minimalConfig({
			slots: {
				main: { tag: 'main', source: 'content' },
			},
		});
		const page = makePage({ renderable: makeTag('p', {}, ['Hello']) });
		const result = layoutTransform(config, page, 'rf');

		const main = asTag(result.children[0]);
		expect(main.name).toBe('main');
		const content = asTag(main.children[0]);
		expect(content.name).toBe('p');
		expect(content.children[0]).toBe('Hello');
	});

	it('resolves region source', () => {
		const config = minimalConfig({
			slots: {
				sidebar: { tag: 'aside', source: 'region:nav' },
			},
		});
		const page = makePage({
			regions: {
				nav: { name: 'nav', mode: 'replace', content: [makeTag('ul', {}, ['Nav items'])] },
			},
		});
		const result = layoutTransform(config, page, 'rf');

		const sidebar = asTag(result.children[0]);
		expect(sidebar.name).toBe('aside');
		const nav = asTag(sidebar.children[0]);
		expect(nav.name).toBe('ul');
	});

	it('deep clones region content for clone:region source', () => {
		const originalContent = [makeTag('span', { id: 'original' }, ['Content'])];
		const config = minimalConfig({
			slots: {
				clone: { tag: 'div', source: 'clone:region:header' },
			},
		});
		const page = makePage({
			regions: {
				header: { name: 'header', mode: 'replace', content: originalContent },
			},
		});
		const result = layoutTransform(config, page, 'rf');

		const cloneDiv = asTag(result.children[0]);
		const clonedSpan = asTag(cloneDiv.children[0]);

		// Content should match
		expect(clonedSpan.attributes.id).toBe('original');

		// But should be a different object (deep clone)
		expect(clonedSpan).not.toBe(originalContent[0]);
	});
});

// ─── Conditional Slots ────────────────────────────────────────────────

describe('conditional slots', () => {
	it('skips conditional slot when source is empty', () => {
		const config = minimalConfig({
			slots: {
				sidebar: { tag: 'aside', source: 'region:nav', conditional: true },
			},
		});
		const result = layoutTransform(config, makePage(), 'rf');
		expect(result.children).toHaveLength(0);
	});

	it('renders conditional slot when source has content', () => {
		const config = minimalConfig({
			slots: {
				sidebar: { tag: 'aside', source: 'region:nav', conditional: true },
			},
		});
		const page = makePage({
			regions: {
				nav: { name: 'nav', mode: 'replace', content: [makeTag('ul', {}, ['Items'])] },
			},
		});
		const result = layoutTransform(config, page, 'rf');
		expect(result.children).toHaveLength(1);
	});

	it('skips slot when conditionalRegion is missing', () => {
		const config = minimalConfig({
			slots: {
				toolbar: {
					tag: 'div',
					conditionalRegion: 'nav',
					children: [{ tag: 'span', ref: 'label', children: ['Toolbar'] } as LayoutStructureEntry],
				},
			},
		});
		const result = layoutTransform(config, makePage(), 'rf');
		expect(result.children).toHaveLength(0);
	});

	it('renders slot when conditionalRegion exists', () => {
		const config = minimalConfig({
			slots: {
				toolbar: { tag: 'div', conditionalRegion: 'nav' },
			},
		});
		const page = makePage({
			regions: {
				nav: { name: 'nav', mode: 'replace', content: [makeTag('ul', {}, [])] },
			},
		});
		const result = layoutTransform(config, page, 'rf');
		expect(result.children).toHaveLength(1);
	});
});

// ─── Frontmatter Conditions ──────────────────────────────────────────

describe('frontmatter conditions', () => {
	it('skips slot when frontmatterCondition is falsy', () => {
		const config = minimalConfig({
			slots: {
				sidebar: { tag: 'aside', frontmatterCondition: 'showSidebar' },
			},
		});
		const result = layoutTransform(config, makePage(), 'rf');
		expect(result.children).toHaveLength(0);
	});

	it('renders slot when frontmatterCondition is truthy', () => {
		const config = minimalConfig({
			slots: {
				sidebar: { tag: 'aside', frontmatterCondition: 'showSidebar' },
			},
		});
		const page = makePage({ frontmatter: { showSidebar: true } });
		const result = layoutTransform(config, page, 'rf');
		expect(result.children).toHaveLength(1);
	});
});

// ─── Conditional Modifiers ────────────────────────────────────────────

describe('conditional modifiers', () => {
	it('adds modifier class when region exists', () => {
		const config = minimalConfig({
			slots: {
				main: {
					tag: 'main',
					class: 'rf-content',
					conditionalModifier: { region: 'nav', modifier: 'has-nav' },
				},
			},
		});
		const page = makePage({
			regions: {
				nav: { name: 'nav', mode: 'replace', content: [makeTag('ul', {}, [])] },
			},
		});
		const result = layoutTransform(config, page, 'rf');
		const main = asTag(result.children[0]);
		expect(main.attributes.class).toBe('rf-content rf-content--has-nav');
	});

	it('does not add modifier class when region missing', () => {
		const config = minimalConfig({
			slots: {
				main: {
					tag: 'main',
					class: 'rf-content',
					conditionalModifier: { region: 'nav', modifier: 'has-nav' },
				},
			},
		});
		const result = layoutTransform(config, makePage(), 'rf');
		const main = asTag(result.children[0]);
		expect(main.attributes.class).toBe('rf-content');
	});
});

// ─── Wrapper ──────────────────────────────────────────────────────────

describe('wrapper', () => {
	it('wraps slot content in wrapper element', () => {
		const config = minimalConfig({
			slots: {
				main: {
					tag: 'main',
					source: 'content',
					wrapper: { tag: 'div', class: 'rf-inner' },
				},
			},
		});
		const result = layoutTransform(config, makePage(), 'rf');
		const main = asTag(result.children[0]);
		const wrapper = asTag(main.children[0]);
		expect(wrapper.name).toBe('div');
		expect(wrapper.attributes.class).toBe('rf-inner');
	});

	it('adds modifier to wrapper when computed content exists', () => {
		const config = minimalConfig({
			computed: {
				toc: {
					type: 'toc',
					source: 'headings',
					options: { minLevel: 2, maxLevel: 3 },
				},
			},
			slots: {
				main: {
					tag: 'main',
					wrapper: {
						tag: 'div',
						class: 'rf-inner',
						conditionalModifier: { computed: 'toc', modifier: 'has-toc' },
					},
					children: [
						{ tag: 'div', source: 'content' },
					],
				},
			},
		});
		const page = makePage({
			headings: [
				{ level: 2, text: 'A', id: 'a' },
				{ level: 2, text: 'B', id: 'b' },
			],
		});
		const result = layoutTransform(config, page, 'rf');
		const main = asTag(result.children[0]);
		const wrapper = asTag(main.children[0]);
		expect(wrapper.attributes.class).toBe('rf-inner rf-inner--has-toc');
	});

	it('does not add modifier when computed content is null', () => {
		const config = minimalConfig({
			computed: {
				toc: {
					type: 'toc',
					source: 'headings',
					visibility: { minCount: 2 },
				},
			},
			slots: {
				main: {
					tag: 'main',
					wrapper: {
						tag: 'div',
						class: 'rf-inner',
						conditionalModifier: { computed: 'toc', modifier: 'has-toc' },
					},
				},
			},
		});
		const page = makePage({ headings: [{ level: 2, text: 'Only one', id: 'one' }] });
		const result = layoutTransform(config, page, 'rf');
		const main = asTag(result.children[0]);
		const wrapper = asTag(main.children[0]);
		expect(wrapper.attributes.class).toBe('rf-inner');
	});
});

// ─── Chrome ───────────────────────────────────────────────────────────

describe('chrome', () => {
	it('resolves chrome references in children', () => {
		const config = minimalConfig({
			chrome: {
				menuBtn: {
					tag: 'button',
					ref: 'menu',
					attrs: { 'aria-label': 'Menu' },
					svg: '<svg></svg>',
				},
			},
			slots: {
				header: {
					tag: 'header',
					children: ['chrome:menuBtn'],
				},
			},
		});
		const result = layoutTransform(config, makePage(), 'rf');
		const header = asTag(result.children[0]);
		const btn = asTag(header.children[0]);
		expect(btn.name).toBe('button');
		expect(btn.attributes['data-name']).toBe('menu');
		expect(btn.attributes['aria-label']).toBe('Menu');
		expect(btn.children[0]).toBe('<svg></svg>');
	});

	it('injects pageText from page data', () => {
		const config = minimalConfig({
			chrome: {
				title: {
					tag: 'h1',
					ref: 'title',
					pageText: 'title',
				} as LayoutStructureEntry,
			},
			slots: {
				header: {
					tag: 'header',
					children: ['chrome:title'],
				},
			},
		});
		const page = makePage({ title: 'My Page' });
		const result = layoutTransform(config, page, 'rf');
		const header = asTag(result.children[0]);
		const h1 = asTag(header.children[0]);
		expect(h1.children[0]).toBe('My Page');
	});

	it('skips chrome when pageCondition is falsy', () => {
		const config = minimalConfig({
			chrome: {
				meta: {
					tag: 'div',
					ref: 'meta',
					pageCondition: 'frontmatter.date',
					pageText: 'frontmatter.date',
				} as LayoutStructureEntry,
			},
			slots: {
				header: {
					tag: 'header',
					children: ['chrome:meta'],
				},
			},
		});
		const page = makePage({ frontmatter: {} });
		const result = layoutTransform(config, page, 'rf');
		const header = asTag(result.children[0]);
		expect(header.children).toHaveLength(0);
	});

	it('formats date with dateFormat', () => {
		const config = minimalConfig({
			chrome: {
				date: {
					tag: 'time',
					ref: 'date',
					pageText: 'frontmatter.date',
					dateFormat: { year: 'numeric', month: 'long', day: 'numeric' },
				} as LayoutStructureEntry,
			},
			slots: {
				header: {
					tag: 'header',
					children: ['chrome:date'],
				},
			},
		});
		const page = makePage({ frontmatter: { date: '2026-01-15' } });
		const result = layoutTransform(config, page, 'rf');
		const header = asTag(result.children[0]);
		const time = asTag(header.children[0]);
		expect(time.children[0]).toContain('January');
		expect(time.children[0]).toContain('15');
		expect(time.children[0]).toContain('2026');
	});

	it('resolves iterate for array data', () => {
		const config = minimalConfig({
			chrome: {
				tags: {
					tag: 'div',
					ref: 'tags',
					iterate: { source: 'frontmatter.tags', tag: 'span', class: 'tag' },
				} as LayoutStructureEntry,
			},
			slots: {
				header: {
					tag: 'header',
					children: ['chrome:tags'],
				},
			},
		});
		const page = makePage({ frontmatter: { tags: ['svelte', 'typescript'] } });
		const result = layoutTransform(config, page, 'rf');
		const header = asTag(result.children[0]);
		const tagsDiv = asTag(header.children[0]);
		expect(tagsDiv.children).toHaveLength(2);

		const tag1 = asTag(tagsDiv.children[0]);
		expect(tag1.name).toBe('span');
		expect(tag1.attributes.class).toBe('tag');
		expect(tag1.children[0]).toBe('svelte');

		const tag2 = asTag(tagsDiv.children[1]);
		expect(tag2.children[0]).toBe('typescript');
	});

	it('resolves fromPageData in attrs', () => {
		const config = minimalConfig({
			chrome: {
				date: {
					tag: 'time',
					ref: 'date',
					pageText: 'frontmatter.date',
					attrs: { datetime: { fromPageData: 'frontmatter.date' } },
				} as LayoutStructureEntry,
			},
			slots: {
				header: {
					tag: 'header',
					children: ['chrome:date'],
				},
			},
		});
		const page = makePage({ frontmatter: { date: '2026-01-15' } });
		const result = layoutTransform(config, page, 'rf');
		const header = asTag(result.children[0]);
		const time = asTag(header.children[0]);
		expect(time.attributes.datetime).toBe('2026-01-15');
	});
});

// ─── Computed Content ─────────────────────────────────────────────────

describe('computed content', () => {
	it('resolves computed:toc source', () => {
		const config = minimalConfig({
			computed: {
				toc: {
					type: 'toc',
					source: 'headings',
				},
			},
			slots: {
				tocSlot: { tag: 'aside', source: 'computed:toc', conditional: true },
			},
		});
		const page = makePage({
			headings: [
				{ level: 2, text: 'Section A', id: 'a' },
				{ level: 2, text: 'Section B', id: 'b' },
			],
		});
		const result = layoutTransform(config, page, 'rf');
		expect(result.children).toHaveLength(1);

		const aside = asTag(result.children[0]);
		const nav = asTag(aside.children[0]);
		expect(nav.attributes['data-scrollspy']).toBe('');
	});

	it('skips computed when visibility minCount not met', () => {
		const config = minimalConfig({
			computed: {
				toc: {
					type: 'toc',
					source: 'headings',
					visibility: { minCount: 2 },
				},
			},
			slots: {
				tocSlot: { tag: 'aside', source: 'computed:toc', conditional: true },
			},
		});
		const page = makePage({
			headings: [{ level: 2, text: 'Only one', id: 'one' }],
		});
		const result = layoutTransform(config, page, 'rf');
		expect(result.children).toHaveLength(0);
	});

	it('skips computed when frontmatterToggle is false', () => {
		const config = minimalConfig({
			computed: {
				toc: {
					type: 'toc',
					source: 'headings',
					visibility: { frontmatterToggle: 'toc' },
				},
			},
			slots: {
				tocSlot: { tag: 'aside', source: 'computed:toc', conditional: true },
			},
		});
		const page = makePage({
			frontmatter: { toc: false },
			headings: [
				{ level: 2, text: 'A', id: 'a' },
				{ level: 2, text: 'B', id: 'b' },
			],
		});
		const result = layoutTransform(config, page, 'rf');
		expect(result.children).toHaveLength(0);
	});
});

// ─── Slot Attributes ──────────────────────────────────────────────────

describe('slot attributes', () => {
	it('passes attrs to slot element', () => {
		const config = minimalConfig({
			slots: {
				panel: {
					tag: 'div',
					attrs: { role: 'dialog', 'aria-label': 'Menu' },
				},
			},
		});
		const result = layoutTransform(config, makePage(), 'rf');
		const panel = asTag(result.children[0]);
		expect(panel.attributes.role).toBe('dialog');
		expect(panel.attributes['aria-label']).toBe('Menu');
	});
});

// ─── Post Transform ───────────────────────────────────────────────────

describe('postTransform', () => {
	it('applies postTransform to result', () => {
		const config = minimalConfig({
			postTransform: (node) => ({
				...node,
				attributes: { ...node.attributes, 'data-custom': 'true' },
			}),
		});
		const result = layoutTransform(config, makePage(), 'rf');
		expect(result.attributes['data-custom']).toBe('true');
	});
});
