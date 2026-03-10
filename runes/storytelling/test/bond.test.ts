import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('bond tag', () => {
	it('should render from and to as span properties', () => {
		const result = parse(`{% bond from="Aragorn" to="Legolas" %}
A deep fellowship.
{% /bond %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bond');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('div');

		const fromTag = findTag(tag!, t => t.name === 'span' && t.attributes['data-field'] === 'from');
		expect(fromTag).toBeDefined();
		expect(fromTag!.children[0]).toBe('Aragorn');

		const toTag = findTag(tag!, t => t.name === 'span' && t.attributes['data-field'] === 'to');
		expect(toTag).toBeDefined();
		expect(toTag!.children[0]).toBe('Legolas');
	});

	it('should pass type, status, and bidirectional as meta tags', () => {
		const result = parse(`{% bond from="A" to="B" type="rivalry" status="active" bidirectional=false %}
Desc.
{% /bond %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bond');
		const typeMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'bond-type');
		expect(typeMeta).toBeDefined();
		expect(typeMeta!.attributes.content).toBe('rivalry');

		const statusMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'status');
		expect(statusMeta).toBeDefined();
		expect(statusMeta!.attributes.content).toBe('active');

		const bidiMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'bidirectional');
		expect(bidiMeta).toBeDefined();
		expect(bidiMeta!.attributes.content).toBe('false');
	});

	it('should default status to active', () => {
		const result = parse(`{% bond from="A" to="B" %}
Desc.
{% /bond %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bond');
		const statusMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'status');
		expect(statusMeta).toBeDefined();
		expect(statusMeta!.attributes.content).toBe('active');
	});

	it('should default bidirectional to true', () => {
		const result = parse(`{% bond from="A" to="B" %}
Desc.
{% /bond %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bond');
		const bidiMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'bidirectional');
		expect(bidiMeta).toBeDefined();
		expect(bidiMeta!.attributes.content).toBe('true');
	});

	it('should work with relationship alias', () => {
		const result = parse(`{% relationship from="Frodo" to="Sam" %}
Best friends.
{% /relationship %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bond');
		expect(tag).toBeDefined();
	});

	it('should place connector between from and to in children order', () => {
		const result = parse(`{% bond from="Aragorn" to="Legolas" %}
A fellowship bond.
{% /bond %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'bond');
		expect(tag).toBeDefined();

		const connector = findTag(tag!, t => t.attributes['data-name'] === 'connector');
		expect(connector).toBeDefined();
		expect(connector!.name).toBe('div');

		const arrow = findTag(connector!, t => t.attributes['data-name'] === 'arrow');
		expect(arrow).toBeDefined();
		expect(arrow!.name).toBe('span');

		// Verify order: from, connector, to
		const children = tag!.children.filter((c: any) => c && typeof c === 'object' && c.name);
		const fromIdx = children.findIndex((c: any) => c.attributes?.['data-field'] === 'from');
		const connIdx = children.findIndex((c: any) => c.attributes?.['data-name'] === 'connector');
		const toIdx = children.findIndex((c: any) => c.attributes?.['data-field'] === 'to');
		expect(fromIdx).toBeLessThan(connIdx);
		expect(connIdx).toBeLessThan(toIdx);
	});
});
