import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('decision tag', () => {
	it('should transform a basic decision record', () => {
		const result = parse(`{% decision id="ADR-007" status="accepted" date="2026-03-11" %}
# Use CSS custom properties

## Context
Need to override tokens within a scope.

## Decision
CSS custom properties via inline styles.

## Consequences
- Themes must include bridge CSS
{% /decision %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'decision');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass date and status as meta', () => {
		const result = parse(`{% decision id="ADR-010" status="proposed" date="2026-03-15" supersedes="ADR-003" tags="architecture" %}
# Some decision

## Context
Context here.
{% /decision %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'decision');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		expect(metas.find(m => m.attributes['data-field'] === 'date')!.attributes.content).toBe('2026-03-15');
		expect(metas.find(m => m.attributes['data-field'] === 'supersedes')!.attributes.content).toBe('ADR-003');
	});

	it('should work with adr alias', () => {
		const result = parse(`{% adr id="ADR-020" %}
# Architecture decision

## Context
Context.
{% /adr %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'decision');
		expect(tag).toBeDefined();
	});

	it('should pass source as meta', () => {
		const result = parse(`{% decision id="ADR-010" status="proposed" date="2026-03-15" source="SPEC-001" %}
# Some decision

## Context
Context here.
{% /decision %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'decision');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		expect(metas.find(m => m.attributes['data-field'] === 'source')!.attributes.content).toBe('SPEC-001');
	});

	it('should handle sections', () => {
		const result = parse(`{% decision id="ADR-007" %}
# Decision title

## Context
Some context.

## Options Considered
1. Option A
2. Option B

## Decision
We chose option A.

## Rationale
Because it works.

## Consequences
- Impact one
{% /decision %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'decision');
		const sections = findAllTags(tag!, t => t.name === 'section' && !!t.attributes['data-name']);
		expect(sections.length).toBe(5);
		expect(sections[0].attributes['data-name']).toBe('context');
		expect(sections[1].attributes['data-name']).toBe('options-considered');
		expect(sections[2].attributes['data-name']).toBe('decision');
		expect(sections[3].attributes['data-name']).toBe('rationale');
		expect(sections[4].attributes['data-name']).toBe('consequences');
	});
});
