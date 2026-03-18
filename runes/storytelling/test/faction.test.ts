import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('faction tag', () => {
	it('should convert headings to faction sections', () => {
		const result = parse(`{% faction name="The Silver Order" %}
## Ranks

- Initiate
- Knight
- Commander

## Holdings

Their fortress overlooks the capital.
{% /faction %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'faction');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');

		const sections = findAllTags(tag!, t => t.attributes['data-rune'] === 'faction-section');
		expect(sections.length).toBe(2);
	});

	it('should emit name as a span property', () => {
		const result = parse(`{% faction name="The Arcane Circle" %}
A secretive guild.
{% /faction %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'faction');
		const nameTag = findTag(tag!, t => t.name === 'span' && t.attributes['data-name'] === 'name');
		expect(nameTag).toBeDefined();
		expect(nameTag!.children[0]).toBe('The Arcane Circle');
	});

	it('should pass type, alignment, and size as meta tags', () => {
		const result = parse(`{% faction name="Order" type="knightly order" alignment="lawful" size="large" %}
Content.
{% /faction %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'faction');
		const typeMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'faction-type');
		expect(typeMeta).toBeDefined();
		expect(typeMeta!.attributes.content).toBe('knightly order');

		const alignMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'alignment');
		expect(alignMeta).toBeDefined();
		expect(alignMeta!.attributes.content).toBe('lawful');

		const sizeMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'size');
		expect(sizeMeta).toBeDefined();
		expect(sizeMeta!.attributes.content).toBe('large');
	});

	it('should handle compact mode without sections', () => {
		const result = parse(`{% faction name="Small Guild" %}
Just a description.
{% /faction %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'faction');
		expect(tag).toBeDefined();

		const sections = findAllTags(tag!, t => t.attributes['data-rune'] === 'faction-section');
		expect(sections.length).toBe(0);
	});

	it('should work with guild alias', () => {
		const result = parse(`{% guild name="Thieves Guild" %}
Operates in the shadows.
{% /guild %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'faction');
		expect(tag).toBeDefined();
	});
});
