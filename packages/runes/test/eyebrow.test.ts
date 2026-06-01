import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('eyebrow rune (SPEC-079 split layout)', () => {
	it('emits data-zone="eyebrow" and data-zone-layout="split"', () => {
		const result = parse(`{% eyebrow %}
WORK-051
---
Done
{% /eyebrow %}`);
		const eyebrow = findTag(result as any, t => t.attributes['data-rune'] === 'eyebrow');
		expect(eyebrow).toBeDefined();
		expect(eyebrow!.attributes['data-zone']).toBe('eyebrow');
		expect(eyebrow!.attributes['data-zone-layout']).toBe('split');
	});

	it('splits body on top-level `---` into left/right slots', () => {
		const result = parse(`{% eyebrow %}
WORK-051
---
Done
{% /eyebrow %}`);
		const eyebrow = findTag(result as any, t => t.attributes['data-rune'] === 'eyebrow');
		expect(eyebrow!.children.length).toBe(2);
		const left = eyebrow!.children[0] as any;
		const right = eyebrow!.children[1] as any;
		expect(left.attributes['data-eyebrow-slot']).toBe('left');
		expect(right.attributes['data-eyebrow-slot']).toBe('right');
	});

	it('emits a left-only slot when no `---` is present', () => {
		const result = parse(`{% eyebrow %}
Lone content
{% /eyebrow %}`);
		const eyebrow = findTag(result as any, t => t.attributes['data-rune'] === 'eyebrow');
		expect(eyebrow!.children.length).toBe(1);
		const left = eyebrow!.children[0] as any;
		expect(left.attributes['data-eyebrow-slot']).toBe('left');
	});

	it('composes inline runes inside slots', () => {
		const result = parse(`{% eyebrow %}
WORK-051
---
{% badge sentiment="positive" %}Done{% /badge %}
{% /eyebrow %}`);
		const eyebrow = findTag(result as any, t => t.attributes['data-rune'] === 'eyebrow');
		const right = eyebrow!.children[1] as any;
		const badge = findTag(right as any, t => t.attributes['data-rune'] === 'badge');
		expect(badge).toBeDefined();
		expect(badge!.attributes['data-meta-sentiment']).toBe('positive');
	});

	it('works as a standalone rune in prose', () => {
		const result = parse(`Some intro.

{% eyebrow %}
Left
---
Right
{% /eyebrow %}

Some outro.`);
		const eyebrow = findTag(result as any, t => t.attributes['data-rune'] === 'eyebrow');
		expect(eyebrow).toBeDefined();
	});
});
