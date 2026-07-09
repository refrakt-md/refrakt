/**
 * Format adapters for the `data` rune (SPEC-103).
 *
 * A format adapter has exactly one job: get raw bytes to the shared
 * intermediate shape `{ headers, rows }`. That is the *only* place
 * format-specific knobs live — everything downstream (projection, typing,
 * table emission) is format-agnostic. This module owns the CSV/TSV adapter;
 * JSON/NDJSON adapters (WORK-486) land here against the same contract.
 */

/** A single table cell — raw text, pre-typing. */
export type Cell = string;

/** The shared intermediate shape every adapter reduces its source to. */
export interface DataTable {
	headers: string[];
	rows: Cell[][];
}

/** Supported source formats. `sqlite` is specified (SPEC-103) but deferred. */
export type DataFormat = 'csv' | 'tsv' | 'json' | 'ndjson';

/** Thrown by adapters on a malformed source. The preprocess hook catches it
 *  and renders an in-page error callout (never a malformed table). */
export class DataSourceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DataSourceError';
	}
}

/** Infer the format from a file extension, lower-cased. Returns null for an
 *  unknown extension so the caller can fall back to an explicit `format`. */
export function inferFormat(path: string): DataFormat | null {
	const dot = path.lastIndexOf('.');
	if (dot === -1) return null;
	const ext = path.slice(dot + 1).toLowerCase();
	switch (ext) {
		case 'csv': return 'csv';
		case 'tsv': return 'tsv';
		case 'json': return 'json';
		case 'ndjson':
		case 'jsonl': return 'ndjson';
		default: return null;
	}
}

/**
 * Parse delimited text (CSV/TSV) into a raw grid of string cells, following
 * RFC 4180: double-quoted fields may contain the delimiter, CR/LF, and escaped
 * quotes (`""`). Handles both `\n` and `\r\n` line endings. A trailing newline
 * does not produce a spurious empty final row.
 */
export function parseDelimited(text: string, delimiter: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;
	let started = false; // any char seen on the current row (so blank lines are kept faithfully)

	const pushField = (): void => {
		row.push(field);
		field = '';
	};
	const pushRow = (): void => {
		pushField();
		rows.push(row);
		row = [];
		started = false;
	};

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];

		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') { field += '"'; i++; }
				else inQuotes = false;
			} else {
				field += ch;
			}
			continue;
		}

		if (ch === '"') { inQuotes = true; started = true; continue; }
		if (ch === delimiter) { pushField(); started = true; continue; }
		if (ch === '\r') { started = true; continue; } // CR handled with the following LF
		if (ch === '\n') { pushRow(); continue; }
		field += ch;
		started = true;
	}

	// Flush the final field/row unless the input ended exactly on a newline.
	if (started || field.length > 0 || row.length > 0) pushRow();

	return rows;
}

/** Options the CSV/TSV adapter accepts (the format-specific knobs). */
export interface DelimitedAdapterOptions {
	/** `csv` or `tsv` — selects the default delimiter. */
	format: 'csv' | 'tsv';
	/** Explicit delimiter override (wins over the format default). */
	delimiter?: string;
	/** Whether the first row is the header (default true). When false, headers
	 *  are synthesized as `col1`, `col2`, … */
	header?: boolean;
}

/**
 * CSV/TSV adapter — reduce delimited text to `{ headers, rows }`. Honors
 * `delimiter` (explicit override or the format default) and `header`
 * (false → synthesized `col1…`). Ragged rows are padded/truncated to the
 * header width so the grid stays rectangular.
 */
export function delimitedAdapter(raw: string, opts: DelimitedAdapterOptions): DataTable {
	const delimiter = opts.delimiter && opts.delimiter.length > 0
		? opts.delimiter
		: (opts.format === 'tsv' ? '\t' : ',');

	const grid = parseDelimited(raw, delimiter).filter(
		// Drop fully-empty trailing rows (a single empty field from a blank line).
		(r) => !(r.length === 1 && r[0] === ''),
	);

	if (grid.length === 0) {
		throw new DataSourceError('source is empty (no rows)');
	}

	const useHeader = opts.header !== false;
	let headers: string[];
	let bodyStart: number;
	if (useHeader) {
		headers = grid[0].map((h) => h.trim());
		bodyStart = 1;
	} else {
		const width = grid.reduce((max, r) => Math.max(max, r.length), 0);
		headers = Array.from({ length: width }, (_, i) => `col${i + 1}`);
		bodyStart = 0;
	}

	const width = headers.length;
	const rows: Cell[][] = [];
	for (let i = bodyStart; i < grid.length; i++) {
		const r = grid[i];
		const cells: Cell[] = [];
		for (let c = 0; c < width; c++) cells.push(r[c] ?? '');
		rows.push(cells);
	}

	return { headers, rows };
}

// ─────────────────────────────────────────────────────────────────────────
// JSON / NDJSON adapters (WORK-486)
// ─────────────────────────────────────────────────────────────────────────

/** Stringify a leaf value for a cell. Primitives become their string form;
 *  arrays of primitives comma-join; anything else JSON-serializes. */
function cellString(v: unknown): string {
	if (v === null || v === undefined) return '';
	if (Array.isArray(v)) return v.map((x) => (x === null || x === undefined ? '' : String(x))).join(', ');
	if (typeof v === 'object') return JSON.stringify(v);
	return String(v);
}

/** Recursively flatten a record's nested plain objects into dotted keys
 *  (`{ geo: { country } }` → `geo.country`), so `columns` can pluck nested
 *  fields by exact (dotted) header and the intermediate shape stays flat text.
 *  Arrays and primitives are leaves. */
function flattenRecord(obj: Record<string, unknown>, prefix = '', out: Record<string, string> = {}): Record<string, string> {
	for (const [k, v] of Object.entries(obj)) {
		const key = prefix ? `${prefix}.${k}` : k;
		if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
			flattenRecord(v as Record<string, unknown>, key, out);
		} else {
			out[key] = cellString(v);
		}
	}
	return out;
}

/** Reduce an array of record objects to `{ headers, rows }` — headers are the
 *  union of flattened keys in first-seen order. Shared by JSON `records`/`index`
 *  and NDJSON. */
function recordsToTable(records: Record<string, unknown>[], leadKey?: { header: string; values: string[] }): DataTable {
	const flat = records.map((r) => flattenRecord(r));
	const seen = new Set<string>();
	const headers: string[] = [];
	if (leadKey) { headers.push(leadKey.header); seen.add(leadKey.header); }
	for (const f of flat) {
		for (const k of Object.keys(f)) {
			if (!seen.has(k)) { seen.add(k); headers.push(k); }
		}
	}
	const rows = flat.map((f, i) => headers.map((h, c) => {
		if (leadKey && c === 0) return leadKey.values[i];
		return f[h] ?? '';
	}));
	return { headers, rows };
}

/** Resolve a `root` locator (dotted path or JSON Pointer) within a document. */
function resolveRoot(doc: unknown, root: string): unknown {
	if (!root) return doc;
	const parts = root.startsWith('/')
		? root.slice(1).split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'))
		: root.split('.');
	let cur: unknown = doc;
	for (const p of parts) {
		if (cur === null || typeof cur !== 'object') {
			throw new DataSourceError(`root path "${root}" does not resolve to a value`);
		}
		cur = (cur as Record<string, unknown>)[p];
	}
	if (cur === undefined) throw new DataSourceError(`root path "${root}" not found in the document`);
	return cur;
}

export interface JsonAdapterOptions {
	/** Dotted path / JSON Pointer to the array or map within the document. */
	root?: string;
	/** How each element maps to a row. `records`/`values` auto-detected; `index` explicit. */
	orient?: 'records' | 'values' | 'index';
	/** When `orient=index`, the header for the synthesized key column (default `key`). */
	keyColumn?: string;
}

/** JSON adapter — reduce a JSON document to `{ headers, rows }` per `root`/`orient`. */
export function jsonAdapter(raw: string, opts: JsonAdapterOptions = {}): DataTable {
	let doc: unknown;
	try {
		doc = JSON.parse(raw);
	} catch (err) {
		throw new DataSourceError(`invalid JSON — ${(err as Error).message}`);
	}
	const target = resolveRoot(doc, opts.root ?? '');

	// Determine orientation.
	let orient = opts.orient;
	if (!orient) {
		if (Array.isArray(target)) {
			orient = Array.isArray(target[0]) ? 'values' : 'records';
		} else if (target && typeof target === 'object') {
			throw new DataSourceError('source is an object map — set orient="index" (with key-column) to tabulate it');
		} else {
			throw new DataSourceError('source is not an array or object of records');
		}
	}

	if (orient === 'values') {
		if (!Array.isArray(target) || target.length === 0) {
			throw new DataSourceError('orient="values" expects a non-empty array of arrays');
		}
		const [headerRow, ...body] = target as unknown[][];
		const headers = (headerRow as unknown[]).map(cellString);
		const rows = body.map((inner) => headers.map((_, i) => cellString((inner as unknown[])[i])));
		return { headers, rows };
	}

	if (orient === 'index') {
		if (!target || typeof target !== 'object' || Array.isArray(target)) {
			throw new DataSourceError('orient="index" expects an object map ({ key: record, … })');
		}
		const entries = Object.entries(target as Record<string, unknown>);
		const records = entries.map(([, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : { value: v }));
		const keys = entries.map(([k]) => k);
		return recordsToTable(records, { header: opts.keyColumn && opts.keyColumn.length > 0 ? opts.keyColumn : 'key', values: keys });
	}

	// records
	if (!Array.isArray(target)) {
		throw new DataSourceError('orient="records" expects an array of objects');
	}
	const records = (target as unknown[]).map((r) => (r && typeof r === 'object' && !Array.isArray(r) ? r as Record<string, unknown> : { value: r }));
	return recordsToTable(records);
}

/** NDJSON adapter — parse line-delimited JSON records to `{ headers, rows }`
 *  (the union of record keys becomes the headers). */
export function ndjsonAdapter(raw: string): DataTable {
	const records: Record<string, unknown>[] = [];
	const lines = raw.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line === '') continue;
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch (err) {
			throw new DataSourceError(`invalid NDJSON on line ${i + 1} — ${(err as Error).message}`);
		}
		records.push(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { value: parsed });
	}
	if (records.length === 0) throw new DataSourceError('source is empty (no NDJSON records)');
	return recordsToTable(records);
}
