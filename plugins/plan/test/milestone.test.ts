import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

describe('milestone tag', () => {
	it('should transform a basic milestone', () => {
		const result = parse(`{% milestone name="v0.5.0" target="2026-03-29" status="active" %}
# v0.5.0 — Layout & Tint

- Complete alignment migration
- Ship tint rune
- Publish layout spec
{% /milestone %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'milestone');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('section');
	});

	it('should pass name, target, and status as meta', () => {
		const result = parse(`{% milestone name="v1.0" target="2026-06-01" status="planning" %}
- Launch the product
{% /milestone %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'milestone');
		expect(fields(tag).name).toBe('v1.0');
		expect(fields(tag).target).toBe('2026-06-01');
		expect(fields(tag).status).toBe('planning');
	});

	it('should work without optional fields', () => {
		const result = parse(`{% milestone name="v2.0" %}
- Big goals
{% /milestone %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'milestone');
		expect(tag).toBeDefined();

		expect(fields(tag).status).toBe('planning');
	});
});
