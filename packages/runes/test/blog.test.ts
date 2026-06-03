import { describe, it, expect } from 'vitest';
import { parse, findTag, fields } from './helpers.js';

describe('blog tag', () => {
	it('should transform a basic blog listing', () => {
		const result = parse(`{% blog folder="/blog" %}
# Latest Posts

Check out our blog.
{% /blog %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'blog');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('section');
	});

	it('should pass folder as meta tag', () => {
		const result = parse(`{% blog folder="/articles" sort="title-asc" layout="grid" limit=5 %}
# Articles
{% /blog %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'blog');
		expect(tag).toBeDefined();

		expect(fields(tag).folder).toBe('/articles');
		expect(fields(tag).sort).toBe('title-asc');
		expect(fields(tag).layout).toBe('grid');
		expect(fields(tag).limit).toBe('5');
	});

	it('should include a posts container with data-name', () => {
		const result = parse(`{% blog folder="/blog" %}{% /blog %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'blog');
		expect(tag).toBeDefined();

		const posts = findTag(tag!, t => t.attributes['data-name'] === 'posts');
		expect(posts).toBeDefined();
		expect(posts!.name).toBe('div');
	});

	it('should use default values for optional attributes', () => {
		const result = parse(`{% blog folder="/blog" %}{% /blog %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'blog');
		expect(fields(tag).sort).toBe('date-desc');
		expect(fields(tag).layout).toBe('list');
	});

	it('should include header when heading and blurb are provided', () => {
		const result = parse(`{% blog folder="/blog" %}
# My Blog

A description of my blog.
{% /blog %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'blog');
		expect(tag).toBeDefined();

		// The header wraps the heading; look for an h1 inside the blog tag
		const heading = findTag(tag!, t => t.name === 'h1');
		expect(heading).toBeDefined();
	});
});
