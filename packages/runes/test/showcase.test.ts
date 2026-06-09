import { describe, it, expect } from 'vitest';
import { parse, findTag, fields } from './helpers.js';

describe('showcase tag', () => {
	it('should produce a Showcase renderable with viewport ref', () => {
		const result = parse(`{% showcase %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('div');

		const viewport = findTag(tag!, t => t.attributes['data-name'] === 'viewport');
		expect(viewport).toBeDefined();
	});

	// SPEC-086: showcase's bespoke attributes are deprecated aliases that map to
	// `frame-*` facets (frameTarget: 'self'); shadow values remap soft→sm etc.
	it('maps deprecated shadow to a frame-shadow facet', () => {
		const result = parse(`{% showcase shadow="elevated" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(tag).toBeDefined();

		expect(fields(tag)['frame-shadow']).toBe('lg');
	});

	it('maps deprecated bleed to a frame-displace facet', () => {
		const result = parse(`{% showcase bleed="top" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(fields(tag)['frame-displace']).toBe('top');
	});

	it('maps deprecated offset to a frame-offset facet', () => {
		const result = parse(`{% showcase offset="lg" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(fields(tag)['frame-offset']).toBe('lg');
	});

	it('maps deprecated aspect to a frame-aspect facet', () => {
		const result = parse(`{% showcase aspect="16/9" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(fields(tag)['frame-aspect']).toBe('16/9');
	});

	it('should not emit meta tags for default values', () => {
		const result = parse(`{% showcase %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(tag).toBeDefined();

		expect(fields(tag)['frame-shadow']).toBeUndefined();
		expect(fields(tag)['frame-displace']).toBeUndefined();
	});

	it('maps multiple deprecated attributes to frame facets', () => {
		const result = parse(`{% showcase shadow="soft" bleed="both" offset="md" aspect="4/3" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(tag).toBeDefined();

		expect(fields(tag)['frame-shadow']).toBe('sm');
		expect(fields(tag)['frame-displace']).toBe('both');
		expect(fields(tag)['frame-offset']).toBe('md');
		expect(fields(tag)['frame-aspect']).toBe('4/3');
	});
});
