import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('cast tag', () => {
	it('should parse list items into cast members', () => {
		const result = parse(`{% cast %}
- Alice Johnson - CEO
- Bob Smith - CTO
- Carol Williams - Designer
{% /cast %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Cast');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('section');

		const members = findAllTags(tag!, t => t.attributes.typeof === 'CastMember');
		expect(members.length).toBe(3);
	});

	it('should extract name and role from entries', () => {
		const result = parse(`{% cast %}
- Sarah Chen - Head of Content
{% /cast %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Cast');
		const member = findTag(tag!, t => t.attributes.typeof === 'CastMember');
		expect(member).toBeDefined();

		const nameTag = findTag(member!, t => t.name === 'span' && t.attributes.property === 'name');
		expect(nameTag).toBeDefined();
		expect(nameTag!.children[0]).toBe('Sarah Chen');

		const roleTag = findTag(member!, t => t.name === 'span' && t.attributes.property === 'role');
		expect(roleTag).toBeDefined();
		expect(roleTag!.children[0]).toBe('Head of Content');
	});

	it('should pass layout attribute as meta', () => {
		const result = parse(`{% cast layout="list" %}
- Person One - Role
{% /cast %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Cast');
		const meta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'list');
		expect(meta).toBeDefined();
	});

	it('should work with team alias', () => {
		const result = parse(`{% team %}
- Dev One - Engineer
{% /team %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Cast');
		expect(tag).toBeDefined();
	});
});
