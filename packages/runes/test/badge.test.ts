import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('badge tag', () => {
	it('renders a neutral badge by default', () => {
		const result = parse(`Frontend {% badge %}New{% /badge %} feature`);

		const badge = findTag(result as any, t => t.attributes['data-rune'] === 'badge');
		expect(badge).toBeDefined();
		expect(badge!.name).toBe('span');
		expect(badge!.attributes['class']).toBe('rf-badge');
		expect(badge!.attributes['data-meta-sentiment']).toBe('neutral');
		expect(badge!.attributes['data-meta-type']).toBe('tag');
		expect(badge!.attributes['data-meta-rank']).toBeUndefined();
	});

	it('emits data-meta-sentiment per attribute', () => {
		const result = parse(`{% badge sentiment="positive" %}New{% /badge %}`);
		const badge = findTag(result as any, t => t.attributes['data-rune'] === 'badge');
		expect(badge!.attributes['data-meta-sentiment']).toBe('positive');
	});

	it('emits data-meta-rank only when rank is set', () => {
		const withRank = parse(`{% badge rank="primary" %}Popular{% /badge %}`);
		const withoutRank = parse(`{% badge %}Tag{% /badge %}`);

		const withRankBadge = findTag(withRank as any, t => t.attributes['data-rune'] === 'badge');
		const withoutRankBadge = findTag(withoutRank as any, t => t.attributes['data-rune'] === 'badge');

		expect(withRankBadge!.attributes['data-meta-rank']).toBe('primary');
		expect(withoutRankBadge!.attributes['data-meta-rank']).toBeUndefined();
	});

	it('emits data-meta-type per attribute, defaulting to tag', () => {
		const statusBadge = parse(`{% badge type="status" %}Active{% /badge %}`);
		const defaultBadge = parse(`{% badge %}Frontend{% /badge %}`);

		expect(findTag(statusBadge as any, t => t.attributes['data-rune'] === 'badge')!.attributes['data-meta-type']).toBe('status');
		expect(findTag(defaultBadge as any, t => t.attributes['data-rune'] === 'badge')!.attributes['data-meta-type']).toBe('tag');
	});

	it('preserves children as text content', () => {
		const result = parse(`{% badge sentiment="caution" %}Beta{% /badge %}`);
		const badge = findTag(result as any, t => t.attributes['data-rune'] === 'badge');
		expect(badge!.children).toContain('Beta');
	});

	it('accepts all sentiment values', () => {
		for (const sentiment of ['positive', 'negative', 'caution', 'neutral']) {
			const result = parse(`{% badge sentiment="${sentiment}" %}Label{% /badge %}`);
			const badge = findTag(result as any, t => t.attributes['data-rune'] === 'badge');
			expect(badge).toBeDefined();
			expect(badge!.attributes['data-meta-sentiment']).toBe(sentiment);
		}
	});

	it('accepts all type values', () => {
		for (const type of ['status', 'category', 'quantity', 'temporal', 'tag', 'id']) {
			const result = parse(`{% badge type="${type}" %}Label{% /badge %}`);
			const badge = findTag(result as any, t => t.attributes['data-rune'] === 'badge');
			expect(badge).toBeDefined();
			expect(badge!.attributes['data-meta-type']).toBe(type);
		}
	});

	it('combines sentiment + rank + type', () => {
		const result = parse(`{% badge type="status" sentiment="positive" rank="primary" %}Active{% /badge %}`);
		const badge = findTag(result as any, t => t.attributes['data-rune'] === 'badge');
		expect(badge!.attributes['data-meta-sentiment']).toBe('positive');
		expect(badge!.attributes['data-meta-rank']).toBe('primary');
		expect(badge!.attributes['data-meta-type']).toBe('status');
	});

	it('works inline inside a paragraph', () => {
		const result = parse(`This API is {% badge sentiment="caution" %}Beta{% /badge %} — use carefully.`);
		const badge = findTag(result as any, t => t.attributes['data-rune'] === 'badge');
		expect(badge).toBeDefined();
	});
});
