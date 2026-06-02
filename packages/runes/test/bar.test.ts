import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('bar rune (SPEC-080 bar layout)', () => {
	it('emits data-rune="bar" and data-zone-layout="bar"', () => {
		const result = parse(`{% bar %}
WORK-051
---
Done
{% /bar %}`);
		const barEl = findTag(result as any, t => t.attributes['data-rune'] === 'bar');
		expect(barEl).toBeDefined();
		expect(barEl!.attributes['data-zone-layout']).toBe('bar');
	});

	it('splits body on top-level `---`, tagging the right group data-align="end"', () => {
		const result = parse(`{% bar %}
WORK-051
---
Done
{% /bar %}`);
		const barEl = findTag(result as any, t => t.attributes['data-rune'] === 'bar');
		expect(barEl!.children.length).toBe(2);
		const left = barEl!.children[0] as any;
		const right = barEl!.children[1] as any;
		expect(left.attributes['data-align']).toBeUndefined();
		expect(right.attributes['data-align']).toBe('end');
	});

	it('emits a single left group when no `---` is present', () => {
		const result = parse(`{% bar %}
Lone content
{% /bar %}`);
		const barEl = findTag(result as any, t => t.attributes['data-rune'] === 'bar');
		expect(barEl!.children.length).toBe(1);
		const left = barEl!.children[0] as any;
		expect(left.attributes['data-align']).toBeUndefined();
	});

	it('composes inline runes inside groups', () => {
		const result = parse(`{% bar %}
WORK-051
---
{% badge sentiment="positive" %}Done{% /badge %}
{% /bar %}`);
		const barEl = findTag(result as any, t => t.attributes['data-rune'] === 'bar');
		const right = barEl!.children[1] as any;
		const badge = findTag(right as any, t => t.attributes['data-rune'] === 'badge');
		expect(badge).toBeDefined();
		expect(badge!.attributes['data-meta-sentiment']).toBe('positive');
	});

	it('works as a standalone rune in prose', () => {
		const result = parse(`Some intro.

{% bar %}
Left
---
Right
{% /bar %}

Some outro.`);
		const barEl = findTag(result as any, t => t.attributes['data-rune'] === 'bar');
		expect(barEl).toBeDefined();
	});
});
