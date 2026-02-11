import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('figure tag', () => {
	it('should transform image with caption attribute', () => {
		const result = parse(`{% figure caption="A sunset" %}
![Sunset](/images/sunset.jpg)
{% /figure %}`);

		const fig = findTag(result as any, t => t.attributes.typeof === 'Figure');
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

		const fig = findTag(result as any, t => t.attributes.typeof === 'Figure');
		expect(fig).toBeDefined();

		const caption = findTag(fig!, t => t.name === 'figcaption');
		expect(caption).toBeDefined();
	});

	it('should render size and align as meta tags', () => {
		const result = parse(`{% figure size="large" align="center" %}
![Photo](/images/photo.jpg)
{% /figure %}`);

		const fig = findTag(result as any, t => t.attributes.typeof === 'Figure');
		expect(fig).toBeDefined();

		const sizeMeta = findTag(fig!, t => t.name === 'meta' && t.attributes.property === 'size');
		expect(sizeMeta).toBeDefined();
		expect(sizeMeta!.attributes.content).toBe('large');

		const alignMeta = findTag(fig!, t => t.name === 'meta' && t.attributes.property === 'align');
		expect(alignMeta).toBeDefined();
		expect(alignMeta!.attributes.content).toBe('center');
	});
});
