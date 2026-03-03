import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('map tag', () => {
	it('should create a Map component from a pin list', () => {
		const result = parse(`{% map %}
- 48.8566, 2.3522
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Map');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('div');
	});

	it('should create MapPin children from list items', () => {
		const result = parse(`{% map %}
- 48.8566, 2.3522
- 48.8530, 2.3499
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Map');
		const pins = findAllTags(tag!, t => t.attributes.typeof === 'MapPin');
		expect(pins.length).toBe(2);
		expect(pins[0].name).toBe('li');
	});

	it('should parse coordinates from list items', () => {
		const result = parse(`{% map %}
- 48.8566, 2.3522
{% /map %}`);

		const pin = findTag(result as any, t => t.attributes.typeof === 'MapPin');
		expect(pin).toBeDefined();

		const latMeta = findTag(pin!, t => t.name === 'meta' && t.attributes.property === 'lat');
		const lngMeta = findTag(pin!, t => t.name === 'meta' && t.attributes.property === 'lng');
		expect(latMeta?.attributes.content).toBe('48.8566');
		expect(lngMeta?.attributes.content).toBe('2.3522');
	});

	it('should parse pin name from bold text', () => {
		const result = parse(`{% map %}
- **Eiffel Tower** - 48.8566, 2.3522
{% /map %}`);

		const pin = findTag(result as any, t => t.attributes.typeof === 'MapPin');
		const nameSpan = findTag(pin!, t => t.name === 'span' && t.attributes.property === 'name');
		expect(nameSpan?.children[0]).toBe('Eiffel Tower');
	});

	it('should parse pin description from italic text', () => {
		const result = parse(`{% map %}
- **Eiffel Tower** - *Iconic iron tower* - 48.8566, 2.3522
{% /map %}`);

		const pin = findTag(result as any, t => t.attributes.typeof === 'MapPin');
		const descSpan = findTag(pin!, t => t.name === 'span' && t.attributes.property === 'description');
		expect(descSpan?.children[0]).toBe('Iconic iron tower');
	});

	it('should extract address text', () => {
		const result = parse(`{% map %}
- **Office** - 123 Main St, City
{% /map %}`);

		const pin = findTag(result as any, t => t.attributes.typeof === 'MapPin');
		const addressMeta = findTag(pin!, t => t.name === 'meta' && t.attributes.property === 'address');
		expect(addressMeta?.attributes.content).toContain('123 Main St');
	});

	it('should group pins from headings', () => {
		const result = parse(`{% map %}
## Restaurants
- **Dishoom** - 51.5114, -0.1263
## Museums
- **Tate Modern** - 51.5076, -0.0994
{% /map %}`);

		const pins = findAllTags(result as any, t => t.attributes.typeof === 'MapPin');
		expect(pins.length).toBe(2);

		const group1 = findTag(pins[0], t => t.name === 'meta' && t.attributes.property === 'group');
		expect(group1?.attributes.content).toBe('Restaurants');

		const group2 = findTag(pins[1], t => t.name === 'meta' && t.attributes.property === 'group');
		expect(group2?.attributes.content).toBe('Museums');
	});

	it('should pass zoom and center attributes as meta tags', () => {
		const result = parse(`{% map zoom="15" center="48.8566, 2.3522" %}
- 48.8566, 2.3522
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Map');
		const zoomMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'zoom');
		const centerMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'center');
		expect(zoomMeta?.attributes.content).toBe('15');
		expect(centerMeta?.attributes.content).toBe('48.8566, 2.3522');
	});

	it('should pass style and height as meta tags', () => {
		const result = parse(`{% map style="dark" height="large" %}
- 48.8566, 2.3522
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Map');
		const styleMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'style');
		const heightMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'height');
		expect(styleMeta?.attributes.content).toBe('dark');
		expect(heightMeta?.attributes.content).toBe('large');
	});

	it('should pass route and cluster as meta tags', () => {
		const result = parse(`{% map route="true" cluster="true" %}
- 48.8566, 2.3522
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Map');
		const routeMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'route');
		const clusterMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'cluster');
		expect(routeMeta?.attributes.content).toBe('true');
		expect(clusterMeta?.attributes.content).toBe('true');
	});

	it('should wrap pins in an ol element', () => {
		const result = parse(`{% map %}
- 48.8566, 2.3522
- 48.8530, 2.3499
{% /map %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Map');
		const ol = findTag(tag!, t => t.name === 'ol');
		expect(ol).toBeDefined();
		const pins = findAllTags(ol!, t => t.attributes.typeof === 'MapPin');
		expect(pins.length).toBe(2);
	});

	it('should preserve negative coordinates', () => {
		const result = parse(`{% map route="true" %}
- **Portland** - 45.5152, -122.6784
- **San Francisco** - 37.7749, -122.4194
{% /map %}`);

		const pins = findAllTags(result as any, t => t.attributes.typeof === 'MapPin');
		expect(pins.length).toBe(2);

		const lat0 = findTag(pins[0], t => t.name === 'meta' && t.attributes.property === 'lat');
		const lng0 = findTag(pins[0], t => t.name === 'meta' && t.attributes.property === 'lng');
		expect(lat0?.attributes.content).toBe('45.5152');
		expect(lng0?.attributes.content).toBe('-122.6784');

		const lat1 = findTag(pins[1], t => t.name === 'meta' && t.attributes.property === 'lat');
		const lng1 = findTag(pins[1], t => t.name === 'meta' && t.attributes.property === 'lng');
		expect(lat1?.attributes.content).toBe('37.7749');
		expect(lng1?.attributes.content).toBe('-122.4194');
	});

	it('should handle named pin with coordinates', () => {
		const result = parse(`{% map %}
- **Louvre Museum** - 48.8606, 2.3376
{% /map %}`);

		const pin = findTag(result as any, t => t.attributes.typeof === 'MapPin');
		const nameSpan = findTag(pin!, t => t.name === 'span' && t.attributes.property === 'name');
		const latMeta = findTag(pin!, t => t.name === 'meta' && t.attributes.property === 'lat');
		const lngMeta = findTag(pin!, t => t.name === 'meta' && t.attributes.property === 'lng');

		expect(nameSpan?.children[0]).toBe('Louvre Museum');
		expect(latMeta?.attributes.content).toBe('48.8606');
		expect(lngMeta?.attributes.content).toBe('2.3376');
	});
});
