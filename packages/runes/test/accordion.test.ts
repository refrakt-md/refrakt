import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('accordion tag', () => {
	it('should convert headings to accordion items', () => {
		const result = parse(`{% accordion headingLevel=2 %}
## First Section

Content for first section.

## Second Section

Content for second section.
{% /accordion %}`);

		const acc = findTag(result as any, t => t.attributes.typeof === 'Accordion');
		expect(acc).toBeDefined();
		expect(acc!.name).toBe('section');

		const items = findAllTags(acc!, t => t.attributes.typeof === 'AccordionItem');
		expect(items.length).toBe(2);

		const firstName = findTag(items[0], t => t.name === 'summary' && t.attributes.property === 'name');
		expect(firstName).toBeDefined();
		expect(firstName!.children).toContain('First Section');
	});

	it('should work with faq alias', () => {
		const result = parse(`{% faq headingLevel=2 %}
## What is refrakt.md?

A content framework.

## How do I install it?

Run npm install.
{% /faq %}`);

		const acc = findTag(result as any, t => t.attributes.typeof === 'Accordion');
		expect(acc).toBeDefined();
	});

	it('should support explicit accordion-item tags', () => {
		const result = parse(`{% accordion %}
{% accordion-item name="Section One" %}
Content one.
{% /accordion-item %}

{% accordion-item name="Section Two" %}
Content two.
{% /accordion-item %}
{% /accordion %}`);

		const acc = findTag(result as any, t => t.attributes.typeof === 'Accordion');
		expect(acc).toBeDefined();

		const items = findAllTags(acc!, t => t.attributes.typeof === 'AccordionItem');
		expect(items.length).toBe(2);
	});

	it('should wrap items in a container div', () => {
		const result = parse(`{% accordion %}
{% accordion-item name="Item" %}
Content.
{% /accordion-item %}
{% /accordion %}`);

		const acc = findTag(result as any, t => t.attributes.typeof === 'Accordion');
		expect(acc).toBeDefined();

		const container = findTag(acc!, t => t.name === 'div' && t.attributes['data-name'] === 'items');
		expect(container).toBeDefined();
	});
});
