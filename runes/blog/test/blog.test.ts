import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

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

		const metas = findAllTags(tag!, t => t.name === 'meta');
		const folder = metas.find(m => m.attributes['data-field'] === 'folder');
		expect(folder).toBeDefined();
		expect(folder!.attributes.content).toBe('/articles');

		const sort = metas.find(m => m.attributes['data-field'] === 'sort');
		expect(sort).toBeDefined();
		expect(sort!.attributes.content).toBe('title-asc');

		const layout = metas.find(m => m.attributes['data-field'] === 'layout');
		expect(layout).toBeDefined();
		expect(layout!.attributes.content).toBe('grid');

		const limit = metas.find(m => m.attributes['data-field'] === 'limit');
		expect(limit).toBeDefined();
		expect(limit!.attributes.content).toBe('5');
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
		const metas = findAllTags(tag!, t => t.name === 'meta');

		const sort = metas.find(m => m.attributes['data-field'] === 'sort');
		expect(sort!.attributes.content).toBe('date-desc');

		const layout = metas.find(m => m.attributes['data-field'] === 'layout');
		expect(layout!.attributes.content).toBe('list');
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
