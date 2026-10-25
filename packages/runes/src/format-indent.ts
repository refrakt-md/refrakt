/**
 * `refrakt format` — SPEC-170 D5, applied mechanically.
 *
 * A block tag's content is indented one tab deeper than the tag only when it
 * holds another block tag; inline tags do not count. Content that is already
 * indented relative to its tag body — a nested list item, a continuation line
 * — keeps that relative indentation.
 *
 * Only leading whitespace changes. The source is not reprinted from the AST
 * (`Markdoc.format` would normalise list markers, emphasis and tag openings);
 * each line keeps every byte after its leading whitespace. The AST, parsed with
 * the shared `parse`, is the guard: a rewrite that would change it is refused,
 * and the source is returned as it was.
 *
 * The rule, per tag body:
 *
 * - **Owned lines** are the body's lines that are not inside a child tag's body,
 *   a child fence's interior or a child tag's multi-line opening. Their longest
 *   common leading whitespace is the body's current indentation; it is replaced
 *   by one tab per level of holding tags around them.
 * - **A child fence and a child tag's opening** move as a whole: their other
 *   lines are shifted by whatever their first line was shifted by.
 * - **A child tag's body** is laid out the same way, one level down.
 * - **A blank line** is left exactly as it is.
 *
 * Lines outside every block tag, and the tags at the top of the document, are
 * not touched.
 */
import type { Node } from '@markdoc/markdoc';
import { parse as parseSource } from './parse.js';
import { normaliseEach } from './lib/composition.js';
import { escapeFenceTags } from './fence-escape.js';

/**
 * Parse as the content pipeline parses a page: tags inside fences escaped
 * first, so the guard compares the tree a site actually builds from. And a
 * composition template's `{% slot … each %}` is not Markdoc syntax until the
 * compiler rewrites it to `each=true`; unparsed, it would hide the template's
 * structure. Both rewrites stay inside their line, so every line keeps its
 * number.
 */
const parse = (source: string) => parseSource(escapeFenceTags(normaliseEach(source)));

export interface FormatIndentResult {
	/** The formatted source, or the source unchanged when the rewrite was refused. */
	output: string;
	/** The output differs from the source. */
	changed: boolean;
	/** The rewrite would have changed the AST, so it was not applied. */
	refused?: {
		/** 1-based line of the first node whose parse would differ. */
		line: number;
		message: string;
	};
}

const TAB = '\t';

/** A block tag as the layout sees it: its line ranges and what it holds. */
interface BlockTag {
	node: Node;
	/** First line of the opening. */
	openStart: number;
	/** First line after the opening: where the body starts. */
	bodyStart: number;
	/** First line of the closing: where the body ends. Equal to `bodyStart`
	 *  for a self-closing tag, which has no body. */
	bodyEnd: number;
	selfClosing: boolean;
}

function blockTag(node: Node): BlockTag | undefined {
	if (node.type !== 'tag' || node.inline) return undefined;
	const l = node.lines;
	if (l.length >= 4) {
		return { node, openStart: l[0], bodyStart: l[1], bodyEnd: l[2], selfClosing: false };
	}
	if (l.length >= 2) {
		return { node, openStart: l[0], bodyStart: l[1], bodyEnd: l[1], selfClosing: true };
	}
	return undefined;
}

const leading = (line: string) => /^[ \t]*/.exec(line)![0];
const isBlank = (line: string) => line.trim() === '';

function commonPrefix(values: string[]): string {
	if (values.length === 0) return '';
	let prefix = values[0];
	for (const v of values) {
		let i = 0;
		while (i < prefix.length && i < v.length && prefix[i] === v[i]) i++;
		prefix = prefix.slice(0, i);
		if (prefix === '') break;
	}
	return prefix;
}

/** Shift `line` by what its anchor's shift was: `from` → `to` as a prefix. */
function shiftWith(line: string, from: string, to: string): string {
	if (isBlank(line)) return line;
	return line.startsWith(from) ? to + line.slice(from.length) : line;
}

/**
 * Lay out one tag's body. `depth` is the number of tabs its owned lines get.
 * Rewrites `out` in place, reading the original text from `src`.
 */
function layoutBody(tag: BlockTag, depth: number, src: string[], out: string[]): void {
	if (tag.selfClosing) return;
	const childTags: BlockTag[] = [];
	const anchored = new Map<number, number>(); // line → its anchor line
	for (const child of tag.node.children) {
		const t = blockTag(child);
		if (t) {
			childTags.push(t);
			// A multi-line opening moves with its first line.
			for (let i = t.openStart + 1; i < t.bodyStart; i++) anchored.set(i, t.openStart);
			continue;
		}
		if (child.type === 'fence' && child.lines.length >= 2) {
			const [start, end] = child.lines;
			for (let i = start + 1; i < end; i++) anchored.set(i, start);
		}
	}
	const insideChild = (i: number) =>
		childTags.some((t) => !t.selfClosing && i >= t.bodyStart && i < t.bodyEnd);

	const owned: number[] = [];
	for (let i = tag.bodyStart; i < tag.bodyEnd; i++) {
		if (!insideChild(i) && !anchored.has(i)) owned.push(i);
	}
	const prefix = commonPrefix(owned.filter((i) => !isBlank(src[i])).map((i) => leading(src[i])));
	const indent = TAB.repeat(depth);
	for (const i of owned) {
		if (!isBlank(src[i])) out[i] = indent + src[i].slice(prefix.length);
	}
	for (const [i, anchor] of anchored) {
		out[i] = shiftWith(src[i], leading(src[anchor]), leading(out[anchor]));
	}
	for (const child of childTags) {
		layoutBody(child, depth + (holdsBlockTag(child.node) ? 1 : 0), src, out);
	}
}

/** D5 — a tag's content is indented only when it holds another block tag. */
function holdsBlockTag(node: Node): boolean {
	return node.children.some((c) => c.type === 'tag' && !c.inline);
}

/** A node's errors without their source offsets, which indentation moves. */
function errorsOf(node: Node): unknown {
	return node.errors.map(({ id, level, message }) => ({ id, level, message }));
}

/** The parts of an AST that carry meaning: no source positions. */
function shape(node: Node): unknown {
	return {
		type: node.type,
		tag: node.tag,
		inline: node.inline,
		attributes: node.attributes,
		errors: errorsOf(node),
		children: node.children.map(shape),
	};
}

/** The first node, in document order, whose shape differs between two trees. */
function firstDifference(a: Node, b: Node): Node | undefined {
	const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
	if (
		a.type !== b.type ||
		a.tag !== b.tag ||
		a.inline !== b.inline ||
		!same(a.attributes, b.attributes) ||
		!same(errorsOf(a), errorsOf(b)) ||
		a.children.length !== b.children.length
	) {
		return a;
	}
	for (let i = 0; i < a.children.length; i++) {
		const d = firstDifference(a.children[i], b.children[i]);
		if (d) return d;
	}
	return undefined;
}

/** Re-indent Markdoc source by SPEC-170 D5. Never changes the AST. */
export function formatIndentation(source: string): FormatIndentResult {
	const ast = parse(source);
	const eol = source.includes('\r\n') ? '\r\n' : '\n';
	const src = source.split(/\r?\n/);
	const out = [...src];
	for (const child of ast.children) {
		const tag = blockTag(child);
		if (tag) layoutBody(tag, holdsBlockTag(child) ? 1 : 0, src, out);
	}
	const output = out.join(eol);
	if (output === source) return { output, changed: false };
	return guardRewrite(source, output);
}

/**
 * The guard: accept `rewritten` only when it parses to the same AST as
 * `source`. Otherwise return `source` unchanged, with the first line whose
 * parse would differ. Separate so that the refusal itself can be tested.
 */
export function guardRewrite(source: string, rewritten: string): FormatIndentResult {
	const before = parse(source);
	const after = parse(rewritten);
	if (JSON.stringify(shape(after)) === JSON.stringify(shape(before))) {
		return { output: rewritten, changed: rewritten !== source };
	}
	const at = firstDifference(before, after);
	const line = (at?.lines?.[0] ?? 0) + 1;
	return {
		output: source,
		changed: false,
		refused: {
			line,
			message: `re-indenting would change how the content parses, from line ${line} (a \`${at?.type ?? 'node'}\`); the file was left as it is`,
		},
	};
}
