/**
 * AST emission for the `data` rune (SPEC-103).
 *
 * Turns the projected + typed table into a Markdoc `table` AST node — the same
 * shape `Markdoc.parse` produces for a pipe table — so `chart` (`findTable`) and
 * `datatable` (its table/`rf-table-wrapper` lookup) consume it with no
 * structural edits, and it renders as a normal table standalone. Typed-numeric
 * value cells carry a normalized `data-value` (forwarded by the `td` node).
 *
 * The error path emits a visible `hint` callout node instead of a malformed
 * table, so a bad source surfaces on the page without crashing the build.
 */

import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import type { TypedTable } from './data-projection.js';

const { Ast } = Markdoc;

/** Wrap plain text as a Markdoc inline node (the content shape a th/td holds). */
function inlineText(text: string): Node {
	return new Ast.Node('inline', {}, [new Ast.Node('text', { content: text })]);
}

/** Build a Markdoc `table` AST node from a projected + typed table. */
export function emitTableNode(table: TypedTable): Node {
	const headerCells = table.headers.map((h) => new Ast.Node('th', {}, [inlineText(h)]));
	const thead = new Ast.Node('thead', {}, [new Ast.Node('tr', {}, headerCells)]);

	const bodyRows = table.rows.map((row) => {
		const cells = row.map((cell, c) => {
			// A numeric column with a parseable value carries the normalized number
			// on `data-value`; the cell text stays the original human-formatted
			// string (and the no-JS fallback).
			const attrs = table.columnTypes[c] === 'numeric' && cell.value !== null
				? { 'data-value': String(cell.value) }
				: {};
			return new Ast.Node('td', attrs, [inlineText(cell.text)]);
		});
		return new Ast.Node('tr', {}, cells);
	});
	const tbody = new Ast.Node('tbody', {}, bodyRows);

	return new Ast.Node('table', {}, [thead, tbody]);
}

/**
 * Build a `table` node whose cells are **authored Markdoc** rather than literal
 * text (WORK-550).
 *
 * `emitTableNode` above wraps every cell in a bare `text` node, so nothing a
 * source contains is ever markup — right for arbitrary CSV, but it means a
 * generated reference table cannot render `` `href` `` or `✓` the way the
 * hand-written one it replaces does. Here the cells come from the rune's body,
 * already parsed by Markdoc and bound per row, so emphasis, links, runes and
 * `{% if %}` all work inside one.
 *
 * The output is deliberately the *same* shape `emitTableNode` produces —
 * `table > thead > tr > th` and `table > tbody > tr > td` — so `chart`'s
 * `findTable`, `datatable`'s lookup and the `td` node's rendering need no
 * special case for a body-built table.
 */
/**
 * Drop the wrapping `paragraph` from a single-block cell.
 *
 * A cell authored as one line parses to `paragraph > inline > …`, which would
 * render `<td><p>href</p></td>` — where a hand-written pipe table gives
 * `<td>href</td>`, and where the theme's paragraph spacing then applies inside
 * a table cell. Unwrapping keeps a body-built table structurally identical to
 * both, which is the whole point of reusing the shape.
 *
 * A cell with several blocks (a list, two paragraphs) keeps them: there the
 * wrapper is carrying real structure rather than markdown's default.
 */
function unwrapCell(cell: Node[]): Node[] {
	if (cell.length === 1 && cell[0].type === 'paragraph') return cell[0].children ?? [];
	return cell;
}

export function emitBodyTableNode(headers: string[], rows: Node[][][]): Node {
	const headerCells = headers.map((h) => new Ast.Node('th', {}, [inlineText(h)]));
	const thead = new Ast.Node('thead', {}, [new Ast.Node('tr', {}, headerCells)]);

	const bodyRows = rows.map((cells) =>
		new Ast.Node('tr', {}, cells.map((cell) => new Ast.Node('td', {}, unwrapCell(cell)))),
	);
	const tbody = new Ast.Node('tbody', {}, bodyRows);

	return new Ast.Node('table', {}, [thead, tbody]);
}

/**
 * Build a visible in-page error callout (a `hint` rune node, `type="caution"`)
 * carrying the message — used for sandbox-escape / missing-file / parse-error /
 * empty-result, so the failure is visible and the build continues (the `data`
 * tag never reaches its throwing transform).
 */
export function emitErrorNode(message: string): Node {
	const para = new Ast.Node('paragraph', {}, [inlineText(message)]);
	return new Ast.Node('tag', { type: 'caution' }, [para], 'hint');
}
