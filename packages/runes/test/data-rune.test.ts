import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { tags, nodes } from '../src/index.js';
import { preprocessData } from '../src/data-pipeline.js';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';
import { findTag, findAllTags } from './helpers.js';
import type { PreprocessContext } from '@refrakt-md/types';

/** Parse → run the data preprocess against an in-memory provider → transform. */
function runData(
	src: string,
	files: Record<string, string>,
	variables: Record<string, unknown> = {},
) {
	const ast = Markdoc.parse(src);
	const warnings: Array<{ severity: string; message: string }> = [];
	const ctx: PreprocessContext = {
		info: (m) => warnings.push({ severity: 'info', message: m }),
		warn: (m) => warnings.push({ severity: 'warning', message: m }),
		error: (m) => warnings.push({ severity: 'error', message: m }),
		projectRoot: '/project',
		sandbox: memoryProjectFiles(new Map(Object.entries(files))),
		variables,
	};
	preprocessData(ast, { url: '/page', relativePath: 'page.md', filePath: '/project/page.md' }, ctx);
	const rendered = Markdoc.transform(ast, { tags, nodes });
	return { rendered, warnings };
}

function findTable(node: unknown): InstanceType<typeof Tag> | undefined {
	return findTag(node, (t) => t.name === 'table');
}
function cellsOf(tableOrRoot: unknown, name: 'th' | 'td'): InstanceType<typeof Tag>[] {
	return findAllTags(tableOrRoot, (t) => t.name === name);
}
function textOf(tag: InstanceType<typeof Tag>): string {
	return (tag.children ?? []).filter((c) => typeof c === 'string').join('');
}

const REVENUE_CSV = 'product,revenue,region\nWidget,"$1,200",EMEA\nGadget,"$900",AMER\nGizmo,"$1,500",EMEA\n';

describe('data rune — CSV → table (SPEC-103)', () => {
	it('emits a table node from a CSV source', () => {
		const { rendered } = runData('{% data src="d.csv" /%}', { 'd.csv': REVENUE_CSV });
		const table = findTable(rendered);
		expect(table).toBeDefined();
		const headers = cellsOf(table, 'th').map(textOf);
		expect(headers).toEqual(['product', 'revenue', 'region']);
		// 3 data rows × 3 cols.
		expect(cellsOf(table, 'td')).toHaveLength(9);
	});

	it('emits the table wrapped in div.rf-table-wrapper (chart/datatable lookup shape)', () => {
		const { rendered } = runData('{% data src="d.csv" /%}', { 'd.csv': REVENUE_CSV });
		const wrapper = findTag(rendered, (t) => t.name === 'div' && t.attributes.class === 'rf-table-wrapper');
		expect(wrapper).toBeDefined();
		expect(findTag(wrapper, (t) => t.name === 'table')).toBeDefined();
	});

	it('emits data-value on auto-inferred numeric cells; text cells carry none', () => {
		const { rendered } = runData('{% data src="d.csv" /%}', { 'd.csv': REVENUE_CSV });
		const tds = cellsOf(findTable(rendered), 'td');
		// Column order: product(text), revenue(numeric), region(text).
		const revenueCells = tds.filter((_t, i) => i % 3 === 1);
		expect(revenueCells.map((t) => t.attributes['data-value'])).toEqual(['1200', '900', '1500']);
		// Cell text keeps the human-formatted original.
		expect(textOf(revenueCells[0])).toBe('$1,200');
		// Text columns never get data-value.
		const productCells = tds.filter((_t, i) => i % 3 === 0);
		expect(productCells.every((t) => t.attributes['data-value'] === undefined)).toBe(true);
	});

	it('honors `where` (field:value filter)', () => {
		const { rendered } = runData('{% data src="d.csv" where="region:EMEA" /%}', { 'd.csv': REVENUE_CSV });
		const tds = cellsOf(findTable(rendered), 'td');
		expect(tds).toHaveLength(6); // 2 EMEA rows × 3 cols
		const products = tds.filter((_t, i) => i % 3 === 0).map(textOf);
		expect(products).toEqual(['Widget', 'Gizmo']);
	});

	it('honors `sort` (descending, numeric on a formatted column)', () => {
		const { rendered } = runData('{% data src="d.csv" sort="-revenue" /%}', { 'd.csv': REVENUE_CSV });
		const products = cellsOf(findTable(rendered), 'td').filter((_t, i) => i % 3 === 0).map(textOf);
		expect(products).toEqual(['Gizmo', 'Widget', 'Gadget']); // 1500, 1200, 900
	});

	it('honors `columns` select + order + rename, and numeric typing by source name', () => {
		const { rendered } = runData(
			'{% data src="d.csv" columns="product as Product, revenue as \'Revenue ($)\'" numeric="revenue" /%}',
			{ 'd.csv': REVENUE_CSV },
		);
		const table = findTable(rendered);
		expect(cellsOf(table, 'th').map(textOf)).toEqual(['Product', 'Revenue ($)']);
		// `numeric="revenue"` names the source column; the renamed column still types.
		const revenueCells = cellsOf(table, 'td').filter((_t, i) => i % 2 === 1);
		expect(revenueCells.map((t) => t.attributes['data-value'])).toEqual(['1200', '900', '1500']);
	});

	it('honors `limit` and `offset`', () => {
		const { rendered } = runData('{% data src="d.csv" limit=1 offset=1 /%}', { 'd.csv': REVENUE_CSV });
		const products = cellsOf(findTable(rendered), 'td').filter((_t, i) => i % 3 === 0).map(textOf);
		expect(products).toEqual(['Gadget']);
	});

	it('synthesizes col1… headers when header=false', () => {
		const { rendered } = runData('{% data src="d.csv" header=false /%}', { 'd.csv': 'a,b\n1,2\n' });
		expect(cellsOf(findTable(rendered), 'th').map(textOf)).toEqual(['col1', 'col2']);
		expect(cellsOf(findTable(rendered), 'td')).toHaveLength(4); // 2 rows × 2 cols
	});

	it('parses TSV via the format-inferred adapter', () => {
		const { rendered } = runData('{% data src="d.tsv" /%}', { 'd.tsv': 'a\tb\n1\t2\n' });
		expect(cellsOf(findTable(rendered), 'th').map(textOf)).toEqual(['a', 'b']);
		expect(cellsOf(findTable(rendered), 'td').map(textOf)).toEqual(['1', '2']);
	});

	it('forces text typing via `text` (suppresses data-value)', () => {
		const { rendered } = runData('{% data src="d.csv" text="revenue" /%}', { 'd.csv': 'product,revenue\nA,5\n' });
		const tds = cellsOf(findTable(rendered), 'td');
		expect(tds.every((t) => t.attributes['data-value'] === undefined)).toBe(true);
	});
});

describe('data rune — JSON / NDJSON (SPEC-103, WORK-486)', () => {
	const API_JSON = JSON.stringify({
		data: {
			results: [
				{ product: 'W', geo: { country: 'FR' }, units: '1,200', region: 'EMEA' },
				{ product: 'X', geo: { country: 'US' }, units: '900', region: 'AMER' },
				{ product: 'Y', geo: { country: 'DE' }, units: '1,500', region: 'EMEA' },
			],
		},
	});

	it('reads nested JSON via root + dotted columns, filtered/sorted/typed', () => {
		const { rendered } = runData(
			'{% data src="api.json" root="data.results" where="region:EMEA" columns="product as Product, geo.country as Country, units as Units" numeric="units" sort="-units" /%}',
			{ 'api.json': API_JSON },
		);
		const table = findTable(rendered);
		expect(cellsOf(table, 'th').map(textOf)).toEqual(['Product', 'Country', 'Units']);
		// EMEA rows only (W, Y), sorted -units → Y(1500) then W(1200).
		const products = cellsOf(table, 'td').filter((_t, i) => i % 3 === 0).map(textOf);
		expect(products).toEqual(['Y', 'W']);
		const countries = cellsOf(table, 'td').filter((_t, i) => i % 3 === 1).map(textOf);
		expect(countries).toEqual(['DE', 'FR']);
		// units typed numeric → data-value on the formatted values.
		const unitCells = cellsOf(table, 'td').filter((_t, i) => i % 3 === 2);
		expect(unitCells.map((t) => t.attributes['data-value'])).toEqual(['1500', '1200']);
	});

	it('reads an object-map JSON via orient=index + key-column into datatable', () => {
		const INV = JSON.stringify({ ABC: { name: 'Widget', stock: 5 }, DEF: { name: 'Gadget', stock: 9 } });
		const { rendered } = runData(
			'{% datatable %}\n{% data src="inv.json" orient="index" key-column="sku" columns="sku as SKU, name as Item, stock as Stock" numeric="stock" /%}\n{% /datatable %}',
			{ 'inv.json': INV },
		);
		const table = findTable(rendered);
		expect(cellsOf(table, 'th').map(textOf)).toEqual(['SKU', 'Item', 'Stock']);
		const skus = cellsOf(table, 'td').filter((_t, i) => i % 3 === 0).map(textOf);
		expect(skus).toEqual(['ABC', 'DEF']);
		expect(findTag(rendered, (t) => t.attributes?.['data-rune'] === 'data-table')).toBeDefined();
	});

	it('reads NDJSON records', () => {
		const { rendered } = runData('{% data src="d.ndjson" /%}', {
			'd.ndjson': '{"name":"A","qty":1}\n{"name":"B","qty":2}\n',
		});
		const table = findTable(rendered);
		expect(cellsOf(table, 'th').map(textOf)).toEqual(['name', 'qty']);
		expect(cellsOf(table, 'td').map(textOf)).toEqual(['A', '1', 'B', '2']);
	});

	it('feeds an object-map JSON into chart (numeric column carries data-value)', () => {
		const POP = JSON.stringify({ us: { pop: '9' }, fr: { pop: '6' } });
		const { rendered } = runData(
			'{% chart type="bar" %}\n{% data src="pop.json" orient="index" key-column="country" numeric="pop" /%}\n{% /chart %}',
			{ 'pop.json': POP },
		);
		expect(findTag(rendered, (t) => t.name === 'rf-chart')).toBeDefined();
		const popCells = cellsOf(findTable(rendered), 'td').filter((_t, i) => i % 2 === 1);
		expect(popCells.map((t) => t.attributes['data-value'])).toEqual(['9', '6']);
	});

	it('surfaces invalid JSON as an error callout', () => {
		const { rendered, warnings } = runData('{% data src="bad.json" /%}', { 'bad.json': '{not json' });
		expect(findTable(rendered)).toBeUndefined();
		expect(findTag(rendered, (t) => t.attributes?.['data-rune'] === 'hint')).toBeDefined();
		expect(warnings.some((w) => w.severity === 'error' && /invalid JSON/.test(w.message))).toBe(true);
	});
});

describe('data rune — composition with host runes (SPEC-103)', () => {
	it('feeds `chart` with no structural edits (renders rf-chart around the table)', () => {
		const { rendered } = runData(
			'{% chart type="line" title="Revenue" %}\n{% data src="d.csv" numeric="revenue" /%}\n{% /chart %}',
			{ 'd.csv': REVENUE_CSV },
		);
		expect(findTag(rendered, (t) => t.name === 'rf-chart')).toBeDefined();
		const table = findTable(rendered);
		expect(table).toBeDefined();
		// data-value survived into the chart's table.
		expect(cellsOf(table, 'td').some((t) => t.attributes['data-value'] === '1200')).toBe(true);
	});

	it('feeds `datatable` with no structural edits', () => {
		const { rendered } = runData(
			'{% datatable sortable="all" %}\n{% data src="d.csv" numeric="revenue" /%}\n{% /datatable %}',
			{ 'd.csv': REVENUE_CSV },
		);
		expect(findTag(rendered, (t) => t.attributes?.['data-rune'] === 'data-table')).toBeDefined();
		expect(findTable(rendered)).toBeDefined();
	});
});

describe('data rune — error path (SPEC-103)', () => {
	it('renders a visible error callout (not a table) + build warning on a missing file', () => {
		const { rendered, warnings } = runData('{% data src="nope.csv" /%}', {});
		expect(findTable(rendered)).toBeUndefined();
		const hint = findTag(rendered, (t) => t.attributes?.['data-rune'] === 'hint');
		expect(hint).toBeDefined();
		expect(warnings.some((w) => w.severity === 'error' && /cannot be resolved/.test(w.message))).toBe(true);
	});

	it('denies a root-escaping src (ProjectFiles containment) with a callout', () => {
		const { rendered, warnings } = runData('{% data src="../../etc/passwd" /%}', { 'secret': 'x' });
		expect(findTable(rendered)).toBeUndefined();
		expect(findTag(rendered, (t) => t.attributes?.['data-rune'] === 'hint')).toBeDefined();
		expect(warnings.some((w) => w.severity === 'error')).toBe(true);
	});

	it('errors visibly on an unknown format', () => {
		const { rendered, warnings } = runData('{% data src="d.dat" /%}', { 'd.dat': 'a,b\n1,2\n' });
		expect(findTable(rendered)).toBeUndefined();
		expect(warnings.some((w) => w.severity === 'error' && /infer format/.test(w.message))).toBe(true);
	});

	it('errors visibly when the result is empty after projection', () => {
		const { rendered, warnings } = runData('{% data src="d.csv" where="region:NOPE" /%}', { 'd.csv': REVENUE_CSV });
		expect(findTable(rendered)).toBeUndefined();
		expect(warnings.some((w) => w.severity === 'error' && /empty/.test(w.message))).toBe(true);
	});

	it('no-ops (leaves the tag) when no provider is available', () => {
		const ast = Markdoc.parse('{% data src="d.csv" /%}');
		const ctx = {
			info: () => {}, warn: () => {}, error: () => {},
			projectRoot: '/project', sandbox: undefined, variables: {},
		} as unknown as PreprocessContext;
		const result = preprocessData(ast, { url: '/p', relativePath: 'p.md', filePath: '/project/p.md' }, ctx);
		expect(result).toBeUndefined(); // no mutation
	});
});
