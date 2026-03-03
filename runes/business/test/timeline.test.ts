import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('timeline tag', () => {
	it('should convert headings to timeline entries', () => {
		const result = parse(`{% timeline %}
## 2021 - Project started

We began building.

## 2023 - First release

Open-sourced the library.
{% /timeline %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Timeline');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('section');

		const entries = findAllTags(tag!, t => t.attributes.typeof === 'TimelineEntry');
		expect(entries.length).toBe(2);
	});

	it('should parse date and label from heading text', () => {
		const result = parse(`{% timeline %}
## 2023 - Company founded

Description here.
{% /timeline %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Timeline');
		const entry = findTag(tag!, t => t.attributes.typeof === 'TimelineEntry');
		expect(entry).toBeDefined();

		const dateTag = findTag(entry!, t => t.name === 'time');
		expect(dateTag).toBeDefined();
		expect(dateTag!.children[0]).toBe('2023');

		const labelTag = findTag(entry!, t => t.name === 'span');
		expect(labelTag).toBeDefined();
		expect(labelTag!.children[0]).toBe('Company founded');
	});

	it('should pass direction attribute as meta', () => {
		const result = parse(`{% timeline direction="horizontal" %}
## 2023 - Event

Content.
{% /timeline %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Timeline');
		const dirMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'horizontal');
		expect(dirMeta).toBeDefined();
	});

	it('should handle heading without date pattern', () => {
		const result = parse(`{% timeline %}
## Just a milestone

Content.
{% /timeline %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Timeline');
		const entry = findTag(tag!, t => t.attributes.typeof === 'TimelineEntry');
		expect(entry).toBeDefined();

		const labelTag = findTag(entry!, t => t.name === 'span');
		expect(labelTag).toBeDefined();
		expect(labelTag!.children[0]).toBe('Just a milestone');
	});
});
