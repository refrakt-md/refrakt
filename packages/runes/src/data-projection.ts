/**
 * Shared projection + typing for the `data` rune (SPEC-103).
 *
 * Everything here is format-agnostic: it runs on the intermediate
 * `{ headers, rows }` shape every adapter produces, identically regardless of
 * source. The pipeline is `where → sort → columns → limit/offset` (projection)
 * then `numeric/text` typing, which emits the normalized `data-value` channel
 * that carries a clean number to `chart`'s renderer and `datatable`'s sort.
 */

import type { Cell, DataTable } from './data-adapters.js';
import { parseFieldMatch, matchValue } from './field-match.js';

export type ColumnType = 'numeric' | 'text';

/** A typed cell: the original (human-formatted) text plus a normalized numeric
 *  value when the column is numeric and the text parses. The `value` becomes
 *  the cell's `data-value`; the text stays the visible content + no-JS fallback. */
export interface TypedCell {
	text: string;
	value: number | null;
}

/** The fully projected + typed table the emitter turns into a Markdoc node. */
export interface TypedTable {
	headers: string[];
	columnTypes: ColumnType[];
	rows: TypedCell[][];
}

/**
 * Normalize a human-formatted number to a plain JS number, or null when the
 * text isn't numeric. Strips common currency symbols and thousands separators
 * (`"$1,200"` → `1200`); leaves percentages, units, and prose as non-numeric.
 */
export function normalizeNumber(text: string): number | null {
	const trimmed = text.trim();
	if (trimmed === '') return null;
	const cleaned = trimmed
		.replace(/[$£€¥₹]/g, '')   // leading/embedded currency symbols
		.replace(/,/g, '')          // thousands separators
		.replace(/\s/g, '');        // grouping spaces
	if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(cleaned)) return null;
	const n = Number(cleaned);
	return Number.isFinite(n) ? n : null;
}

/** Resolve a column reference (header name) to its index, or -1 if absent. */
function columnIndex(headers: string[], name: string): number {
	return headers.indexOf(name);
}

/** A single `columns` selection: source header + optional rename. */
interface ColumnSelection {
	source: string;
	as?: string;
}

/** Parse a `columns` spec — `"name as Product, revenue as 'Revenue ($)'"` —
 *  into ordered selections. Commas inside quotes don't split; aliases may be
 *  bare, single-, or double-quoted. */
export function parseColumnsSpec(spec: string): ColumnSelection[] {
	const parts = splitTopLevel(spec, ',');
	const selections: ColumnSelection[] = [];
	for (const raw of parts) {
		const part = raw.trim();
		if (part === '') continue;
		const m = /^(.*?)\s+as\s+(.+)$/i.exec(part);
		if (m) {
			selections.push({ source: stripQuotes(m[1].trim()), as: stripQuotes(m[2].trim()) });
		} else {
			selections.push({ source: stripQuotes(part) });
		}
	}
	return selections;
}

/** Split on `sep` at the top level only (not inside `'…'` or `"…"`). */
function splitTopLevel(input: string, sep: string): string[] {
	const out: string[] = [];
	let cur = '';
	let quote: string | null = null;
	for (const ch of input) {
		if (quote) {
			if (ch === quote) quote = null;
			else cur += ch;
			continue;
		}
		if (ch === '"' || ch === "'") { quote = ch; continue; }
		if (ch === sep) { out.push(cur); cur = ''; continue; }
		cur += ch;
	}
	out.push(cur);
	return out;
}

function stripQuotes(s: string): string {
	if (s.length >= 2 && ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))) {
		return s.slice(1, -1);
	}
	return s;
}

/**
 * Apply `where` — filter rows with the SPEC-070 `field:value` grammar, reusing
 * `parseFieldMatch` + `matchValue` with a row-shaped resolver (the column header
 * is the field; the cell text is the single candidate). AND across distinct
 * fields, OR within a repeated field. Returns the (possibly filtered) table plus
 * any parse warnings for the caller to surface.
 */
export function applyWhere(
	table: DataTable,
	expr: string | undefined,
): { table: DataTable; warnings: string[] } {
	const parsed = parseFieldMatch(expr);
	if (parsed.clauses.length === 0) return { table, warnings: parsed.warnings };

	const indexOf = new Map(table.headers.map((h, i) => [h, i] as const));
	const rows = table.rows.filter((row) =>
		parsed.clauses.every((clause) => {
			const idx = indexOf.get(clause.field);
			const cell = idx === undefined ? '' : (row[idx] ?? '');
			return clause.values.some((v) => matchValue(cell, v));
		}),
	);
	return { table: { headers: table.headers, rows }, warnings: parsed.warnings };
}

/** Apply `columns` — select, reorder, and rename. Unknown sources are skipped
 *  (a `where`/`sort` may legitimately reference a column the author then drops).
 *  Returns the (possibly renamed) table plus `sources` — the original source
 *  header for each output column, so typing can match `numeric`/`text` against
 *  either the source or the alias. With no spec, the table is unchanged and
 *  `sources` mirrors the headers. */
export function applyColumns(
	table: DataTable,
	spec: string | undefined,
): { table: DataTable; sources: string[] } {
	if (!spec || spec.trim() === '') return { table, sources: [...table.headers] };
	const selections = parseColumnsSpec(spec);
	const picked = selections
		.map((sel) => ({ sel, idx: columnIndex(table.headers, sel.source) }))
		.filter((p) => p.idx !== -1);
	if (picked.length === 0) return { table, sources: [...table.headers] };

	const headers = picked.map((p) => p.sel.as ?? p.sel.source);
	const sources = picked.map((p) => p.sel.source);
	const rows = table.rows.map((row) => picked.map((p) => row[p.idx] ?? ''));
	return { table: { headers, rows }, sources };
}

/** Apply `sort` — `"revenue"` (asc) or `"-revenue"` (desc). Sorts numerically
 *  when every non-empty cell in the column parses as a number, else by natural
 *  string collation. A no-op when `spec` is empty or names an unknown column. */
export function applySort(table: DataTable, spec: string | undefined): DataTable {
	if (!spec || spec.trim() === '') return table;
	const trimmed = spec.trim();
	const desc = trimmed.startsWith('-');
	const name = desc ? trimmed.slice(1).trim() : trimmed;
	const idx = columnIndex(table.headers, name);
	if (idx === -1) return table;

	const cells = table.rows.map((r) => r[idx] ?? '');
	const allNumeric = cells.every((c) => c.trim() === '' || normalizeNumber(c) !== null)
		&& cells.some((c) => normalizeNumber(c) !== null);

	const sorted = [...table.rows].sort((a, b) => {
		const ca = a[idx] ?? '';
		const cb = b[idx] ?? '';
		let cmp: number;
		if (allNumeric) {
			const na = normalizeNumber(ca);
			const nb = normalizeNumber(cb);
			// Empty/non-numeric sorts last in ascending order.
			if (na === null && nb === null) cmp = 0;
			else if (na === null) cmp = 1;
			else if (nb === null) cmp = -1;
			else cmp = na - nb;
		} else {
			cmp = ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' });
		}
		return desc ? -cmp : cmp;
	});
	return { headers: table.headers, rows: sorted };
}

/** Apply `limit`/`offset` — a row slice (the `data` analogue of snippet `lines=`). */
export function applyLimitOffset(table: DataTable, limit?: number, offset?: number): DataTable {
	const start = offset && offset > 0 ? offset : 0;
	if (start === 0 && (limit === undefined || limit < 0)) return table;
	const end = limit !== undefined && limit >= 0 ? start + limit : undefined;
	return { headers: table.headers, rows: table.rows.slice(start, end) };
}

/**
 * Type each column and emit the `data-value` channel. A column is numeric when
 * explicitly listed in `numeric`, or (by default) when every non-empty cell
 * parses as a number; `text` forces a column back to text. Numeric value cells
 * carry the normalized number; text cells carry `null`.
 */
export function applyTyping(
	table: DataTable,
	opts: { numeric?: string[]; text?: string[]; sources?: string[] } = {},
): TypedTable {
	const numericForced = new Set(opts.numeric ?? []);
	const textForced = new Set(opts.text ?? []);
	const sources = opts.sources;

	const columnTypes: ColumnType[] = table.headers.map((header, c) => {
		const source = sources?.[c] ?? header;
		// `numeric`/`text` may name either the final (renamed) header or the
		// original source column.
		if (textForced.has(header) || textForced.has(source)) return 'text';
		if (numericForced.has(header) || numericForced.has(source)) return 'numeric';
		return inferNumeric(table.rows, c) ? 'numeric' : 'text';
	});

	const rows: TypedCell[][] = table.rows.map((row) =>
		row.map((cell, c): TypedCell => ({
			text: cell,
			value: columnTypes[c] === 'numeric' ? normalizeNumber(cell) : null,
		})),
	);

	return { headers: table.headers, columnTypes, rows };
}

/** A column auto-infers as numeric when it has at least one numeric cell and
 *  every non-empty cell parses as a number. */
function inferNumeric(rows: Cell[][], col: number): boolean {
	let sawNumber = false;
	for (const row of rows) {
		const cell = row[col] ?? '';
		if (cell.trim() === '') continue;
		if (normalizeNumber(cell) === null) return false;
		sawNumber = true;
	}
	return sawNumber;
}
