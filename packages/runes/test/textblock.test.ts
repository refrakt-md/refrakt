import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('textblock tag', () => {
	it('should emit lead meta with content "lead" not "true"', () => {
		const result = parse(`{% textblock lead=true %}
Some lead text.
{% /textblock %}`);

		const tb = findTag(result as any, t => t.attributes['data-rune'] === 'text-block');
		expect(tb).toBeDefined();

		const leadMeta = findTag(tb!, t => t.name === 'meta' && t.attributes['data-field'] === 'lead');
		expect(leadMeta).toBeDefined();
		expect(leadMeta!.attributes.content).toBe('lead');
	});

	it('should emit dropcap meta with content "dropcap" not "true"', () => {
		const result = parse(`{% textblock dropcap=true %}
Some dropcap text.
{% /textblock %}`);

		const tb = findTag(result as any, t => t.attributes['data-rune'] === 'text-block');
		expect(tb).toBeDefined();

		const dropcapMeta = findTag(tb!, t => t.name === 'meta' && t.attributes['data-field'] === 'dropcap');
		expect(dropcapMeta).toBeDefined();
		expect(dropcapMeta!.attributes.content).toBe('dropcap');
	});

	it('should wrap body content in a single div', () => {
		const result = parse(`{% textblock %}
Some text content.
{% /textblock %}`);

		const tb = findTag(result as any, t => t.attributes['data-rune'] === 'text-block');
		expect(tb).toBeDefined();

		const bodyDivs = findAllTags(tb!, t => t.attributes['data-name'] === 'body');
		expect(bodyDivs.length).toBe(1);
	});

	it('should emit columns meta when columns > 1', () => {
		const result = parse(`{% textblock columns=3 %}
Multi-column text.
{% /textblock %}`);

		const tb = findTag(result as any, t => t.attributes['data-rune'] === 'text-block');
		const colMeta = findTag(tb!, t => t.name === 'meta' && t.attributes['data-field'] === 'columns');
		expect(colMeta).toBeDefined();
		expect(colMeta!.attributes.content).toBe('3');
	});

	it('should not emit columns meta when columns is 1', () => {
		const result = parse(`{% textblock %}
Single column text.
{% /textblock %}`);

		const tb = findTag(result as any, t => t.attributes['data-rune'] === 'text-block');
		const colMeta = findTag(tb!, t => t.name === 'meta' && t.attributes['data-field'] === 'columns');
		expect(colMeta).toBeUndefined();
	});

	it('should emit align meta for non-default alignment', () => {
		const result = parse(`{% textblock align="justify" %}
Justified text.
{% /textblock %}`);

		const tb = findTag(result as any, t => t.attributes['data-rune'] === 'text-block');
		const alignMeta = findTag(tb!, t => t.name === 'meta' && t.attributes['data-field'] === 'align');
		expect(alignMeta).toBeDefined();
		expect(alignMeta!.attributes.content).toBe('justify');
	});

	it('should not emit align meta for default left alignment', () => {
		const result = parse(`{% textblock %}
Left-aligned text.
{% /textblock %}`);

		const tb = findTag(result as any, t => t.attributes['data-rune'] === 'text-block');
		const alignMeta = findTag(tb!, t => t.name === 'meta' && t.attributes['data-field'] === 'align');
		expect(alignMeta).toBeUndefined();
	});
});
