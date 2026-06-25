import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

describe('textblock tag', () => {
	it('should emit lead meta with content "lead" not "true"', () => {
		const result = parse(`{% textblock lead=true %}
Some lead text.
{% /textblock %}`);

		const tb = findTag(result as any, t => t.attributes['data-rune'] === 'text-block');
		expect(tb).toBeDefined();

		expect(fields(tb).lead).toBe('lead');
	});

	// `dropcap` is now the universal SPEC-108 opt-in (prose-gated), handled by the
	// engine on the body section's data-dropcap — no longer a textblock field. See
	// packages/transform/test/reading.test.ts for its emission coverage.

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
		expect(fields(tb).columns).toBe('3');
	});

	it('should not emit columns meta when columns is 1', () => {
		const result = parse(`{% textblock %}
Single column text.
{% /textblock %}`);

		const tb = findTag(result as any, t => t.attributes['data-rune'] === 'text-block');
		expect(fields(tb).columns).toBeUndefined();
	});

	it('should emit align meta for non-default alignment', () => {
		const result = parse(`{% textblock align="justify" %}
Justified text.
{% /textblock %}`);

		const tb = findTag(result as any, t => t.attributes['data-rune'] === 'text-block');
		expect(fields(tb).align).toBe('justify');
	});

	it('should not emit align meta for default left alignment', () => {
		const result = parse(`{% textblock %}
Left-aligned text.
{% /textblock %}`);

		const tb = findTag(result as any, t => t.attributes['data-rune'] === 'text-block');
		expect(fields(tb).align).toBeUndefined();
	});
});
