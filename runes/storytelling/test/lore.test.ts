import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('lore tag', () => {
	it('should render a basic lore entry', () => {
		const result = parse(`{% lore title="The Old Gods" %}
Ancient beings worshipped before the current pantheon.
{% /lore %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Lore');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should emit title as a span property', () => {
		const result = parse(`{% lore title="The Prophecy" %}
Content.
{% /lore %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Lore');
		const titleTag = findTag(tag!, t => t.name === 'span' && t.attributes.property === 'title');
		expect(titleTag).toBeDefined();
		expect(titleTag!.children[0]).toBe('The Prophecy');
	});

	it('should pass category as meta', () => {
		const result = parse(`{% lore title="A Legend" category="prophecy" %}
Content.
{% /lore %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Lore');
		const catMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'category');
		expect(catMeta).toBeDefined();
		expect(catMeta!.attributes.content).toBe('prophecy');
	});

	it('should pass spoiler as meta string', () => {
		const result = parse(`{% lore title="Secret" spoiler=true %}
Hidden content.
{% /lore %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Lore');
		const spoilerMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'spoiler');
		expect(spoilerMeta).toBeDefined();
		expect(spoilerMeta!.attributes.content).toBe('true');
	});

	it('should pass tags as meta', () => {
		const result = parse(`{% lore title="Entry" tags="magic,history" %}
Content.
{% /lore %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Lore');
		const tagsMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'tags');
		expect(tagsMeta).toBeDefined();
		expect(tagsMeta!.attributes.content).toBe('magic,history');
	});

	it('should work with legend alias', () => {
		const result = parse(`{% legend title="Ancient Myth" %}
Long ago...
{% /legend %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Lore');
		expect(tag).toBeDefined();
	});
});
