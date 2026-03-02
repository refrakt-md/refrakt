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

		const tag = findTag(result as any, t => t.attributes.typeof === 'Character');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');

		const sections = findAllTags(tag!, t => t.attributes.typeof === 'CharacterSection');
		expect(sections.length).toBe(2);
	});

	it('should emit name as a span property', () => {
		const result = parse(`{% character name="Aragorn" %}
A ranger from the North.
{% /character %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Character');
		const nameTag = findTag(tag!, t => t.name === 'span' && t.attributes.property === 'name');
		expect(nameTag).toBeDefined();
		expect(nameTag!.children[0]).toBe('Aragorn');
	});

	it('should pass role and status as meta tags', () => {
		const result = parse(`{% character name="Veshra" role="antagonist" status="alive" %}
Content.
{% /character %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Character');
		const roleMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'role');
		expect(roleMeta).toBeDefined();
		expect(roleMeta!.attributes.content).toBe('antagonist');

		const statusMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'status');
		expect(statusMeta).toBeDefined();
		expect(statusMeta!.attributes.content).toBe('alive');
	});

	it('should handle compact card mode without headings', () => {
		const result = parse(`{% character name="Minor NPC" role="minor" %}
Just a brief description.
{% /character %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Character');
		expect(tag).toBeDefined();

		const sections = findAllTags(tag!, t => t.attributes.typeof === 'CharacterSection');
		expect(sections.length).toBe(0);
	});

	it('should pass aliases as meta', () => {
		const result = parse(`{% character name="Aragorn" aliases="Strider, Elessar" %}
Content.
{% /character %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Character');
		const aliasesMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'aliases');
		expect(aliasesMeta).toBeDefined();
		expect(aliasesMeta!.attributes.content).toBe('Strider, Elessar');
	});

	it('should work with npc alias', () => {
		const result = parse(`{% npc name="Shopkeeper" %}
Sells potions.
{% /npc %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Character');
		expect(tag).toBeDefined();
	});
});
