import { describe, it, expect } from 'vitest';
import { parse, findTag, fields } from './helpers.js';

describe('figure tag', () => {
	it('should transform image with caption attribute', () => {
		const result = parse(`{% figure caption="A sunset" %}
![Sunset](/images/sunset.jpg)
{% /figure %}`);

		const fig = findTag(result as any, t => t.attributes['data-rune'] === 'figure');
		expect(fig).toBeDefined();
		expect(fig!.name).toBe('figure');

		const caption = findTag(fig!, t => t.name === 'figcaption');
		expect(caption).toBeDefined();
		expect(caption!.children).toContain('A sunset');
	});

	it('should use paragraph as caption when no attribute given', () => {
		const result = parse(`{% figure %}
![Sunset](/images/sunset.jpg)

A beautiful sunset over the ocean.
{% /figure %}`);

		const fig = findTag(result as any, t => t.attributes['data-rune'] === 'figure');
		expect(fig).toBeDefined();

		const caption = findTag(fig!, t => t.name === 'figcaption');
		expect(caption).toBeDefined();
	});

	it('should render size and align as meta tags', () => {
		const result = parse(`{% figure size="large" align="center" %}
![Photo](/images/photo.jpg)
{% /figure %}`);

		const fig = findTag(result as any, t => t.attributes['data-rune'] === 'figure');
		expect(fig).toBeDefined();

		expect(fields(fig).size).toBe('large');
		expect(fields(fig).align).toBe('center');
	});

	// SPEC-106 regression — a `placeholder:`/`icon:` scheme src resolves to an
	// inline <svg>, not <img>; the figure must still keep it as its media.
	it('keeps a scheme-resolved <svg> placeholder as the figure media', () => {
		const result = parse(`{% figure caption="Dashboard overview" %}
![Dashboard](placeholder:cover)
{% /figure %}`);

		const fig = findTag(result as any, t => t.attributes['data-rune'] === 'figure');
		expect(fig).toBeDefined();
		const svg = findTag(fig!, t => t.name === 'svg' && /rf-placeholder/.test(String(t.attributes.class)));
		expect(svg).toBeDefined();
		expect(svg!.attributes['data-shape']).toBe('cover');
	});
});
