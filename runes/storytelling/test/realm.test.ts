import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('realm tag', () => {
	it('should convert headings to realm sections', () => {
		const result = parse(`{% realm name="Rivendell" %}
## Geography

A hidden valley.

## Notable Features

- Hall of Fire
- Libraries
{% /realm %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Realm');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');

		const sections = findAllTags(tag!, t => t.attributes.typeof === 'RealmSection');
		expect(sections.length).toBe(2);
	});

	it('should emit name as a span property', () => {
		const result = parse(`{% realm name="Mordor" %}
A dark land.
{% /realm %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Realm');
		const nameTag = findTag(tag!, t => t.name === 'span' && t.attributes.property === 'name');
		expect(nameTag).toBeDefined();
		expect(nameTag!.children[0]).toBe('Mordor');
	});

	it('should pass type and scale as meta tags', () => {
		const result = parse(`{% realm name="Rivendell" type="sanctuary" scale="settlement" %}
Content.
{% /realm %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Realm');
		const typeMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'realmType');
		expect(typeMeta).toBeDefined();
		expect(typeMeta!.attributes.content).toBe('sanctuary');

		const scaleMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'scale');
		expect(scaleMeta).toBeDefined();
		expect(scaleMeta!.attributes.content).toBe('settlement');
	});

	it('should pass parent attribute as meta', () => {
		const result = parse(`{% realm name="Rivendell" parent="Eriador" %}
Content.
{% /realm %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Realm');
		const parentMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'parent');
		expect(parentMeta).toBeDefined();
		expect(parentMeta!.attributes.content).toBe('Eriador');
	});

	it('should work with location alias', () => {
		const result = parse(`{% location name="The Shire" %}
A peaceful land.
{% /location %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Realm');
		expect(tag).toBeDefined();
	});
});
