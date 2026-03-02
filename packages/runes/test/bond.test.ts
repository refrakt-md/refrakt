import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('bond tag', () => {
	it('should render from and to as span properties', () => {
		const result = parse(`{% bond from="Aragorn" to="Legolas" %}
A deep fellowship.
{% /bond %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Bond');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('div');

		const fromTag = findTag(tag!, t => t.name === 'span' && t.attributes.property === 'from');
		expect(fromTag).toBeDefined();
		expect(fromTag!.children[0]).toBe('Aragorn');

		const toTag = findTag(tag!, t => t.name === 'span' && t.attributes.property === 'to');
		expect(toTag).toBeDefined();
		expect(toTag!.children[0]).toBe('Legolas');
	});

	it('should pass type, status, and bidirectional as meta tags', () => {
		const result = parse(`{% bond from="A" to="B" type="rivalry" status="active" bidirectional=false %}
Desc.
{% /bond %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Bond');
		const typeMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bondType');
		expect(typeMeta).toBeDefined();
		expect(typeMeta!.attributes.content).toBe('rivalry');

		const statusMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'status');
		expect(statusMeta).toBeDefined();
		expect(statusMeta!.attributes.content).toBe('active');

		const bidiMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bidirectional');
		expect(bidiMeta).toBeDefined();
		expect(bidiMeta!.attributes.content).toBe('false');
	});

	it('should default status to active', () => {
		const result = parse(`{% bond from="A" to="B" %}
Desc.
{% /bond %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Bond');
		const statusMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'status');
		expect(statusMeta).toBeDefined();
		expect(statusMeta!.attributes.content).toBe('active');
	});

	it('should default bidirectional to true', () => {
		const result = parse(`{% bond from="A" to="B" %}
Desc.
{% /bond %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Bond');
		const bidiMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'bidirectional');
		expect(bidiMeta).toBeDefined();
		expect(bidiMeta!.attributes.content).toBe('true');
	});

	it('should work with relationship alias', () => {
		const result = parse(`{% relationship from="Frodo" to="Sam" %}
Best friends.
{% /relationship %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Bond');
		expect(tag).toBeDefined();
	});
});
