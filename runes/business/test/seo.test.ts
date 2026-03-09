import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { runes, extractSeo, buildSeoTypeMap } from '@refrakt-md/runes';

const seoTypeMap = buildSeoTypeMap(runes);
seoTypeMap.set('cast', 'Person');
seoTypeMap.set('cast-member', 'Person');
seoTypeMap.set('organization', 'Organization');
seoTypeMap.set('timeline', 'ItemList');
seoTypeMap.set('timeline-entry', 'ListItem');

function seo(content: string) {
	const tree = parse(content);
	return extractSeo(tree, seoTypeMap, {} as any, '/test');
}

describe('SEO: Person from cast', () => {
	it('should extract Person entries from cast members', () => {
		const result = seo(`{% cast %}
- Alice Chen — Lead Engineer
- Bob Martinez — Product Designer
{% /cast %}`);

		expect(result.jsonLd.length).toBeGreaterThanOrEqual(1);
		const people = result.jsonLd.filter((ld: any) => ld['@type'] === 'Person');
		expect(people.length).toBeGreaterThanOrEqual(1);
		const person = people[0] as any;
		expect(person['@context']).toBe('https://schema.org');
		expect(person.name).toBeDefined();
	});
});

describe('SEO: Organization', () => {
	it('should extract Organization with name and description', () => {
		const result = seo(`{% organization type="LocalBusiness" %}
# Acme Coffee Shop

Your neighborhood coffee shop since 2015.
{% /organization %}`);

		expect(result.jsonLd).toHaveLength(1);
		const org = result.jsonLd[0] as any;
		expect(org['@context']).toBe('https://schema.org');
		expect(org['@type']).toBe('LocalBusiness');
		expect(org.name).toBe('Acme Coffee Shop');
		expect(org.description).toContain('neighborhood coffee shop');
	});
});

describe('SEO: ItemList from timeline', () => {
	it('should extract ItemList from timeline entries', () => {
		const result = seo(`{% timeline %}
## 2024 — Project Inception

Initial prototype.

## 2025 — Open Source Launch

First public release.
{% /timeline %}`);

		expect(result.jsonLd).toHaveLength(1);
		const list = result.jsonLd[0] as any;
		expect(list['@context']).toBe('https://schema.org');
		expect(list['@type']).toBe('ItemList');
		expect(list.itemListElement).toBeDefined();
		expect(list.itemListElement.length).toBeGreaterThanOrEqual(2);
		expect(list.itemListElement[0]['@type']).toBe('ListItem');
		expect(list.itemListElement[0].position).toBe(1);
	});
});
