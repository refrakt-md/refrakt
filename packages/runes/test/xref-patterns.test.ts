import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { compileXrefPatterns } from '../src/xref-patterns.js';

describe('compileXrefPatterns', () => {
	it('returns empty result for undefined / empty input', () => {
		const a = compileXrefPatterns(undefined);
		expect(a.patterns).toHaveLength(0);
		expect(a.errors).toHaveLength(0);
		expect(a.warnings).toHaveLength(0);

		const b = compileXrefPatterns([]);
		expect(b.patterns).toHaveLength(0);
	});

	it('compiles a simple pattern with default type and label', () => {
		const result = compileXrefPatterns([
			{ match: 'SPEC-\\d+', template: 'https://example.com/{id}' },
		]);
		expect(result.errors).toEqual([]);
		expect(result.patterns).toHaveLength(1);
		const p = result.patterns[0];
		expect(p.type).toBe('external');     // default
		expect(p.label).toBe('{id}');         // default
		expect(p.groupNames).toEqual([]);
		// Anchored to whole-string match.
		expect('SPEC-001').toMatch(p.match);
		expect('MY-SPEC-001').not.toMatch(p.match);
	});

	it('preserves explicit anchors instead of double-wrapping', () => {
		const result = compileXrefPatterns([
			{ match: '^GH-(?<num>\\d+)$', template: 'https://gh.com/{num}' },
		]);
		expect(result.errors).toEqual([]);
		const p = result.patterns[0];
		// Should match exactly, no double-anchoring artifacts.
		expect('GH-123').toMatch(p.match);
		expect('GH-123-extra').not.toMatch(p.match);
		expect(p.groupNames).toEqual(['num']);
	});

	it('handles partial leading anchor by stripping and re-wrapping', () => {
		const result = compileXrefPatterns([
			{ match: '^RFC-\\d+', template: 'https://datatracker.ietf.org/{id}' },
		]);
		expect(result.errors).toEqual([]);
		const p = result.patterns[0];
		expect('RFC-7231').toMatch(p.match);
		expect('RFC-7231-extra').not.toMatch(p.match);
	});

	it('extracts named groups in declaration order', () => {
		const result = compileXrefPatterns([
			{ match: 'npm:(?<scope>@[^/]+)/(?<pkg>.+)', template: 'https://npm/{scope}/{pkg}' },
		]);
		expect(result.errors).toEqual([]);
		expect(result.patterns[0].groupNames).toEqual(['scope', 'pkg']);
	});

	it('rejects invalid regex with a build-error message naming the entry', () => {
		const result = compileXrefPatterns([
			{ match: '(unclosed', template: 'https://example.com/{id}' },
		]);
		expect(result.patterns).toHaveLength(0);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]).toContain('xrefs[0]');
		expect(result.errors[0]).toContain('invalid regex');
	});

	it('rejects template referencing an unknown placeholder', () => {
		const result = compileXrefPatterns([
			{ match: 'GH-(?<num>\\d+)', template: 'https://gh.com/{nope}/{id}' },
		]);
		expect(result.patterns).toHaveLength(0);
		expect(result.errors[0]).toContain('xrefs[0]');
		expect(result.errors[0]).toContain('{nope}');
	});

	it('rejects label referencing an unknown placeholder', () => {
		const result = compileXrefPatterns([
			{ match: 'GH-\\d+', template: 'https://gh.com/{id}', label: 'see {nope}' },
		]);
		expect(result.patterns).toHaveLength(0);
		expect(result.errors[0]).toContain('{nope}');
	});

	it('allows templates that omit placeholders (constant URL)', () => {
		const result = compileXrefPatterns([
			{ match: 'home', template: 'https://example.com/' },
		]);
		expect(result.errors).toEqual([]);
		expect(result.patterns).toHaveLength(1);
	});

	it('rejects reserved type value `unresolved`', () => {
		const result = compileXrefPatterns([
			{ match: 'SPEC-\\d+', template: 'https://x/{id}', type: 'unresolved' },
		]);
		expect(result.patterns).toHaveLength(0);
		expect(result.errors[0]).toContain('xrefs[0]');
		expect(result.errors[0]).toContain('reserved');
	});

	it('emits a warning for duplicate match strings without failing', () => {
		const result = compileXrefPatterns([
			{ match: 'SPEC-\\d+', template: 'https://a.com/{id}' },
			{ match: 'SPEC-\\d+', template: 'https://b.com/{id}' },
		]);
		expect(result.errors).toEqual([]);
		expect(result.patterns).toHaveLength(2);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain('xrefs[1]');
		expect(result.warnings[0]).toContain('duplicate');
	});

	it('rejects missing or empty required fields', () => {
		const result = compileXrefPatterns([
			{ match: '', template: 'https://x/{id}' } as any,
			{ match: 'SPEC-\\d+', template: '' } as any,
		]);
		expect(result.patterns).toHaveLength(0);
		expect(result.errors).toHaveLength(2);
		expect(result.errors[0]).toContain('xrefs[0]');
		expect(result.errors[0]).toContain('`match`');
		expect(result.errors[1]).toContain('xrefs[1]');
		expect(result.errors[1]).toContain('`template`');
	});

	it('compiles multiple distinct patterns and preserves order', () => {
		const result = compileXrefPatterns([
			{ match: 'SPEC-\\d+', template: 'https://specs/{id}', type: 'spec' },
			{ match: 'GH-(?<num>\\d+)', template: 'https://gh/{num}', type: 'github-issue', label: 'GH #{num}' },
			{ match: 'npm:(?<pkg>.+)', template: 'https://npm/{pkg}', type: 'npm' },
		]);
		expect(result.errors).toEqual([]);
		expect(result.patterns).toHaveLength(3);
		expect(result.patterns[0].type).toBe('spec');
		expect(result.patterns[1].type).toBe('github-issue');
		expect(result.patterns[1].label).toBe('GH #{num}');
		expect(result.patterns[2].groupNames).toEqual(['pkg']);
	});

	it('treats `{id}` as always-available even when no named groups are declared', () => {
		const result = compileXrefPatterns([
			{ match: 'X-\\d+', template: '/{id}' },
		]);
		expect(result.errors).toEqual([]);
		expect(result.patterns[0].groupNames).toEqual([]);
	});
});
