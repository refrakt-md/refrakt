import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

describe('organization tag', () => {
	it('should transform a basic organization', () => {
		const result = parse(`{% organization type="LocalBusiness" %}
# Acme Corp

A leading technology company.

- [Website](https://acme.com)
- [Twitter](https://twitter.com/acme)
{% /organization %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'organization');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass type as meta', () => {
		const result = parse(`{% organization type="LocalBusiness" %}
# Test Org

Description.
{% /organization %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'organization');
		expect(fields(tag).type).toBe('LocalBusiness');
	});

	it('should work with business alias', () => {
		const result = parse(`{% business %}
# My Business

Open Monday to Friday.
{% /business %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'organization');
		expect(tag).toBeDefined();
	});

	it('should unwrap a paragraph-wrapped logo image in the header', () => {
		const result = parse(`{% organization name="Acme" %}
![logo](/logo.png)

# Acme Corp

About us.
{% /organization %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'organization');
		expect(tag).toBeDefined();
		const wrapped = findAllTags(tag!, t => t.name === 'p').some(
			p => p.children.some((c: any) => c?.name === 'img'),
		);
		expect(wrapped).toBe(false);
		expect(findTag(tag!, t => t.name === 'img')).toBeDefined();
	});
});
