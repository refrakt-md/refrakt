import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

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
		const metas = findAllTags(tag!, t => t.name === 'meta');

		expect(metas.find(m => m.attributes['data-field'] === 'name')!.attributes.content).toBe('v1.0');
		expect(metas.find(m => m.attributes['data-field'] === 'target')!.attributes.content).toBe('2026-06-01');
		expect(metas.find(m => m.attributes['data-field'] === 'status')!.attributes.content).toBe('planning');
	});

	it('should work without optional fields', () => {
		const result = parse(`{% milestone name="v2.0" %}
- Big goals
{% /milestone %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'milestone');
		expect(tag).toBeDefined();

		const metas = findAllTags(tag!, t => t.name === 'meta');
		expect(metas.find(m => m.attributes['data-field'] === 'status')!.attributes.content).toBe('planning');
	});
});
