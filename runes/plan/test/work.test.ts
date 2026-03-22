import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('work tag', () => {
	it('should transform a basic work item', () => {
		const result = parse(`{% work id="RF-142" status="ready" priority="high" complexity="moderate" %}
# Implement dark mode support

The theme needs dual definitions.

## Acceptance Criteria
- [ ] Accepts light and dark sections
- [ ] Theme CSS swaps tokens

## Approach
Use CSS custom properties.
{% /work %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'work');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass all attributes as meta', () => {
		const result = parse(`{% work id="RF-100" status="in-progress" priority="critical" complexity="complex" assignee="alice" milestone="v1.0" tags="auth" %}
# Some work

Description here.
{% /work %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'work');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		expect(metas.find(m => m.attributes['data-field'] === 'id')!.attributes.content).toBe('RF-100');
		expect(metas.find(m => m.attributes['data-field'] === 'status')!.attributes.content).toBe('in-progress');
		expect(metas.find(m => m.attributes['data-field'] === 'priority')!.attributes.content).toBe('critical');
		expect(metas.find(m => m.attributes['data-field'] === 'complexity')!.attributes.content).toBe('complex');
		expect(metas.find(m => m.attributes['data-field'] === 'assignee')!.attributes.content).toBe('alice');
		expect(metas.find(m => m.attributes['data-field'] === 'milestone')!.attributes.content).toBe('v1.0');
	});

	it('should work with task alias', () => {
		const result = parse(`{% task id="RF-200" %}
# A task

Do something.
{% /task %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'work');
		expect(tag).toBeDefined();
	});

	it('should handle sections with data-name', () => {
		const result = parse(`{% work id="RF-150" %}
# Work item

Description.

## Acceptance Criteria
- [ ] Criterion one
- [ ] Criterion two

## Edge Cases
- Edge case one
{% /work %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'work');
		expect(tag).toBeDefined();

		const sections = findAllTags(tag!, t => t.name === 'section' && !!t.attributes['data-name']);
		expect(sections.length).toBe(2);
		expect(sections[0].attributes['data-name']).toBe('acceptance-criteria');
		expect(sections[1].attributes['data-name']).toBe('edge-cases');
	});
});
