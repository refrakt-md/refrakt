import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('event tag', () => {
	it('should transform a basic event', () => {
		const result = parse(`{% event date="2025-06-15" location="San Francisco, CA" url="https://example.com/register" %}
# Tech Conference 2025

Join us for the biggest tech event of the year.

- Keynote by Jane Smith
- Workshop: Building with AI
- Networking dinner
{% /event %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'event');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass date and location as meta', () => {
		const result = parse(`{% event date="2025-03-01" endDate="2025-03-03" location="Online" %}
# Virtual Summit

A three-day online event.
{% /event %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'event');
		// SPEC-082: field values live in the data-rune-fields bag.
		const fields = JSON.parse(tag!.attributes['data-rune-fields'] as string);
		expect(fields.date).toBe('2025-03-01');
		expect(fields.endDate).toBe('2025-03-03');
		expect(fields.location).toBe('Online');
	});

	it('should unwrap a paragraph-wrapped banner image in the header', () => {
		const result = parse(`{% event name="Launch" %}
![banner](/banner.png)

# Launch Party

Details here.
{% /event %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'event');
		expect(tag).toBeDefined();
		// The banner image sits bare in the header, not wrapped in a <p>.
		const wrapped = findAllTags(tag!, t => t.name === 'p').some(
			p => p.children.some((c: any) => c?.name === 'img'),
		);
		expect(wrapped).toBe(false);
		expect(findTag(tag!, t => t.name === 'img')).toBeDefined();
	});
});
