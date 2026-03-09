import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { runes, extractSeo, buildSeoTypeMap } from '@refrakt-md/runes';

const seoTypeMap = buildSeoTypeMap(runes);
seoTypeMap.set('character', 'Person');
seoTypeMap.set('realm', 'Place');
seoTypeMap.set('faction', 'Organization');
seoTypeMap.set('lore', 'Article');
seoTypeMap.set('plot', 'CreativeWork');

function seo(content: string) {
	const tree = parse(content);
	return extractSeo(tree, seoTypeMap, {} as any, '/test');
}

describe('SEO: Person from character', () => {
	it('should extract Person with name and role', () => {
		const result = seo(`{% character name="Veshra" role="antagonist" %}
## Backstory

A powerful necromancer from the northern wastes.
{% /character %}`);

		expect(result.jsonLd).toHaveLength(1);
		const person = result.jsonLd[0] as any;
		expect(person['@context']).toBe('https://schema.org');
		expect(person['@type']).toBe('Person');
		expect(person.name).toBe('Veshra');
		expect(person.jobTitle).toBe('antagonist');
	});

	it('should extract Person without crashing when no image is at top level', () => {
		const result = seo(`{% character name="Aragorn" role="protagonist" %}
A ranger from the North.
{% /character %}`);

		const person = result.jsonLd[0] as any;
		expect(person['@type']).toBe('Person');
		expect(person.name).toBe('Aragorn');
	});
});

describe('SEO: Place from realm', () => {
	it('should extract Place with name and type', () => {
		const result = seo(`{% realm name="Rivendell" type="sanctuary" scale="settlement" %}
The Last Homely House East of the Sea.
{% /realm %}`);

		expect(result.jsonLd).toHaveLength(1);
		const place = result.jsonLd[0] as any;
		expect(place['@context']).toBe('https://schema.org');
		expect(place['@type']).toBe('Place');
		expect(place.name).toBe('Rivendell');
		expect(place.additionalType).toBe('sanctuary');
	});
});

describe('SEO: Organization from faction', () => {
	it('should extract Organization with name', () => {
		const result = seo(`{% faction name="The Silver Order" type="knightly order" alignment="lawful" %}
A prestigious order of knights sworn to protect the realm.
{% /faction %}`);

		expect(result.jsonLd).toHaveLength(1);
		const org = result.jsonLd[0] as any;
		expect(org['@context']).toBe('https://schema.org');
		expect(org['@type']).toBe('Organization');
	});
});

describe('SEO: Article from lore', () => {
	it('should extract Article with title and category', () => {
		const result = seo(`{% lore title="The Prophecy of the Chosen One" category="prophecy" %}
An ancient text found in the ruins of the First Temple.
{% /lore %}`);

		expect(result.jsonLd).toHaveLength(1);
		const article = result.jsonLd[0] as any;
		expect(article['@context']).toBe('https://schema.org');
		expect(article['@type']).toBe('Article');
		expect(article.headline).toBe('The Prophecy of the Chosen One');
		expect(article.articleSection).toBe('prophecy');
	});
});

describe('SEO: CreativeWork from plot', () => {
	it('should extract CreativeWork with title and type', () => {
		const result = seo(`{% plot title="The Quest for the Crown" type="quest" structure="linear" %}
- [x] **Discovery** — Find the ancient map
- [>] **Journey** — Travel to the vault
- [ ] **Victory** — Recover the artifact
{% /plot %}`);

		expect(result.jsonLd).toHaveLength(1);
		const work = result.jsonLd[0] as any;
		expect(work['@context']).toBe('https://schema.org');
		expect(work['@type']).toBe('CreativeWork');
		expect(work.name).toBe('The Quest for the Crown');
		expect(work.genre).toBe('quest');
	});
});
