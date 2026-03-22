import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('bug tag', () => {
	it('should transform a basic bug report', () => {
		const result = parse(`{% bug id="RF-201" status="confirmed" severity="major" %}
# Showcase bleed breaks

## Steps to Reproduce
1. Create a section with overflow: hidden
2. Add a showcase with bleed

## Expected
Showcase extends above the boundary.

## Actual
Showcase is clipped.
{% /bug %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bug');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass severity and status as meta', () => {
		const result = parse(`{% bug id="RF-300" status="reported" severity="critical" %}
# Critical bug

## Steps to Reproduce
1. Do something
{% /bug %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bug');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		expect(metas.find(m => m.attributes['data-field'] === 'status')!.attributes.content).toBe('reported');
		expect(metas.find(m => m.attributes['data-field'] === 'severity')!.attributes.content).toBe('critical');
	});

	it('should handle sections', () => {
		const result = parse(`{% bug id="RF-201" %}
# Bug title

## Steps to Reproduce
1. Step one

## Expected
Works correctly.

## Actual
Broken.

## Environment
- Browser: Chrome
{% /bug %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bug');
		const sections = findAllTags(tag!, t => t.name === 'section' && !!t.attributes['data-name']);
		expect(sections.length).toBe(4);
		expect(sections[0].attributes['data-name']).toBe('steps-to-reproduce');
		expect(sections[1].attributes['data-name']).toBe('expected');
		expect(sections[2].attributes['data-name']).toBe('actual');
		expect(sections[3].attributes['data-name']).toBe('environment');
	});
});
