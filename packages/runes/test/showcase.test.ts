import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('showcase tag', () => {
	it('should produce a Showcase renderable with viewport ref', () => {
		const result = parse(`{% showcase %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Showcase');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('div');

		const viewport = findTag(tag!, t => t.attributes['data-name'] === 'viewport');
		expect(viewport).toBeDefined();
	});

	it('should emit shadow meta when not none', () => {
		const result = parse(`{% showcase shadow="elevated" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Showcase');
		expect(tag).toBeDefined();

		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'shadow');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('elevated');
	});

	it('should emit bleed meta when not none', () => {
		const result = parse(`{% showcase bleed="top" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Showcase');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bleed');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('top');
	});

	it('should emit offset meta when set', () => {
		const result = parse(`{% showcase offset="lg" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Showcase');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'offset');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('lg');
	});

	it('should emit aspect meta when set', () => {
		const result = parse(`{% showcase aspect="16/9" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Showcase');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'aspect');
		expect(meta).toBeDefined();
		expect(meta!.attributes.content).toBe('16/9');
	});

	it('should not emit meta tags for default values', () => {
		const result = parse(`{% showcase %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Showcase');
		expect(tag).toBeDefined();

		const shadowMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'shadow');
		expect(shadowMeta).toBeUndefined();

		const bleedMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bleed');
		expect(bleedMeta).toBeUndefined();
	});

	it('should emit multiple meta tags for combined attributes', () => {
		const result = parse(`{% showcase shadow="soft" bleed="both" offset="md" aspect="4/3" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'Showcase');
		expect(tag).toBeDefined();

		const shadowMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'shadow');
		expect(shadowMeta!.attributes.content).toBe('soft');

		const bleedMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bleed');
		expect(bleedMeta!.attributes.content).toBe('both');

		const offsetMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'offset');
		expect(offsetMeta!.attributes.content).toBe('md');

		const aspectMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'aspect');
		expect(aspectMeta!.attributes.content).toBe('4/3');
	});
});
