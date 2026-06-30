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
