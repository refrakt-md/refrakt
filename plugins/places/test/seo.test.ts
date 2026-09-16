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

describe('SEO: Event', () => {
	it('should extract Event with date, location, and description', () => {
		const result =
			seo(`{% event date="2026-03-15" endDate="2026-03-17" location="Stockholm, Sweden" url="https://example.com/register" %}
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

describe('SEO: map publishes nothing', () => {
	it('no longer claims the map is itself a Place (WORK-567)', () => {
		// The rune used to type its root `Place` and give it no name, address or
		// geo — and even filled in, that would be the wrong claim: a map showing
		// the Eiffel Tower is not the Eiffel Tower. The coordinates and the name
		// below belong to the pin, which is where a `Place` can honestly live.
		const result = seo(`{% map zoom="13" %}
- **Eiffel Tower** - *Iconic iron lattice tower* - 48.8566, 2.3522
{% /map %}`);

		expect(result.jsonLd).toEqual([]);
	});
});
