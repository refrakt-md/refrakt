import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('deflist rune (SPEC-079 definition-list layout)', () => {
	it('emits <dl> with data-zone-layout="definition-list"', () => {
		const result = parse(`{% deflist %}
- **Priority:** high
- **Complexity:** moderate
{% /deflist %}`);
		const dl = findTag(result as any, t => t.attributes['data-rune'] === 'deflist');
		expect(dl).toBeDefined();
		expect(dl!.name).toBe('dl');
		expect(dl!.attributes['data-zone-layout']).toBe('definition-list');
	});

	it('parses each item with `**Term:**` prefix into <dt>/<dd> pair', () => {
		const result = parse(`{% deflist %}
- **Priority:** high
- **Complexity:** moderate
- **Assignee:** alice
{% /deflist %}`);
		const dl = findTag(result as any, t => t.attributes['data-rune'] === 'deflist');
		const rows = dl!.children.filter((c: any) => c.attributes?.['data-name'] === 'row');
		expect(rows.length).toBe(3);

		const firstRow = rows[0] as any;
		const dt = firstRow.children[0] as any;
		const dd = firstRow.children[1] as any;
		expect(dt.name).toBe('dt');
		expect(dt.attributes['data-meta-label']).toBe('');
		// dt children should contain the term text (without trailing `:`)
		const flatText = (dt.children as any[]).flatMap(c => typeof c === 'string' ? [c] : c.children?.filter((x: any) => typeof x === 'string') ?? []);
		const joined = flatText.join('').trim();
		expect(joined).toBe('Priority');

		expect(dd.name).toBe('dd');
	});

	it('strips the leading space after `**Term:**` in dd content', () => {
		const result = parse(`{% deflist %}
- **Priority:** high
{% /deflist %}`);
		const dl = findTag(result as any, t => t.attributes['data-rune'] === 'deflist');
		const row = (dl!.children as any[])[0];
		const dd = row.children[1] as any;
		// Locate the value text — should be `high` without leading space
		const all = JSON.stringify(dd);
		expect(all).toContain('high');
		expect(all).not.toContain('"  high"');
		expect(all).not.toContain('" high"');
	});

	it('composes inline runes inside <dd>', () => {
		const result = parse(`{% deflist %}
- **Priority:** {% badge sentiment="caution" %}high{% /badge %}
{% /deflist %}`);
		const dl = findTag(result as any, t => t.attributes['data-rune'] === 'deflist');
		const badges = findAllTags(dl as any, t => t.attributes['data-rune'] === 'badge');
		expect(badges.length).toBe(1);
		expect(badges[0].attributes['data-meta-sentiment']).toBe('caution');
	});

	it('falls back to empty <dt> when an item lacks the **Term:** prefix', () => {
		const result = parse(`{% deflist %}
- Plain item without bold prefix
- **Term:** With prefix
{% /deflist %}`);
		const dl = findTag(result as any, t => t.attributes['data-rune'] === 'deflist');
		const rows = (dl!.children as any[]).filter(c => c.attributes?.['data-name'] === 'row');
		expect(rows.length).toBe(2);

		const fallbackDt = rows[0].children[0] as any;
		expect(fallbackDt.children).toHaveLength(0);

		const properDt = rows[1].children[0] as any;
		expect(properDt.children.length).toBeGreaterThan(0);
	});

	it('aliases definitions / terms accept same syntax', () => {
		const result = parse(`{% definitions %}
- **Foo:** bar
{% /definitions %}`);
		const dl = findTag(result as any, t => t.attributes['data-rune'] === 'deflist');
		expect(dl).toBeDefined();
	});
});
