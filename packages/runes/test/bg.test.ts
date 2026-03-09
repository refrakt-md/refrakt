import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('bg directive rune', () => {
	it('should emit bg-src meta when used as child of hint', () => {
		const result = parse(`{% hint type="note" %}
{% bg src="/images/bg.jpg" %}
This has a background.
{% /hint %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Hint');
		expect(tag).toBeDefined();

		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-src');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('/images/bg.jpg');
	});

	it('should emit bg-video meta for video backgrounds', () => {
		const result = parse(`{% hint type="note" %}
{% bg video="/videos/loop.mp4" %}
Video background.
{% /hint %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Hint');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-video');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('/videos/loop.mp4');
	});

	it('should emit overlay meta when not none', () => {
		const result = parse(`{% hint type="note" %}
{% bg src="/images/bg.jpg" overlay="dark" %}
Dark overlay.
{% /hint %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Hint');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-overlay');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('dark');
	});

	it('should not emit overlay meta when none', () => {
		const result = parse(`{% hint type="note" %}
{% bg src="/images/bg.jpg" overlay="none" %}
No overlay.
{% /hint %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Hint');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-overlay');
		expect(meta).toBeUndefined();
	});

	it('should emit blur meta when not none', () => {
		const result = parse(`{% hint type="note" %}
{% bg src="/images/bg.jpg" blur="sm" %}
Blurred bg.
{% /hint %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Hint');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-blur');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('sm');
	});

	it('should emit position and fit metas when non-default', () => {
		const result = parse(`{% hint type="note" %}
{% bg src="/images/bg.jpg" position="top" fit="contain" %}
Custom position.
{% /hint %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Hint');

		const posMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-position');
		expect(posMeta).toBeDefined();
		expect(posMeta!.attributes.content).toBe('top');

		const fitMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-fit');
		expect(fitMeta).toBeDefined();
		expect(fitMeta!.attributes.content).toBe('contain');
	});

	it('should not emit position meta for default center', () => {
		const result = parse(`{% hint type="note" %}
{% bg src="/images/bg.jpg" %}
Default position.
{% /hint %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Hint');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-position');
		expect(meta).toBeUndefined();
	});

	it('should emit fixed meta when true', () => {
		const result = parse(`{% hint type="note" %}
{% bg src="/images/bg.jpg" fixed=true %}
Fixed bg.
{% /hint %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Hint');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-fixed');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('true');
	});

	it('should not interfere with body content', () => {
		const result = parse(`{% hint type="note" %}
{% bg src="/images/bg.jpg" %}
This is the body content.
{% /hint %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Hint');
		expect(tag).toBeDefined();

		// The bg should be extracted; body should still have the paragraph
		const body = findTag(tag!, t => t.attributes['data-name'] === 'body');
		expect(body).toBeDefined();
	});

	it('should emit multiple bg metas for combined attributes', () => {
		const result = parse(`{% hint type="note" %}
{% bg src="/images/bg.jpg" overlay="dark" blur="lg" position="top" opacity="0.8" %}
Combined.
{% /hint %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Hint');
		expect(tag).toBeDefined();

		expect(findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-src')).toBeDefined();
		expect(findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-overlay')).toBeDefined();
		expect(findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-blur')).toBeDefined();
		expect(findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-position')).toBeDefined();
		expect(findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bg-opacity')).toBeDefined();
	});
});
