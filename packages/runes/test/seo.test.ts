import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';
import { runes, extractSeo, buildSeoTypeMap } from '../src/index.js';

const seoTypeMap = buildSeoTypeMap(runes);

function seo(content: string, frontmatter: Record<string, any> = {}, url = '/test') {
	const tree = parse(content);
	return extractSeo(tree, seoTypeMap, frontmatter as any, url);
}

describe('JSON-LD extraction', () => {
	it('should extract FAQPage from accordion/faq', () => {
		const result = seo(`{% faq headingLevel=2 %}
## What is refrakt.md?

A content framework.

## How do I install it?

Run npm install.
{% /faq %}`);

		expect(result.jsonLd).toHaveLength(1);
		const faq = result.jsonLd[0] as any;
		expect(faq['@context']).toBe('https://schema.org');
		expect(faq['@type']).toBe('FAQPage');
		expect(faq.mainEntity).toHaveLength(2);
		expect(faq.mainEntity[0]['@type']).toBe('Question');
		expect(faq.mainEntity[0].name).toBe('What is refrakt.md?');
		expect(faq.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
		expect(faq.mainEntity[0].acceptedAnswer.text).toContain('content framework');
		expect(faq.mainEntity[1].name).toBe('How do I install it?');
	});

	it('should extract BreadcrumbList from breadcrumb', () => {
		const result = seo(`{% breadcrumb %}
- [Home](/)
- [Docs](/docs)
- Current Page
{% /breadcrumb %}`);

		expect(result.jsonLd).toHaveLength(1);
		const bc = result.jsonLd[0] as any;
		expect(bc['@type']).toBe('BreadcrumbList');
		expect(bc.itemListElement).toHaveLength(3);
		expect(bc.itemListElement[0].position).toBe(1);
		expect(bc.itemListElement[0].name).toBe('Home');
		expect(bc.itemListElement[0].item).toBe('/');
		expect(bc.itemListElement[1].position).toBe(2);
		expect(bc.itemListElement[2].position).toBe(3);
	});

	it('should extract VideoObject from embed', () => {
		const result = seo(`{% embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" %}
Watch the video.
{% /embed %}`);

		expect(result.jsonLd).toHaveLength(1);
		const video = result.jsonLd[0] as any;
		expect(video['@type']).toBe('VideoObject');
		expect(video.embedUrl).toContain('youtube-nocookie.com');
	});

	it('should produce multiple JSON-LD blocks for multiple runes', () => {
		const result = seo(`{% faq headingLevel=2 %}
## Question one?

Answer one.
{% /faq %}

{% embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" %}
Watch the video.
{% /embed %}`);

		expect(result.jsonLd).toHaveLength(2);
		const types = result.jsonLd.map((ld: any) => ld['@type']);
		expect(types).toContain('FAQPage');
		expect(types).toContain('VideoObject');
	});

	it('should extract Dataset from datatable', () => {
		const result = seo(`{% datatable sortable="name,age" searchable=true %}
| Name | Age | City |
|------|-----|------|
| Alice | 30 | NYC |
| Bob | 25 | LA |
{% /datatable %}`);

		expect(result.jsonLd).toHaveLength(1);
		const dataset = result.jsonLd[0] as any;
		expect(dataset['@context']).toBe('https://schema.org');
		expect(dataset['@type']).toBe('Dataset');
	});

	it('should extract ImageObject from figure', () => {
		const result = seo(`{% figure caption="A sunset over the ocean" %}
![Sunset](/images/sunset.jpg)
{% /figure %}`);

		expect(result.jsonLd).toHaveLength(1);
		const img = result.jsonLd[0] as any;
		expect(img['@context']).toBe('https://schema.org');
		expect(img['@type']).toBe('ImageObject');
		expect(img.caption).toBe('A sunset over the ocean');
	});
});

describe('OG meta extraction', () => {
	it('should extract title from first h1', () => {
		const result = seo(`# Hello World

Some content here.`);

		expect(result.og.title).toBe('Hello World');
	});

	it('should extract description from first paragraph', () => {
		const result = seo(`# Title

This is a description paragraph.`);

		expect(result.og.description).toContain('description paragraph');
	});

	it('should use frontmatter over content', () => {
		const result = seo(
			`# Content Title

Content description.`,
			{ title: 'FM Title', description: 'FM Description' },
		);

		expect(result.og.title).toBe('FM Title');
		expect(result.og.description).toBe('FM Description');
	});

	it('should set url and type', () => {
		const result = seo(`# Test`, {}, '/about');

		expect(result.og.url).toBe('/about');
		expect(result.og.type).toBe('website');
	});

	it('should truncate description to 200 chars', () => {
		const longText = 'A'.repeat(300);
		const result = seo(`# Title\n\n${longText}`);

		expect(result.og.description!.length).toBeLessThanOrEqual(200);
	});
});
