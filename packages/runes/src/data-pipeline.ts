/**
 * Data pipeline hook (SPEC-103).
 *
 * A preprocess sibling to `preprocessSnippets`: walk the parsed AST, and for
 * every `{% data %}` tag resolve its `src` through the SPEC-113 `ProjectFiles`
 * seam (whole-file, project-root bounded), run the format adapter + shared
 * projection + typing, and replace the tag with a Markdoc `table` AST node. The
 * emitted table is consumed by `chart`/`datatable` with no structural edits and
 * is the honest no-JS fallback on a bare page.
 *
 * On any failure (sandbox escape / missing file / parse error / empty result)
 * the tag is replaced with a visible error callout and a build warning is
 * emitted — the build continues and the `data` tag never reaches its throwing
 * transform.
 */

import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
const { Ast } = Markdoc;
import type { ProjectFiles, PreprocessContext, PreprocessPage } from '@refrakt-md/types';
import {
	delimitedAdapter,
	jsonAdapter,
	ndjsonAdapter,
	inferFormat,
	DataSourceError,
	type DataTable,
	type DataFormat,
} from './data-adapters.js';
import {
	applyWhere,
	applySort,
	applyColumns,
	applyLimitOffset,
	applyTyping,
	type TypedTable,
} from './data-projection.js';
import { emitTableNode, emitErrorNode } from './data-emit.js';

/** Resolve a Markdoc attribute value to a string — literal strings and
 *  `Variable` AST nodes (e.g. `src=$file.dir`). Mirrors snippet's resolver. */
function resolveString(value: unknown, variables: Record<string, unknown> | undefined): string {
	if (value === undefined || value === null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (typeof value === 'object' && '$$mdtype' in (value as Record<string, unknown>)) {
		const node = value as { $$mdtype: string; path?: unknown };
		if (node.$$mdtype === 'Variable' && Array.isArray(node.path)) {
			let current: unknown = variables;
			for (const segment of node.path as string[]) {
				if (current === null || current === undefined) return '';
				current = (current as Record<string, unknown>)[segment];
			}
			return current === null || current === undefined ? '' : String(current);
		}
	}
	return '';
}

/** Parse a comma-separated column list into trimmed, non-empty names. */
function splitList(raw: string): string[] {
	return raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Preprocess: replace every `{% data %}` tag with a resolved `table` node (or an
 * error callout). No-op when no provider is available (tree mode without a wired
 * `ProjectFiles`), matching snippet.
 */
export function preprocessData(
	ast: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
): Node | void {
	if (!ctx.sandbox) return;
	let mutated = false;
	walkAndReplaceData(ast, page, ctx, ctx.sandbox, () => { mutated = true; });
	return mutated ? ast : undefined;
}

/** Runes that consume a `<table>` child directly, so a per-row body inside them
 *  would render as a silently empty chart rather than an error (SPEC-127). */
const TABLE_CONSUMERS = new Set(['chart', 'datatable']);

function walkAndReplaceData(
	node: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	files: ProjectFiles,
	onReplaced: () => void,
	enclosing?: string,
): void {
	if (!node.children) return;
	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		if (child.type === 'tag' && child.tag === 'data') {
			// **Splice, never wrap.** One `data` tag may now produce N nodes, and
			// they have to land as direct siblings: a container node to keep the
			// replacement 1:1 breaks composition invisibly, and how badly depends
			// on the parent. Measured against `accordion`, a `{% div %}` wrapper is
			// harmless while `{% section %}` and `{% grid %}` consume their
			// children — the `accordion-item` tags and their body text vanish with
			// no error or warning (SPEC-127).
			const replacement = resolveData(child, page, ctx, files, enclosing);
			node.children.splice(i, 1, ...replacement);
			i += replacement.length - 1;
			onReplaced();
			continue;
		}
		walkAndReplaceData(child, page, ctx, files, onReplaced, child.tag ?? enclosing);
	}
}

/**
 * Bind one row into a copy of the template body.
 *
 * `$row.x` reaches the AST as a `Variable` in a node's *attributes* — on a tag
 * (`href=$row.url`) and equally on a `text` node, where `{% $row.title %}`
 * becomes `content: Variable(['row','title'])`. So one rule covers both.
 *
 * Substitution happens here, at preprocess, rather than being left to the
 * transform's `config.variables`: the binding differs per row, and a single
 * shared config cannot express that.
 */
function bindRow(node: Node, row: Record<string, unknown>): Node {
	const attributes: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(node.attributes ?? {})) {
		attributes[key] = resolveRowVariable(value, row);
	}
	const children = (node.children ?? []).map((child) => bindRow(child, row));
	const copy = new Ast.Node(node.type, attributes, children, node.tag);
	// `inline` and a few other node types carry meaning in fields the
	// constructor does not take; copy what Markdoc sets.
	if (node.lines) copy.lines = node.lines;
	if (node.location) copy.location = node.location;
	return copy;
}

function resolveRowVariable(value: unknown, row: Record<string, unknown>): unknown {
	if (value && typeof value === 'object') {
		const node = value as { $$mdtype?: string; path?: unknown };
		if (node.$$mdtype === 'Variable' && Array.isArray(node.path) && node.path[0] === 'row') {
			let current: unknown = row;
			for (const segment of (node.path as string[]).slice(1)) {
				if (current === null || current === undefined) return '';
				current = (current as Record<string, unknown>)[segment];
			}
			return current === null || current === undefined ? '' : current;
		}
	}
	return value;
}

/**
 * Project a typed table into plain row objects keyed by column header.
 *
 * A numeric column exposes its normalized number so a template can do
 * arithmetic or formatting with it; everything else exposes the cell's text,
 * which is what a template renders.
 *
 * Booleans are the one extra coercion. The table intermediate is text, so a
 * JSON `false` arrives as the *string* `"false"` — which is truthy, making
 * `{% if $row.flag %}` render for every row. Sources with boolean fields are
 * exactly what a per-row template wants to branch on, so `"true"` / `"false"`
 * bind as booleans. The match is on the whole cell, so a column of prose
 * mentioning "false" is unaffected.
 */
function rowObjects(table: TypedTable): Record<string, unknown>[] {
	return table.rows.map((cells) => {
		const row: Record<string, unknown> = {};
		cells.forEach((cell, c) => {
			if (table.columnTypes[c] === 'numeric' && cell.value !== null) {
				row[table.headers[c]] = cell.value;
			} else if (cell.text === 'true' || cell.text === 'false') {
				row[table.headers[c]] = cell.text === 'true';
			} else {
				row[table.headers[c]] = cell.text;
			}
		});
		return row;
	});
}

function resolveData(
	tag: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	files: ProjectFiles,
	enclosing?: string,
): Node[] {
	const body = (tag.children ?? []).filter((child) => child.type !== 'text' || String(child.attributes?.content ?? '').trim() !== '');
	if (body.length > 0 && enclosing && TABLE_CONSUMERS.has(enclosing)) {
		const msg = `a per-row body cannot be used inside {% ${enclosing} %}, which consumes the table this rune would otherwise emit — remove the body, or move the {% data %} outside`;
		ctx.error(`data: ${msg}`, page.url);
		return [emitErrorNode(`data error: ${msg}`)];
	}
	return resolveDataToNodes(tag, page, ctx, files, body);
}

function resolveDataToNodes(
	tag: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	files: ProjectFiles,
	body: Node[],
): Node[] {
	const a = tag.attributes;
	const src = resolveString(a.src, ctx.variables);

	if (!src) {
		const msg = 'data `src` attribute is required (and an unresolvable variable reference resolves to empty)';
		ctx.error(msg, page.url);
		return [emitErrorNode(`data error: ${msg}`)];
	}

	try {
		const raw = files.read(src);
		if (raw === null) {
			throw new DataSourceError(
				`source "${src}" cannot be resolved — the file is missing or outside the project root`,
			);
		}

		const format = resolveFormat(src, resolveString(a.format, ctx.variables));
		const table = runAdapter(raw, format, a, ctx);

		// Shared projection: where → sort → columns → limit/offset.
		const { table: filtered, warnings } = applyWhere(table, resolveString(a.where, ctx.variables) || undefined);
		for (const w of warnings) ctx.warn(`data "${src}": ${w}`, page.url);
		const sorted = applySort(filtered, resolveString(a.sort, ctx.variables) || undefined);
		const { table: selected, sources } = applyColumns(sorted, resolveString(a.columns, ctx.variables) || undefined);
		const projected: DataTable = applyLimitOffset(selected, numberAttr(a.limit), numberAttr(a.offset));

		if (projected.rows.length === 0) {
			throw new DataSourceError('result is empty after projection (no rows to render)');
		}

		// Shared typing → data-value channel (`numeric`/`text` may name the
		// source or the renamed column).
		const numericCols = splitList(resolveString(a.numeric, ctx.variables));
		const textCols = splitList(resolveString(a.text, ctx.variables));
		const typed = applyTyping(projected, { numeric: numericCols, text: textCols, sources });

		if (body.length === 0) return [emitTableNode(typed)];

		// `numeric` / `text` exist to drive the `data-value` channel that charts
		// and sortable tables read off `<td>`s. With a body there are no cells to
		// carry it, so say so rather than accepting an attribute that does
		// nothing — the same posture WORK-536 took for silently dropped axes.
		if (numericCols.length > 0 || textCols.length > 0) {
			ctx.warn(
				`data "${src}": \`numeric\` / \`text\` set alongside a per-row body — they type the ` +
				'`data-value` attribute on table cells, and a body emits no cells. Numeric columns are ' +
				'still bound to `$row` as numbers.',
				page.url,
			);
		}

		return rowObjects(typed).flatMap((row) => body.map((child) => bindRow(child, row)));
	} catch (err) {
		const msg = err instanceof DataSourceError
			? err.message
			: `unexpected failure — ${err instanceof Error ? err.message : String(err)}`;
		ctx.error(`data "${src}": ${msg}`, page.url);
		return [emitErrorNode(`data error: ${msg}`)];
	}
}

/** Resolve the effective format: explicit override, else extension-inferred. */
function resolveFormat(src: string, explicit: string): DataFormat {
	if (explicit) return explicit as DataFormat;
	const inferred = inferFormat(src);
	if (inferred) return inferred;
	throw new DataSourceError(
		`could not infer format from "${src}" — add format="csv|tsv|json|ndjson"`,
	);
}

/** Dispatch to the format adapter. CSV/TSV land here (WORK-417); JSON/NDJSON
 *  adapters arrive in WORK-486 against this same contract. */
function runAdapter(
	raw: string,
	format: DataFormat,
	a: Record<string, unknown>,
	ctx: PreprocessContext,
): DataTable {
	switch (format) {
		case 'csv':
		case 'tsv':
			return delimitedAdapter(raw, {
				format,
				delimiter: resolveString(a.delimiter, ctx.variables) || undefined,
				header: a.header === undefined ? undefined : a.header !== false,
			});
		case 'json': {
			const orient = resolveString(a.orient, ctx.variables);
			return jsonAdapter(raw, {
				root: resolveString(a.root, ctx.variables) || undefined,
				orient: orient ? (orient as 'records' | 'values' | 'index') : undefined,
				keyColumn: resolveString(a['key-column'], ctx.variables) || undefined,
			});
		}
		case 'ndjson':
			return ndjsonAdapter(raw);
		default:
			throw new DataSourceError(`unsupported format "${format}"`);
	}
}

function numberAttr(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() !== '') {
		const n = Number(value);
		return Number.isFinite(n) ? n : undefined;
	}
	return undefined;
}
