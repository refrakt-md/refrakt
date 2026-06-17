import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

describe('character tag', () => {
	it('should convert headings to character sections', () => {
		const result = parse(`{% character name="Veshra" %}
## Backstory

She grew up in the Ashen Spire.

## Abilities

- Bone conjuration
- Spirit binding
{% /character %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'character');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');

		const sections = findAllTags(tag!, t => t.attributes['data-rune'] === 'character-section');
		expect(sections.length).toBe(2);
	});

	it('should emit name as a span property', () => {
		const result = parse(`{% character name="Aragorn" %}
A ranger from the North.
{% /character %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'character');
		const nameTag = findTag(tag!, t => t.name === 'span' && t.attributes['data-name'] === 'name');
		expect(nameTag).toBeDefined();
		expect(nameTag!.children[0]).toBe('Aragorn');
	});

	it('should pass role and status as meta tags', () => {
		const result = parse(`{% character name="Veshra" role="antagonist" status="alive" %}
Content.
{% /character %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'character');
		// SPEC-082: field values live in the data-rune-fields bag.
		const fields = JSON.parse(tag!.attributes['data-rune-fields'] as string);
		expect(fields.role).toBe('antagonist');
		expect(fields.status).toBe('alive');
	});

	it('should handle compact card mode without headings', () => {
		const result = parse(`{% character name="Minor NPC" role="minor" %}
Just a brief description.
{% /character %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'character');
		expect(tag).toBeDefined();

		const sections = findAllTags(tag!, t => t.attributes['data-rune'] === 'character-section');
		expect(sections.length).toBe(0);
	});

	it('should pass aliases as meta', () => {
		const result = parse(`{% character name="Aragorn" aliases="Strider, Elessar" %}
Content.
{% /character %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'character');
		expect(fields(tag).aliases).toBe('Strider, Elessar');
	});

	it('should work with npc alias', () => {
		const result = parse(`{% npc name="Shopkeeper" %}
Sells potions.
{% /npc %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'character');
		expect(tag).toBeDefined();
	});

	it('should capture a leading image as the portrait', () => {
		const result = parse(`{% character name="Aria" %}
![Aria](/aria.png)

## Background

Backstory text.
{% /character %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'character');
		expect(tag).toBeDefined();
		// The portrait image is captured and sits bare (not lost, not <p>-wrapped).
		const img = findTag(tag!, t => t.name === 'img');
		expect(img).toBeDefined();
		expect(img!.attributes.src).toBe('/aria.png');
	});
});
