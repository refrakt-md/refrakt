import { describe, it, expect } from 'vitest';
import { createTransform } from '@refrakt-md/transform';
import type { ThemeConfig } from '@refrakt-md/transform';
import type { SerializedTag } from '@refrakt-md/types';
import { parse, findTag } from './helpers.js';
import { config as placesConfig } from '../src/config.js';

// SPEC-125 Phase 1 / WORK-531 — the itinerary family. The audit flagged
// `ItineraryDay` as missing a header-ish role; the assessment declines it and
// finds an undeclared body slot on `ItineraryStop` instead.

const themeConfig: ThemeConfig = { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: placesConfig };

function transformed(content: string): SerializedTag {
	const found = findTag(parse(content) as any, (t) => t.attributes['data-rune'] === 'itinerary');
	expect(found, 'no itinerary in schema output').toBeDefined();
	return createTransform(themeConfig)(JSON.parse(JSON.stringify(found)) as SerializedTag) as SerializedTag;
}

function findByAttr(node: any, attr: string, value: string): any {
	if (!node || typeof node !== 'object') return undefined;
	if (node.attributes?.[attr] === value) return node;
	for (const c of node.children ?? []) {
		const hit = findByAttr(c, attr, value);
		if (hit) return hit;
	}
	return undefined;
}

// h2 headings become days, h3 headings become "time — location" stops.
const src = `{% itinerary %}
# Japan in a week

## Day 1 — Arrival

### 9:00 AM — Narita Airport

Clear customs and pick up your Japan Rail Pass.
{% /itinerary %}`;

describe('itinerary section roles', () => {
	it('the stop body carries data-section="body"', () => {
		const stop = findByAttr(transformed(src), 'data-rune', 'itinerary-stop');
		expect(stop, 'no itinerary-stop in output').toBeDefined();
		expect(findByAttr(stop, 'data-name', 'body')?.attributes['data-section']).toBe('body');
	});

	it('the day header carries no header-ish role', () => {
		// Deliberate. The parent `itinerary` already holds `title` on its
		// headline, and `prominence` scales *the* header of a page-section
		// family rune — a second title in the same subtree flattens the
		// hierarchy it exists to scale.
		const day = findByAttr(transformed(src), 'data-rune', 'itinerary-day');
		const header = findByAttr(day, 'data-name', 'header');
		expect(header).toBeDefined();
		expect(header?.attributes['data-section']).toBeUndefined();
	});

	it('the itinerary keeps the title role, so the subtree has exactly one', () => {
		const out = transformed(src);
		expect(findByAttr(out, 'data-name', 'headline')?.attributes['data-section']).toBe('title');
	});

	it('the day stop list is not a body', () => {
		const day = findByAttr(transformed(src), 'data-rune', 'itinerary-day');
		const stops = findByAttr(day, 'data-name', 'stops');
		expect(stops).toBeDefined();
		expect(stops?.attributes['data-section']).toBeUndefined();
	});
});
