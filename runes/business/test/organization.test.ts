import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('organization tag', () => {
	it('should transform a basic organization', () => {
		const result = parse(`{% organization type="LocalBusiness" %}
# Acme Corp

A leading technology company.

- [Website](https://acme.com)
- [Twitter](https://twitter.com/acme)
{% /organization %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Organization');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass type as meta', () => {
		const result = parse(`{% organization type="LocalBusiness" %}
# Test Org

Description.
{% /organization %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Organization');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'type');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('LocalBusiness');
	});

	it('should work with business alias', () => {
		const result = parse(`{% business %}
# My Business

Open Monday to Friday.
{% /business %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Organization');
		expect(tag).toBeDefined();
	});
});
