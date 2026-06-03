import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('embed tag', () => {
	it('should detect YouTube URL and transform to embed URL', () => {
		const result = parse(`{% embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" %}
Watch the video.
{% /embed %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'embed');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('figure');

		const embedUrlMeta = findTag(tag!, t =>
			t.name === 'meta' && typeof t.attributes.content === 'string' && t.attributes.content.includes('youtube-nocookie.com/embed/')
		);
		expect(embedUrlMeta).toBeDefined();
	});

	it('should detect youtu.be short URLs', () => {
		const result = parse(`{% embed url="https://youtu.be/dQw4w9WgXcQ" %}{% /embed %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'embed');
		const embedUrlMeta = findTag(tag!, t =>
			t.name === 'meta' && typeof t.attributes.content === 'string' && t.attributes.content.includes('youtube-nocookie.com/embed/dQw4w9WgXcQ')
		);
		expect(embedUrlMeta).toBeDefined();
	});

	it('should default aspect ratio to 16:9 (56.25% padding on the wrapper)', () => {
		const result = parse(`{% embed url="https://example.com/video" %}{% /embed %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'embed');
		// SPEC-081: the transform builds the wrapper; aspect drives its padding.
		const wrapper = findTag(tag!, t => t.name === 'div' && t.attributes['data-name'] === 'wrapper');
		expect(wrapper).toBeDefined();
		expect(String(wrapper!.attributes.style)).toContain('56.25%');
	});

	it('should accept a manual type override without error', () => {
		const result = parse(`{% embed url="https://example.com/content" type="video" %}{% /embed %}`);

		// `type` is a vestigial attribute now (no output surface); it must still
		// be accepted and the embed must transform.
		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'embed');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('figure');
	});

	it('should preserve fallback content', () => {
		const result = parse(`{% embed url="https://youtube.com/watch?v=abc" %}
Watch this video for a demo.
{% /embed %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'embed');
		const fallback = findTag(tag!, t => t.name === 'div');
		expect(fallback).toBeDefined();
	});

	it('should detect CodePen URLs', () => {
		const result = parse(`{% embed url="https://codepen.io/user/pen/abc123" %}{% /embed %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'embed');
		// SPEC-082: provider rides the data-rune-fields bag (→ data-provider).
		const fields = JSON.parse(tag!.attributes['data-rune-fields'] as string);
		expect(fields.provider).toBe('codepen');
	});
});
