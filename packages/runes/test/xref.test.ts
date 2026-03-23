import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('xref rune (Phase 1 — placeholder)', () => {
	it('should emit a placeholder span with data-rune="xref"', () => {
		const result = parse('{% xref "RF-138" /%}');
		const span = findTag(result as any, t => t.attributes['data-rune'] === 'xref');
		expect(span).toBeDefined();
		expect(span!.name).toBe('span');
		expect(span!.attributes['data-xref-id']).toBe('RF-138');
		expect(span!.children).toContain('RF-138');
	});

	it('should include custom label as text and data attribute', () => {
		const result = parse('{% xref "RF-138" label="the base impl" /%}');
		const span = findTag(result as any, t => t.attributes['data-rune'] === 'xref');
		expect(span).toBeDefined();
		expect(span!.attributes['data-xref-label']).toBe('the base impl');
		expect(span!.children).toContain('the base impl');
	});

	it('should include type hint as data attribute', () => {
		const result = parse('{% xref "Sanctuary" type="realm" /%}');
		const span = findTag(result as any, t => t.attributes['data-rune'] === 'xref');
		expect(span).toBeDefined();
		expect(span!.attributes['data-xref-type']).toBe('realm');
	});

	it('should not include data-xref-label when label is not provided', () => {
		const result = parse('{% xref "RF-138" /%}');
		const span = findTag(result as any, t => t.attributes['data-rune'] === 'xref');
		expect(span).toBeDefined();
		expect(span!.attributes['data-xref-label']).toBeUndefined();
	});

	it('should not include data-xref-type when type is not provided', () => {
		const result = parse('{% xref "RF-138" /%}');
		const span = findTag(result as any, t => t.attributes['data-rune'] === 'xref');
		expect(span).toBeDefined();
		expect(span!.attributes['data-xref-type']).toBeUndefined();
	});

	it('should use label as fallback text over id', () => {
		const result = parse('{% xref "RF-138" label="custom text" /%}');
		const span = findTag(result as any, t => t.attributes['data-rune'] === 'xref');
		expect(span!.children).toContain('custom text');
		expect(span!.children).not.toContain('RF-138');
	});
});

describe('ref alias', () => {
	it('should produce identical output to xref', () => {
		const refResult = parse('{% ref "SPEC-022" /%}');
		const xrefResult = parse('{% xref "SPEC-022" /%}');
		const refSpan = findTag(refResult as any, t => t.attributes['data-rune'] === 'xref');
		const xrefSpan = findTag(xrefResult as any, t => t.attributes['data-rune'] === 'xref');
		expect(refSpan).toBeDefined();
		expect(refSpan!.name).toBe(xrefSpan!.name);
		expect(refSpan!.attributes).toEqual(xrefSpan!.attributes);
		expect(refSpan!.children).toEqual(xrefSpan!.children);
	});

	it('should support all xref attributes via ref', () => {
		const result = parse('{% ref "Veshra" label="the exile" type="character" /%}');
		const span = findTag(result as any, t => t.attributes['data-rune'] === 'xref');
		expect(span).toBeDefined();
		expect(span!.attributes['data-xref-id']).toBe('Veshra');
		expect(span!.attributes['data-xref-label']).toBe('the exile');
		expect(span!.attributes['data-xref-type']).toBe('character');
		expect(span!.children).toContain('the exile');
	});
});
