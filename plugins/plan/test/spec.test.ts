import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

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
		const metas = findAllTags(tag!, t => t.name === 'meta');

		const id = metas.find(m => m.attributes['data-field'] === 'id');
		expect(id).toBeDefined();
		expect(id!.attributes.content).toBe('SPEC-008');

		const status = metas.find(m => m.attributes['data-field'] === 'status');
		expect(status).toBeDefined();
		expect(status!.attributes.content).toBe('draft');

		const version = metas.find(m => m.attributes['data-field'] === 'version');
		expect(version).toBeDefined();
		expect(version!.attributes.content).toBe('1.2');

		const supersedes = metas.find(m => m.attributes['data-field'] === 'supersedes');
		expect(supersedes).toBeDefined();
		expect(supersedes!.attributes.content).toBe('SPEC-003');

		const tags = metas.find(m => m.attributes['data-field'] === 'tags');
		expect(tags).toBeDefined();
		expect(tags!.attributes.content).toBe('tint,theming');
	});

	it('should work without optional attributes', () => {
		const result = parse(`{% spec id="SPEC-010" %}
# Simple Spec

Some content.
{% /spec %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'spec');
		expect(tag).toBeDefined();

		const metas = findAllTags(tag!, t => t.name === 'meta');
		const status = metas.find(m => m.attributes['data-field'] === 'status');
		expect(status!.attributes.content).toBe('draft');
	});
});
