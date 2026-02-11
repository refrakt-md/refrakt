import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('details tag', () => {
	it('should transform with summary attribute', () => {
		const result = parse(`{% details summary="Click to expand" %}
This is hidden content.
{% /details %}`);

		const details = findTag(result as any, t => t.attributes.typeof === 'Details');
		expect(details).toBeDefined();
		expect(details!.name).toBe('section');

		const summary = findTag(details!, t => t.name === 'span' && t.attributes.property === 'summary');
		expect(summary).toBeDefined();
		expect(summary!.children).toContain('Click to expand');
	});

	it('should default summary to "Details" when no attribute given', () => {
		const result = parse(`{% details %}
Some content.
{% /details %}`);

		const details = findTag(result as any, t => t.attributes.typeof === 'Details');
		expect(details).toBeDefined();

		const summary = findTag(details!, t => t.name === 'span' && t.attributes.property === 'summary');
		expect(summary).toBeDefined();
		expect(summary!.children).toContain('Details');
	});

	it('should default open to false', () => {
		const result = parse(`{% details summary="Info" %}
Content here.
{% /details %}`);

		const details = findTag(result as any, t => t.attributes.typeof === 'Details');
		const openMeta = findTag(details!, t => t.name === 'meta' && t.attributes.property === 'open');
		expect(openMeta).toBeDefined();
		expect(openMeta!.attributes.content).toBe(false);
	});

	it('should support open=true', () => {
		const result = parse(`{% details summary="Info" open=true %}
Content here.
{% /details %}`);

		const details = findTag(result as any, t => t.attributes.typeof === 'Details');
		const openMeta = findTag(details!, t => t.name === 'meta' && t.attributes.property === 'open');
		expect(openMeta).toBeDefined();
		expect(openMeta!.attributes.content).toBe(true);
	});
});
