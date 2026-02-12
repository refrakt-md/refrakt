import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('embed tag', () => {
	it('should detect YouTube URL and transform to embed URL', () => {
		const result = parse(`{% embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" %}
Watch the video.
{% /embed %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Embed');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('figure');

		const embedUrlMeta = findTag(tag!, t =>
			t.name === 'meta' && typeof t.attributes.content === 'string' && t.attributes.content.includes('youtube-nocookie.com/embed/')
		);
		expect(embedUrlMeta).toBeDefined();
	});

	it('should detect youtu.be short URLs', () => {
		const result = parse(`{% embed url="https://youtu.be/dQw4w9WgXcQ" %}{% /embed %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Embed');
		const embedUrlMeta = findTag(tag!, t =>
			t.name === 'meta' && typeof t.attributes.content === 'string' && t.attributes.content.includes('youtube-nocookie.com/embed/dQw4w9WgXcQ')
		);
		expect(embedUrlMeta).toBeDefined();
	});

	it('should default aspect ratio to 16:9', () => {
		const result = parse(`{% embed url="https://example.com/video" %}{% /embed %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Embed');
		const aspectMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === '16:9');
		expect(aspectMeta).toBeDefined();
	});

	it('should allow manual type override', () => {
		const result = parse(`{% embed url="https://example.com/content" type="video" %}{% /embed %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Embed');
		const typeMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'video');
		expect(typeMeta).toBeDefined();
	});

	it('should preserve fallback content', () => {
		const result = parse(`{% embed url="https://youtube.com/watch?v=abc" %}
Watch this video for a demo.
{% /embed %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Embed');
		const fallback = findTag(tag!, t => t.name === 'div');
		expect(fallback).toBeDefined();
	});

	it('should detect CodePen URLs', () => {
		const result = parse(`{% embed url="https://codepen.io/user/pen/abc123" %}{% /embed %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Embed');
		const providerMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'codepen');
		expect(providerMeta).toBeDefined();
	});
});
