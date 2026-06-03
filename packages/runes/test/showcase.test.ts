import { describe, it, expect } from 'vitest';
import { parse, findTag, fields } from './helpers.js';

describe('showcase tag', () => {
	it('should produce a Showcase renderable with viewport ref', () => {
		const result = parse(`{% showcase %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('div');

		const viewport = findTag(tag!, t => t.attributes['data-name'] === 'viewport');
		expect(viewport).toBeDefined();
	});

	it('should emit shadow meta when not none', () => {
		const result = parse(`{% showcase shadow="elevated" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(tag).toBeDefined();

		expect(fields(tag).shadow).toBe('elevated');
	});

	it('should emit bleed meta when not none', () => {
		const result = parse(`{% showcase bleed="top" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(fields(tag).bleed).toBe('top');
	});

	it('should emit offset meta when set', () => {
		const result = parse(`{% showcase offset="lg" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(fields(tag).offset).toBe('lg');
	});

	it('should emit aspect meta when set', () => {
		const result = parse(`{% showcase aspect="16/9" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(fields(tag).aspect).toBe('16/9');
	});

	it('should not emit meta tags for default values', () => {
		const result = parse(`{% showcase %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(tag).toBeDefined();

		expect(fields(tag).shadow).toBeUndefined();
		expect(fields(tag).bleed).toBeUndefined();
	});

	it('should emit multiple meta tags for combined attributes', () => {
		const result = parse(`{% showcase shadow="soft" bleed="both" offset="md" aspect="4/3" %}
![Dashboard](/images/dashboard.png)
{% /showcase %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'showcase');
		expect(tag).toBeDefined();

		expect(fields(tag).shadow).toBe('soft');
		expect(fields(tag).bleed).toBe('both');
		expect(fields(tag).offset).toBe('md');
		expect(fields(tag).aspect).toBe('4/3');
	});
});
