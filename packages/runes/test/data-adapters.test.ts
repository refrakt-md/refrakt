import { describe, it, expect } from 'vitest';
import { parseDelimited, delimitedAdapter, jsonAdapter, ndjsonAdapter, inferFormat, DataSourceError } from '../src/data-adapters.js';
import { normalizeNumber, applyTyping, applySort } from '../src/data-projection.js';

describe('parseDelimited (RFC 4180)', () => {
	it('parses simple comma-separated rows', () => {
		expect(parseDelimited('a,b\n1,2\n', ',')).toEqual([['a', 'b'], ['1', '2']]);
	});
	it('handles a missing trailing newline', () => {
		expect(parseDelimited('a,b\n1,2', ',')).toEqual([['a', 'b'], ['1', '2']]);
	});
	it('keeps quoted fields containing the delimiter', () => {
		expect(parseDelimited('name,note\n"Smith, J.",ok\n', ',')).toEqual([
			['name', 'note'],
			['Smith, J.', 'ok'],
		]);
	});
	it('keeps quoted fields containing newlines', () => {
		expect(parseDelimited('a\n"line1\nline2",x', ',')).toEqual([['a'], ['line1\nline2', 'x']]);
	});
	it('unescapes doubled quotes inside a quoted field', () => {
		expect(parseDelimited('q\n"she said ""hi"""\n', ',')).toEqual([['q'], ['she said "hi"']]);
	});
	it('handles CRLF line endings', () => {
		expect(parseDelimited('a,b\r\n1,2\r\n', ',')).toEqual([['a', 'b'], ['1', '2']]);
	});
	it('parses tabs as the delimiter', () => {
		expect(parseDelimited('a\tb\n1\t2', '\t')).toEqual([['a', 'b'], ['1', '2']]);
	});
});

describe('delimitedAdapter', () => {
	it('reduces CSV to { headers, rows }', () => {
		expect(delimitedAdapter('a,b\n1,2\n', { format: 'csv' })).toEqual({
			headers: ['a', 'b'],
			rows: [['1', '2']],
		});
	});
	it('synthesizes col1… when header=false', () => {
		expect(delimitedAdapter('1,2\n3,4\n', { format: 'csv', header: false })).toEqual({
			headers: ['col1', 'col2'],
			rows: [['1', '2'], ['3', '4']],
		});
	});
	it('honors an explicit delimiter override', () => {
		expect(delimitedAdapter('a;b\n1;2\n', { format: 'csv', delimiter: ';' })).toEqual({
			headers: ['a', 'b'],
			rows: [['1', '2']],
		});
	});
	it('pads ragged rows to the header width', () => {
		const out = delimitedAdapter('a,b,c\n1,2\n', { format: 'csv' });
		expect(out.rows).toEqual([['1', '2', '']]);
	});
	it('throws DataSourceError on empty input', () => {
		expect(() => delimitedAdapter('', { format: 'csv' })).toThrow(DataSourceError);
	});
});

describe('inferFormat', () => {
	it('maps extensions to formats', () => {
		expect(inferFormat('x.csv')).toBe('csv');
		expect(inferFormat('x.tsv')).toBe('tsv');
		expect(inferFormat('x.json')).toBe('json');
		expect(inferFormat('a/b/x.ndjson')).toBe('ndjson');
		expect(inferFormat('x.jsonl')).toBe('ndjson');
		expect(inferFormat('x.dat')).toBeNull();
		expect(inferFormat('noext')).toBeNull();
	});
});

describe('jsonAdapter', () => {
	it('records (auto-detected): keys become headers', () => {
		const out = jsonAdapter('[{"name":"A","revenue":10},{"name":"B","revenue":20}]');
		expect(out).toEqual({ headers: ['name', 'revenue'], rows: [['A', '10'], ['B', '20']] });
	});
	it('unions keys across records (missing → empty)', () => {
		const out = jsonAdapter('[{"a":1},{"a":2,"b":3}]');
		expect(out.headers).toEqual(['a', 'b']);
		expect(out.rows).toEqual([['1', ''], ['2', '3']]);
	});
	it('resolves `root` (dotted path) to a nested array', () => {
		const out = jsonAdapter('{"data":{"results":[{"x":1}]}}', { root: 'data.results' });
		expect(out).toEqual({ headers: ['x'], rows: [['1']] });
	});
	it('resolves `root` as a JSON Pointer', () => {
		const out = jsonAdapter('{"data":{"results":[{"x":1}]}}', { root: '/data/results' });
		expect(out.rows).toEqual([['1']]);
	});
	it('flattens nested objects into dotted headers', () => {
		const out = jsonAdapter('[{"product":"W","geo":{"country":"FR"}}]');
		expect(out.headers).toEqual(['product', 'geo.country']);
		expect(out.rows).toEqual([['W', 'FR']]);
	});
	it('values orient: first inner array is the header row', () => {
		const out = jsonAdapter('[["name","revenue"],["A",10],["B",20]]');
		expect(out).toEqual({ headers: ['name', 'revenue'], rows: [['A', '10'], ['B', '20']] });
	});
	it('auto-detects values orient when element[0] is an array', () => {
		const out = jsonAdapter('[["h1","h2"],["a","b"]]');
		expect(out.headers).toEqual(['h1', 'h2']);
	});
	it('index orient: object map with a synthesized key column', () => {
		const out = jsonAdapter('{"us":{"pop":9},"fr":{"pop":6}}', { orient: 'index', keyColumn: 'code' });
		expect(out.headers).toEqual(['code', 'pop']);
		expect(out.rows).toEqual([['us', '9'], ['fr', '6']]);
	});
	it('index key column defaults to `key`', () => {
		const out = jsonAdapter('{"a":{"v":1}}', { orient: 'index' });
		expect(out.headers[0]).toBe('key');
	});
	it('errors on an object map without orient=index', () => {
		expect(() => jsonAdapter('{"a":{"v":1}}')).toThrow(/orient="index"/);
	});
	it('errors on invalid JSON', () => {
		expect(() => jsonAdapter('{not json')).toThrow(DataSourceError);
	});
	it('errors on an unresolvable root', () => {
		expect(() => jsonAdapter('{"a":1}', { root: 'x.y' })).toThrow(/root path/);
	});
	it('comma-joins array leaf values', () => {
		const out = jsonAdapter('[{"tags":["a","b"]}]');
		expect(out.rows).toEqual([['a, b']]);
	});
});

describe('ndjsonAdapter', () => {
	it('parses line-delimited records, unioning keys', () => {
		const out = ndjsonAdapter('{"a":1}\n{"a":2,"b":3}\n');
		expect(out.headers).toEqual(['a', 'b']);
		expect(out.rows).toEqual([['1', ''], ['2', '3']]);
	});
	it('ignores blank lines', () => {
		const out = ndjsonAdapter('{"a":1}\n\n{"a":2}\n');
		expect(out.rows).toEqual([['1'], ['2']]);
	});
	it('errors (with the line number) on a malformed record', () => {
		expect(() => ndjsonAdapter('{"a":1}\n{bad}\n')).toThrow(/line 2/);
	});
	it('errors on an empty source', () => {
		expect(() => ndjsonAdapter('\n\n')).toThrow(DataSourceError);
	});
});

describe('normalizeNumber', () => {
	it('strips currency symbols and thousands separators', () => {
		expect(normalizeNumber('$1,200')).toBe(1200);
		expect(normalizeNumber('€1.5')).toBe(1.5);
		expect(normalizeNumber('1 000')).toBe(1000);
		expect(normalizeNumber('-42')).toBe(-42);
		expect(normalizeNumber('3.14e2')).toBe(314);
	});
	it('returns null for non-numeric text', () => {
		expect(normalizeNumber('')).toBeNull();
		expect(normalizeNumber('N/A')).toBeNull();
		expect(normalizeNumber('50%')).toBeNull();
		expect(normalizeNumber('12abc')).toBeNull();
	});
});

describe('applyTyping inference', () => {
	it('auto-infers a column as numeric when all non-empty cells parse', () => {
		const typed = applyTyping({ headers: ['n', 's'], rows: [['1', 'a'], ['', 'b'], ['3', 'c']] });
		expect(typed.columnTypes).toEqual(['numeric', 'text']);
		expect(typed.rows[0][0]).toEqual({ text: '1', value: 1 });
		expect(typed.rows[1][0]).toEqual({ text: '', value: null });
		expect(typed.rows[0][1]).toEqual({ text: 'a', value: null });
	});
	it('does not infer numeric when a cell is non-numeric', () => {
		const typed = applyTyping({ headers: ['x'], rows: [['1'], ['oops']] });
		expect(typed.columnTypes).toEqual(['text']);
	});
	it('respects numeric/text overrides', () => {
		const typed = applyTyping(
			{ headers: ['code', 'qty'], rows: [['007', '5']] },
			{ text: ['code'], numeric: ['qty'] },
		);
		expect(typed.columnTypes).toEqual(['text', 'numeric']);
		expect(typed.rows[0][0].value).toBeNull(); // forced text — no data-value
		expect(typed.rows[0][1].value).toBe(5);
	});
});

describe('applySort numeric detection', () => {
	it('sorts a formatted-numeric column numerically, not lexically', () => {
		const out = applySort({ headers: ['v'], rows: [['$900'], ['$1,500'], ['$1,200']] }, '-v');
		expect(out.rows.map((r) => r[0])).toEqual(['$1,500', '$1,200', '$900']);
	});
	it('sorts a text column with natural collation', () => {
		const out = applySort({ headers: ['s'], rows: [['item10'], ['item2'], ['item1']] }, 's');
		expect(out.rows.map((r) => r[0])).toEqual(['item1', 'item2', 'item10']);
	});
});
