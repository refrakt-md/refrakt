import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

describe('map tag', () => {
	it('should create a Map component from a pin list', () => {
		const result = parse(`{% map %}
- 48.8566, 2.3522
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'map');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('div');
	});

	it('should create MapPin children from list items', () => {
		const result = parse(`{% map %}
- 48.8566, 2.3522
- 48.8530, 2.3499
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'map');
		const pins = findAllTags(tag!, t => t.attributes['data-rune'] === 'map-pin');
		expect(pins.length).toBe(2);
		expect(pins[0].name).toBe('li');
	});

	it('should parse coordinates from list items', () => {
		const result = parse(`{% map %}
- 48.8566, 2.3522
{% /map %}`);

		const pin = findTag(result as any, t => t.attributes['data-rune'] === 'map-pin');
		expect(pin).toBeDefined();

		expect(fields(pin).lat).toBe('48.8566');
		expect(fields(pin).lng).toBe('2.3522');
	});

	it('should parse pin name from bold text', () => {
		const result = parse(`{% map %}
- **Eiffel Tower** - 48.8566, 2.3522
{% /map %}`);

		const pin = findTag(result as any, t => t.attributes['data-rune'] === 'map-pin');
		const nameSpan = findTag(pin!, t => t.name === 'span' && t.attributes['data-name'] === 'name');
		expect(nameSpan?.children[0]).toBe('Eiffel Tower');
	});

	it('should parse pin description from italic text', () => {
		const result = parse(`{% map %}
- **Eiffel Tower** - *Iconic iron tower* - 48.8566, 2.3522
{% /map %}`);

		const pin = findTag(result as any, t => t.attributes['data-rune'] === 'map-pin');
		const descSpan = findTag(pin!, t => t.name === 'span' && t.attributes['data-name'] === 'description');
		expect(descSpan?.children[0]).toBe('Iconic iron tower');
	});

	it('should extract address text', () => {
		const result = parse(`{% map %}
- **Office** - 123 Main St, City
{% /map %}`);

		const pin = findTag(result as any, t => t.attributes['data-rune'] === 'map-pin');
		expect(fields(pin).address).toContain('123 Main St');
	});

	it('should group pins from headings', () => {
		const result = parse(`{% map %}
## Restaurants
- **Dishoom** - 51.5114, -0.1263
## Museums
- **Tate Modern** - 51.5076, -0.0994
{% /map %}`);

		const pins = findAllTags(result as any, t => t.attributes['data-rune'] === 'map-pin');
		expect(pins.length).toBe(2);

		expect(fields(pins[0]).group).toBe('Restaurants');
		expect(fields(pins[1]).group).toBe('Museums');
	});

	it('should pass zoom and center attributes as meta tags', () => {
		const result = parse(`{% map zoom="15" center="48.8566, 2.3522" %}
- 48.8566, 2.3522
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'map');
		expect(fields(tag).zoom).toBe('15');
		expect(fields(tag).center).toBe('48.8566, 2.3522');
	});

	it('should pass variant and height as meta tags', () => {
		const result = parse(`{% map variant="dark" height="large" %}
- 48.8566, 2.3522
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'map');
		expect(fields(tag).variant).toBe('dark');
		expect(fields(tag).height).toBe('large');
	});

	it('should pass route and cluster as meta tags', () => {
		const result = parse(`{% map route="true" cluster="true" %}
- 48.8566, 2.3522
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'map');
		expect(fields(tag).route).toBe('true');
		expect(fields(tag).cluster).toBe('true');
	});

	it('should wrap pins in an ol element', () => {
		const result = parse(`{% map %}
- 48.8566, 2.3522
- 48.8530, 2.3499
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'map');
		const ol = findTag(tag!, t => t.name === 'ol');
		expect(ol).toBeDefined();
		const pins = findAllTags(ol!, t => t.attributes['data-rune'] === 'map-pin');
		expect(pins.length).toBe(2);
	});

	it('should preserve negative coordinates', () => {
		const result = parse(`{% map route="true" %}
- **Portland** - 45.5152, -122.6784
- **San Francisco** - 37.7749, -122.4194
{% /map %}`);

		const pins = findAllTags(result as any, t => t.attributes['data-rune'] === 'map-pin');
		expect(pins.length).toBe(2);

		expect(fields(pins[0]).lat).toBe('45.5152');
		expect(fields(pins[0]).lng).toBe('-122.6784');

		expect(fields(pins[1]).lat).toBe('37.7749');
		expect(fields(pins[1]).lng).toBe('-122.4194');
	});

	it('should handle named pin with coordinates', () => {
		const result = parse(`{% map %}
- **Louvre Museum** - 48.8606, 2.3376
{% /map %}`);

		const pin = findTag(result as any, t => t.attributes['data-rune'] === 'map-pin');
		const nameSpan = findTag(pin!, t => t.name === 'span' && t.attributes['data-name'] === 'name');

		expect(nameSpan?.children[0]).toBe('Louvre Museum');
		expect(fields(pin).lat).toBe('48.8606');
		expect(fields(pin).lng).toBe('2.3376');
	});
});
