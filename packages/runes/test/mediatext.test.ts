import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('mediatext tag', () => {
	it('should extract image into media ref and text into body ref', () => {
		const result = parse(`{% mediatext %}
![Photo](/images/photo.jpg)

Some body text here.
{% /mediatext %}`);

		const mt = findTag(result as any, t => t.attributes.typeof === 'MediaText');
		expect(mt).toBeDefined();
		expect(mt!.name).toBe('div');

		// Media div should contain the extracted image
		const media = findTag(mt!, t => t.attributes['data-name'] === 'media');
		expect(media).toBeDefined();
		const img = findTag(media!, t => t.name === 'img');
		expect(img).toBeDefined();
		expect(img!.attributes.src).toBe('/images/photo.jpg');

		// Body div should contain text but not the image
		const body = findTag(mt!, t => t.attributes['data-name'] === 'body');
		expect(body).toBeDefined();
		const bodyImg = findTag(body!, t => t.name === 'img');
		expect(bodyImg).toBeUndefined();
	});

	it('should extract multiple images', () => {
		const result = parse(`{% mediatext %}
![First](/images/first.jpg)

![Second](/images/second.jpg)

Body text.
{% /mediatext %}`);

		const mt = findTag(result as any, t => t.attributes.typeof === 'MediaText');
		const media = findTag(mt!, t => t.attributes['data-name'] === 'media');
		const images = findAllTags(media!, t => t.name === 'img');
		expect(images.length).toBe(2);
	});

	it('should handle no images gracefully', () => {
		const result = parse(`{% mediatext %}
Just some text without any images.
{% /mediatext %}`);

		const mt = findTag(result as any, t => t.attributes.typeof === 'MediaText');
		expect(mt).toBeDefined();

		const media = findTag(mt!, t => t.attributes['data-name'] === 'media');
		expect(media).toBeDefined();
		const img = findTag(media!, t => t.name === 'img');
		expect(img).toBeUndefined();
	});

	it('should render align and ratio as meta tags', () => {
		const result = parse(`{% mediatext align="right" ratio="2:1" %}
![Photo](/images/photo.jpg)

Text content.
{% /mediatext %}`);

		const mt = findTag(result as any, t => t.attributes.typeof === 'MediaText');

		const alignMeta = findTag(mt!, t => t.name === 'meta' && t.attributes.property === 'align');
		expect(alignMeta).toBeDefined();
		expect(alignMeta!.attributes.content).toBe('right');

		const ratioMeta = findTag(mt!, t => t.name === 'meta' && t.attributes.property === 'ratio');
		expect(ratioMeta).toBeDefined();
		expect(ratioMeta!.attributes.content).toBe('2:1');
	});

	it('should render wrap meta tag when enabled', () => {
		const result = parse(`{% mediatext wrap=true %}
![Photo](/images/photo.jpg)

Text content.
{% /mediatext %}`);

		const mt = findTag(result as any, t => t.attributes.typeof === 'MediaText');

		const wrapMeta = findTag(mt!, t => t.name === 'meta' && t.attributes.property === 'wrap');
		expect(wrapMeta).toBeDefined();
		expect(wrapMeta!.attributes.content).toBe('true');
	});

	it('should not render wrap meta tag when disabled', () => {
		const result = parse(`{% mediatext %}
![Photo](/images/photo.jpg)

Text content.
{% /mediatext %}`);

		const mt = findTag(result as any, t => t.attributes.typeof === 'MediaText');

		const wrapMeta = findTag(mt!, t => t.name === 'meta' && t.attributes.property === 'wrap');
		expect(wrapMeta).toBeUndefined();
	});
});
