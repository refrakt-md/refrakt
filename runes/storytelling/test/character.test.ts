import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

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
		const nameTag = findTag(tag!, t => t.name === 'span' && t.attributes['data-field'] === 'name');
		expect(nameTag).toBeDefined();
		expect(nameTag!.children[0]).toBe('Aragorn');
	});

	it('should pass role and status as meta tags', () => {
		const result = parse(`{% character name="Veshra" role="antagonist" status="alive" %}
Content.
{% /character %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'character');
		const roleMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'role');
		expect(roleMeta).toBeDefined();
		expect(roleMeta!.attributes.content).toBe('antagonist');

		const statusMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'status');
		expect(statusMeta).toBeDefined();
		expect(statusMeta!.attributes.content).toBe('alive');
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
		const aliasesMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'aliases');
		expect(aliasesMeta).toBeDefined();
		expect(aliasesMeta!.attributes.content).toBe('Strider, Elessar');
	});

	it('should work with npc alias', () => {
		const result = parse(`{% npc name="Shopkeeper" %}
Sells potions.
{% /npc %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'character');
		expect(tag).toBeDefined();
	});
});
