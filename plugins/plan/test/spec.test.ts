import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

describe('spec tag', () => {
	it('should transform a basic spec', () => {
		const result = parse(`{% spec id="SPEC-001" status="accepted" version="1.0" %}
# Authentication System

> Token-based auth for the API.

The system uses JWT tokens.
{% /spec %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'spec');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass id, status, version as meta', () => {
		const result = parse(`{% spec id="SPEC-008" status="draft" version="1.2" supersedes="SPEC-003" tags="tint,theming" %}
# Tint Rune

> Section-level colour override.

Details here.
{% /spec %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'spec');
		expect(fields(tag).id).toBe('SPEC-008');
		expect(fields(tag).status).toBe('draft');
		expect(fields(tag).version).toBe('1.2');
		expect(fields(tag).supersedes).toBe('SPEC-003');
		expect(fields(tag).tags).toBe('tint,theming');
	});

	it('should work without optional attributes', () => {
		const result = parse(`{% spec id="SPEC-010" %}
# Simple Spec

Some content.
{% /spec %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'spec');
		expect(tag).toBeDefined();

		expect(fields(tag).status).toBe('draft');
	});
});
