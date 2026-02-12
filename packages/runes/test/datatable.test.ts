import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('datatable tag', () => {
	it('should transform a table into a datatable', () => {
		const result = parse(`{% datatable sortable="Name,Age" searchable=true %}
| Name | Age | City |
|------|-----|------|
| Alice | 30 | NYC |
| Bob | 25 | LA |
{% /datatable %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'DataTable');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('div');
	});

	it('should pass attributes as meta tags', () => {
		const result = parse(`{% datatable sortable="Name" pageSize=10 %}
| Name |
|------|
| Test |
{% /datatable %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'DataTable');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		const sortable = metas.find(m => m.attributes.property === 'sortable');
		expect(sortable).toBeDefined();
		expect(sortable!.attributes.content).toBe('Name');

		const pageSize = metas.find(m => m.attributes.property === 'pageSize');
		expect(pageSize).toBeDefined();
		expect(pageSize!.attributes.content).toBe('10');
	});

	it('should include the table in refs', () => {
		const result = parse(`{% datatable %}
| Col1 | Col2 |
|------|------|
| A    | B    |
{% /datatable %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'DataTable');
		const table = findTag(tag!, t => t.name === 'table');
		expect(table).toBeDefined();
	});

	it('should work with data-table alias', () => {
		const result = parse(`{% data-table %}
| Name |
|------|
| Test |
{% /data-table %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'DataTable');
		expect(tag).toBeDefined();
	});
});
