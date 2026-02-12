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

		const tag = findTag(result as any, t => t.attributes.typeof === 'Event');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass date and location as meta', () => {
		const result = parse(`{% event date="2025-03-01" endDate="2025-03-03" location="Online" %}
# Virtual Summit

A three-day online event.
{% /event %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Event');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		const date = metas.find(m => m.attributes.property === 'date');
		expect(date).toBeDefined();
		expect(date!.attributes.content).toBe('2025-03-01');

		const endDate = metas.find(m => m.attributes.property === 'endDate');
		expect(endDate).toBeDefined();
		expect(endDate!.attributes.content).toBe('2025-03-03');

		const location = metas.find(m => m.attributes.property === 'location');
		expect(location).toBeDefined();
		expect(location!.attributes.content).toBe('Online');
	});
});
