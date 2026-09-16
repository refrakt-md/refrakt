/**
 * These expectations are hand-written and deliberately partial — they say what a
 * rune's structured data is *for*, in a form a reader can check by eye.
 *
 * For the catalog-wide question "what does every rune emit today", the
 * authoritative record is `contracts/seo-baseline/baseline.json` (WORK-562):
 * a fixture for every emitting rune, regenerated with
 * `npm run seo:baseline` and guarded by a drift test. These files assert intent;
 * the baseline records fact, defects included. Where the two disagree, the
 * baseline is what shipped — and one of them is a bug.
 */
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { parse, findTag } from './helpers.js';
import { extractSeo, collectJsonLd } from '../src/index.js';

const { Tag } = Markdoc;

function seo(content: string, frontmatter: Record<string, any> = {}, url = '/test') {
	const tree = parse(content);
	return extractSeo(tree, frontmatter as any, url);
}

describe('JSON-LD extraction', () => {
	it('should extract FAQPage from accordion/faq', () => {
		const result = seo(`{% faq %}
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
		// Positions are strings since WORK-571 — generated as `String(index + 1)`
		// so the RDFa attribute and the JSON-LD agree (SPEC-130 D8).
		expect(bc.itemListElement[0].position).toBe('1');
		expect(bc.itemListElement[0].name).toBe('Home');
		expect(bc.itemListElement[0].item).toBe('/');
		expect(bc.itemListElement[1].position).toBe('2');
		expect(bc.itemListElement[2].position).toBe('3');
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
		const result = seo(`{% faq %}
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

	it('should extract nothing from datatable', () => {
		// Inverted by WORK-567. This test used to assert the `Dataset` and check
		// only its `@type` and `@context` — which was the whole entity, and the
		// clearest sign that nobody had ever asked what it told a consumer.
		const result = seo(`{% datatable sortable="name,age" searchable=true %}
| Name | Age | City |
|------|-----|------|
| Alice | 30 | NYC |
| Bob | 25 | LA |
{% /datatable %}`);

		expect(result.jsonLd).toEqual([]);
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

// SPEC-130 D4 / WORK-567 — an entity with no properties is not emitted.
//
// Enforced in the collector rather than rune by rune, because the failure it
// guards against is one of omission: a rune declares a type and never gets
// around to the mapping. Seven shipped that way for years, each publishing
// `{"@context": …, "@type": "Dataset"}` and nothing else.
describe('D4 — an entity with no properties is not emitted', () => {
	const typed = (type: string, attrs: Record<string, unknown> = {}, children: unknown[] = []) =>
		new Tag('div', { typeof: type, ...attrs }, children as never);
	const prop = (name: string, text: string) => new Tag('span', { property: name }, [text] as never);

	it('drops a top-level entity that says nothing about itself', () => {
		expect(collectJsonLd(typed('Dataset'))).toEqual([]);
	});

	it('keeps one that says anything at all', () => {
		expect(collectJsonLd(typed('Dataset', {}, [prop('name', 'Sales')]))).toEqual([
			{ '@context': 'https://schema.org', '@type': 'Dataset', name: 'Sales' },
		]);
	});

	it('does not nest a bare child into its parent', () => {
		const tree = typed('Product', {}, [
			prop('name', 'Widget'),
			typed('Offer', { property: 'offers' }),
		]);
		expect(collectJsonLd(tree)).toEqual([
			{ '@context': 'https://schema.org', '@type': 'Product', name: 'Widget' },
		]);
	});

	it('counts a typed child as something the parent says', () => {
		// The reason the check runs after the recursion: an entity whose only
		// content is a nested entity is not bare, and asking before the walk would
		// find the property absent and drop a populated graph.
		const tree = typed('Product', {}, [
			typed('Offer', { property: 'offers' }, [prop('price', '9')]),
		]);
		expect(collectJsonLd(tree)).toEqual([
			{
				'@context': 'https://schema.org',
				'@type': 'Product',
				offers: { '@type': 'Offer', price: '9' },
			},
		]);
	});

	it('keeps a described entity nested inside a bare one', () => {
		// `map` before WORK-567: a bare `Place` wrapping pins that had names. The
		// wrapper goes; anything it contained that stands on its own stays.
		const tree = typed('Place', {}, [typed('Article', {}, [prop('name', 'Pin')])]);
		expect(collectJsonLd(tree)).toEqual([
			{ '@context': 'https://schema.org', '@type': 'Article', name: 'Pin' },
		]);
	});

	it('leaves the document order of what survives alone', () => {
		const tree = [
			typed('Article', {}, [prop('name', 'First')]),
			typed('Dataset'),
			typed('Article', {}, [prop('name', 'Second')]),
		];
		expect(collectJsonLd(tree as never).map((e) => (e as any).name)).toEqual(['First', 'Second']);
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
