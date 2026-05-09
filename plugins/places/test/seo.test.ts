import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { extractSeo } from '@refrakt-md/runes';

function seo(content: string) {
	const tree = parse(content);
	return extractSeo(tree, {} as any, '/test');
}

describe('SEO: Event', () => {
	it('should extract Event with date, location, and description', () => {
		const result = seo(`{% event date="2026-03-15" endDate="2026-03-17" location="Stockholm, Sweden" url="https://example.com/register" %}
# Nordic Developer Summit

A three-day conference for developers and designers.
{% /event %}`);

		expect(result.jsonLd).toHaveLength(1);
		const event = result.jsonLd[0] as any;
		expect(event['@context']).toBe('https://schema.org');
		expect(event['@type']).toBe('Event');
		expect(event.name).toBe('Nordic Developer Summit');
		expect(event.description).toContain('three-day conference');
		expect(event.startDate).toBe('2026-03-15');
		expect(event.endDate).toBe('2026-03-17');
		expect(event.location).toBeDefined();
		expect(event.location['@type']).toBe('Place');
		expect(event.location.name).toBe('Stockholm, Sweden');
		expect(event.url).toBe('https://example.com/register');
	});
});

describe('SEO: Place from map', () => {
	it('should extract Place from map rune', () => {
		const result = seo(`{% map zoom="13" %}
- **Eiffel Tower** - *Iconic iron lattice tower* - 48.8566, 2.3522
{% /map %}`);

		expect(result.jsonLd).toHaveLength(1);
		const place = result.jsonLd[0] as any;
		expect(place['@context']).toBe('https://schema.org');
		expect(place['@type']).toBe('Place');
	});
});
