/**
 * These expectations are hand-written and deliberately partial — they say what a
 * rune's structured data is *for*, in a form a reader can check by eye.
 *
 * For the catalog-wide question "what does every rune emit today", the
 * authoritative record is `contracts/seo-baseline/baseline.json` (WORK-562):
 * 41 fixtures over all 30 emitting runes, regenerated with
 * `npm run seo:baseline` and guarded by a drift test. These files assert intent;
 * the baseline records fact, defects included. Where the two disagree, the
 * baseline is what shipped — and one of them is a bug.
 */
import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { extractSeo } from '@refrakt-md/runes';

function seo(content: string) {
	const tree = parse(content);
	return extractSeo(tree, {} as any, '/test');
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
		// A string since WORK-571 — the position is generated as `String(index + 1)`
		// so the RDFa attribute and the JSON-LD say the same thing (SPEC-130 D8).
		expect(list.itemListElement[0].position).toBe('1');
	});
});
