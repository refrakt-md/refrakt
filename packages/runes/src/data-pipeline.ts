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

import type { Node } from '@markdoc/markdoc';
import type { ProjectFiles, PreprocessContext, PreprocessPage } from '@refrakt-md/types';
import {
	delimitedAdapter,
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

function walkAndReplaceData(
	node: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	files: ProjectFiles,
	onReplaced: () => void,
): void {
	if (!node.children) return;
	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		if (child.type === 'tag' && child.tag === 'data') {
			node.children[i] = resolveDataToNode(child, page, ctx, files);
			onReplaced();
			continue;
		}
		walkAndReplaceData(child, page, ctx, files, onReplaced);
	}
}

function resolveDataToNode(
	tag: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	files: ProjectFiles,
): Node {
	const a = tag.attributes;
	const src = resolveString(a.src, ctx.variables);

	if (!src) {
		const msg = 'data `src` attribute is required (and an unresolvable variable reference resolves to empty)';
		ctx.error(msg, page.url);
		return emitErrorNode(`data error: ${msg}`);
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

		return emitTableNode(typed);
	} catch (err) {
		const msg = err instanceof DataSourceError
			? err.message
			: `unexpected failure — ${err instanceof Error ? err.message : String(err)}`;
		ctx.error(`data "${src}": ${msg}`, page.url);
		return emitErrorNode(`data error: ${msg}`);
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
		case 'json':
		case 'ndjson':
			throw new DataSourceError(
				`the ${format} adapter is not available yet (lands in WORK-486); use format="csv" or "tsv"`,
			);
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
