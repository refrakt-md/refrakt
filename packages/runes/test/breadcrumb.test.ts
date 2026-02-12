import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('breadcrumb tag', () => {
	it('should transform a list of links into breadcrumb items', () => {
		const result = parse(`{% breadcrumb %}
- [Home](/)
- [Docs](/docs)
- Current Page
{% /breadcrumb %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Breadcrumb');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('nav');
	});

	it('should create BreadcrumbItem for each list item', () => {
		const result = parse(`{% breadcrumb %}
- [Home](/)
- [Docs](/docs)
- Current
{% /breadcrumb %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Breadcrumb');
		const items = findAllTags(tag!, t => t.attributes.typeof === 'BreadcrumbItem');
		expect(items.length).toBe(3);
	});

	it('should pass separator attribute as meta', () => {
		const result = parse(`{% breadcrumb separator=">" %}
- [Home](/)
- Current
{% /breadcrumb %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Breadcrumb');
		const sepMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === '>');
		expect(sepMeta).toBeDefined();
	});

	it('should handle last item without link as current page', () => {
		const result = parse(`{% breadcrumb %}
- [Home](/)
- Current Page
{% /breadcrumb %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Breadcrumb');
		const items = findAllTags(tag!, t => t.attributes.typeof === 'BreadcrumbItem');
		expect(items.length).toBe(2);

		// Last item should have a span but no anchor link
		const lastItem = items[1];
		const nameSpan = findTag(lastItem, t => t.name === 'span');
		expect(nameSpan).toBeDefined();
	});
});
