import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('details tag', () => {
	it('should transform with summary attribute', () => {
		const result = parse(`{% details summary="Click to expand" %}
This is hidden content.
{% /details %}`);

		const details = findTag(result as any, t => t.attributes.typeof === 'Details');
		expect(details).toBeDefined();
		expect(details!.name).toBe('details');

		const summary = findTag(details!, t => t.name === 'summary');
		expect(summary).toBeDefined();
		expect(summary!.children).toContain('Click to expand');
	});

	it('should default summary to "Details" when no attribute given', () => {
		const result = parse(`{% details %}
Some content.
{% /details %}`);

		const details = findTag(result as any, t => t.attributes.typeof === 'Details');
		expect(details).toBeDefined();

		const summary = findTag(details!, t => t.name === 'summary');
		expect(summary).toBeDefined();
		expect(summary!.children).toContain('Details');
	});

	it('should default open to false', () => {
		const result = parse(`{% details summary="Info" %}
Content here.
{% /details %}`);

		const details = findTag(result as any, t => t.attributes.typeof === 'Details');
		expect(details!.attributes.open).toBeFalsy();
	});

	it('should support open=true', () => {
		const result = parse(`{% details summary="Info" open=true %}
Content here.
{% /details %}`);

		const details = findTag(result as any, t => t.attributes.typeof === 'Details');
		expect(details!.attributes.open).toBe(true);
	});
});
