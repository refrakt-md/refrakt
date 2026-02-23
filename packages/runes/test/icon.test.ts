import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';
import { parseSvgToTags } from '../src/lib/svg.js';

const testIcons = {
	global: {
		rocket: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15v5"/><circle cx="12" cy="10" r="3"/></svg>',
		star: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>',
	},
	hint: {
		warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/></svg>',
	},
};

describe('parseSvgToTags', () => {
	it('should parse a simple SVG into a Tag tree', () => {
		const tag = parseSvgToTags(testIcons.global.rocket, 'rocket');
		expect(tag.name).toBe('svg');
		expect(tag.attributes.class).toBe('rf-icon');
		expect(tag.attributes['data-icon']).toBe('rocket');
		expect(tag.attributes.viewBox).toBe('0 0 24 24');
		expect(tag.attributes.stroke).toBe('currentColor');
		expect(tag.children.length).toBe(2); // path + circle
	});

	it('should extract child element attributes', () => {
		const tag = parseSvgToTags(testIcons.global.rocket, 'rocket');
		const circle = tag.children.find((c: any) => c.name === 'circle');
		expect(circle).toBeDefined();
		expect(circle.attributes.cx).toBe('12');
		expect(circle.attributes.cy).toBe('10');
		expect(circle.attributes.r).toBe('3');
	});

	it('should return fallback span for invalid SVG', () => {
		const tag = parseSvgToTags('not an svg', 'bad');
		expect(tag.name).toBe('span');
		expect(tag.attributes.class).toBe('rf-icon');
		expect(tag.attributes['data-icon']).toBe('bad');
	});
});

describe('icon rune', () => {
	it('should resolve a global icon by name', () => {
		const result = parse('{% icon name="rocket" /%}', { __icons: testIcons });
		const svg = findTag(result as any, t => t.name === 'svg');
		expect(svg).toBeDefined();
		expect(svg!.attributes['data-icon']).toBe('rocket');
		expect(svg!.attributes.class).toBe('rf-icon');
	});

	it('should resolve a grouped icon with slash syntax', () => {
		const result = parse('{% icon name="hint/warning" /%}', { __icons: testIcons });
		const svg = findTag(result as any, t => t.name === 'svg');
		expect(svg).toBeDefined();
		expect(svg!.attributes['data-icon']).toBe('hint/warning');
	});

	it('should produce a fallback span for unknown icons', () => {
		const result = parse('{% icon name="nonexistent" /%}', { __icons: testIcons });
		const span = findTag(result as any, t => t.name === 'span' && t.attributes['data-icon'] === 'nonexistent');
		expect(span).toBeDefined();
		expect(span!.attributes.class).toBe('rf-icon');
	});

	it('should produce a fallback when no icon registry is provided', () => {
		const result = parse('{% icon name="rocket" /%}');
		const span = findTag(result as any, t => t.name === 'span' && t.attributes['data-icon'] === 'rocket');
		expect(span).toBeDefined();
	});

	it('should apply size override', () => {
		const result = parse('{% icon name="rocket" size="16px" /%}', { __icons: testIcons });
		const svg = findTag(result as any, t => t.name === 'svg');
		expect(svg).toBeDefined();
		expect(svg!.attributes.width).toBe('16px');
		expect(svg!.attributes.height).toBe('16px');
	});
});

describe('feature + icon integration', () => {
	it('should extract icon SVG into the image property slot', () => {
		const result = parse(`{% feature %}
## What you get

- {% icon name="rocket" /%} **Fast deploys**

  Ship code in seconds.

- {% icon name="star" /%} **Beautiful output**

  Gorgeous by default.
{% /feature %}`, { __icons: testIcons });

		const featureTag = findTag(result as any, t => t.attributes.typeof === 'Feature');
		expect(featureTag).toBeDefined();

		const definitions = findAllTags(featureTag!, t => t.attributes.typeof === 'FeatureDefinition');
		expect(definitions.length).toBe(2);

		// Check that the first definition has an SVG in its image property
		const firstDef = definitions[0];
		const svg = findTag(firstDef, t => t.name === 'svg');
		expect(svg).toBeDefined();
		expect(svg!.attributes['data-icon']).toBe('rocket');

		// Check that the name span is also present alongside the icon
		const nameSpan = findTag(firstDef, t => t.name === 'span' && t.children.includes('Fast deploys'));
		expect(nameSpan).toBeDefined();
	});
});
