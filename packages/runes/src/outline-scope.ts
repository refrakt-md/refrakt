/**
 * Outline-scope walkers (SPEC-066, WORK-259).
 *
 * Two generic walkers that consume the `data-outline-scope` attribute on
 * any rendered element as a neutral "this subtree is a sub-outline
 * boundary" marker. Any rune can set the attribute and get TOC
 * isolation + heading-ID namespacing for free — the walkers themselves
 * know nothing about expand, drawer, or any specific rune.
 *
 * Two cooperating passes over the page's renderable tree:
 *
 * 1. **Heading-ID walker** — for each `h1`..`h6` descended from an
 *    element with `data-outline-scope` set, prefix its `id` attribute
 *    with `${scopeValue}--`. Innermost scope wins for nested scopes.
 *    Headings outside any scoped subtree are untouched.
 *
 * 2. **TOC walker** — for each `<nav data-rune="table-of-contents">`,
 *    remove `<li>` items whose `<a href="#id">` points at a heading
 *    that's now inside an outline scope (the host TOC reflects only the
 *    host's structure; embedded / scoped heading entries don't belong).
 *
 * The TOC walker reads the set of "scoped original IDs" produced as a
 * side-effect of the heading-ID walker — one tree walk seeds both.
 */

import Markdoc from '@markdoc/markdoc';

const { Tag } = Markdoc;

const HEADING_TAG_RE = /^h[1-6]$/;
const OUTLINE_SCOPE_ATTR = 'data-outline-scope';

/** Apply the outline-scope walkers to a page's renderable tree. Mutates
 *  in place (we're operating on Tag instances that we already constructed
 *  upstream) and returns the same root for caller chaining. */
export function applyOutlineScopeWalkers(renderable: unknown): unknown {
	const scopedOriginalIds = new Set<string>();
	walkAndScopeHeadings(renderable, [], scopedOriginalIds);
	if (scopedOriginalIds.size > 0) {
		filterTocItems(renderable, scopedOriginalIds);
	}
	return renderable;
}

export interface HarvestedHeading {
	level: number;
	text: string;
	id: string;
}

/**
 * Walk a final renderable tree and collect every `h1`..`h6` not inside a
 * `data-outline-scope` subtree, in document order. Used to refresh
 * `page.headings` after postProcess substitutions (expand `level=N`,
 * collection bodies, …) bring new headings into the host outline that
 * the parse-time `extractHeadings` couldn't see — the source AST only
 * had the placeholder rune at that point.
 *
 * Skips scoped subtrees so embedded sub-outlines (expand in peer-document
 * mode) stay isolated from the host TOC, mirroring `filterTocItems`.
 */
export function harvestHeadingsFromRenderable(renderable: unknown): HarvestedHeading[] {
	const out: HarvestedHeading[] = [];
	walkAndHarvestHeadings(renderable, false, out);
	return out;
}

function walkAndHarvestHeadings(
	node: unknown,
	insideScope: boolean,
	out: HarvestedHeading[],
): void {
	if (Array.isArray(node)) {
		for (const c of node) walkAndHarvestHeadings(c, insideScope, out);
		return;
	}
	if (!Tag.isTag(node as never)) return;
	const tag = node as InstanceType<typeof Tag>;
	const attrs = tag.attributes as Record<string, unknown> | undefined;

	if (HEADING_TAG_RE.test(tag.name)) {
		if (insideScope) return; // scoped headings don't belong in the host outline
		const level = Number(tag.name.slice(1));
		const id = typeof attrs?.id === 'string' ? attrs.id : '';
		const text = headingText(tag);
		if (id && text) out.push({ level, text, id });
		return; // no further descent into a heading
	}

	const childInsideScope = insideScope || (attrs && typeof attrs[OUTLINE_SCOPE_ATTR] === 'string');
	if (!tag.children || tag.children.length === 0) return;
	for (const c of tag.children) {
		walkAndHarvestHeadings(c, !!childInsideScope, out);
	}
}

/** Flatten a heading's inline content to plain text. Concatenates raw
 *  string children and recurses into inline tags (em, strong, code, …) so
 *  formatted headings produce the same plain string `extractHeadings`
 *  would have. */
function headingText(node: unknown): string {
	if (typeof node === 'string') return node;
	if (typeof node === 'number') return String(node);
	if (Array.isArray(node)) return node.map(headingText).join('');
	if (!Tag.isTag(node as never)) return '';
	const tag = node as InstanceType<typeof Tag>;
	return (tag.children ?? []).map(headingText).join('');
}

/** First pass — walk the tree, track an `outline-scope` stack (innermost
 *  wins), prefix each heading's `id` when scoped. Headings whose original
 *  IDs got prefixed are recorded in `scopedOriginalIds` so the TOC walker
 *  can drop the corresponding entries. */
function walkAndScopeHeadings(
	node: unknown,
	scopeStack: string[],
	scopedOriginalIds: Set<string>,
): void {
	if (Array.isArray(node)) {
		for (const c of node) walkAndScopeHeadings(c, scopeStack, scopedOriginalIds);
		return;
	}
	if (!Tag.isTag(node as never)) return;
	const tag = node as InstanceType<typeof Tag>;

	const attrs = tag.attributes as Record<string, unknown> | undefined;
	const ownScope = attrs && typeof attrs[OUTLINE_SCOPE_ATTR] === 'string'
		? (attrs[OUTLINE_SCOPE_ATTR] as string)
		: undefined;

	if (HEADING_TAG_RE.test(tag.name) && scopeStack.length > 0) {
		const scope = scopeStack[scopeStack.length - 1];
		const id = typeof attrs?.id === 'string' ? attrs.id : undefined;
		if (id && !id.startsWith(`${scope}--`)) {
			scopedOriginalIds.add(id);
			(tag.attributes as Record<string, unknown>).id = `${scope}--${id}`;
		}
		// Don't descend into headings (their children are inline text /
		// formatting, no further headings or scopes possible).
		return;
	}

	const childScopeStack = ownScope !== undefined
		? [...scopeStack, ownScope]
		: scopeStack;

	if (!tag.children || tag.children.length === 0) return;
	for (const c of tag.children) {
		walkAndScopeHeadings(c, childScopeStack, scopedOriginalIds);
	}
}

/** Second pass — walk for `<nav data-rune="table-of-contents">` elements
 *  and drop `<li>` items whose `<a>` points at a heading whose original
 *  id is in `scopedIds`. Operates in-place on each TOC's children array. */
function filterTocItems(node: unknown, scopedIds: Set<string>): void {
	if (Array.isArray(node)) {
		for (const c of node) filterTocItems(c, scopedIds);
		return;
	}
	if (!Tag.isTag(node as never)) return;
	const tag = node as InstanceType<typeof Tag>;

	const attrs = tag.attributes as Record<string, unknown> | undefined;
	if (attrs?.['data-rune'] === 'table-of-contents') {
		filterTocList(tag, scopedIds);
		// A TOC nav doesn't contain further TOC navs, but a heading-id
		// rewrite shouldn't traverse into it either — its children are
		// the rendered list, not page content.
		return;
	}

	if (!tag.children) return;
	for (const c of tag.children) filterTocItems(c, scopedIds);
}

/** Drop list items whose anchor href points to a scoped heading. Walks
 *  `<ul>`/`<ol>` containers anywhere inside the TOC tag, removing matching
 *  `<li>`s. Recurses to handle nested lists (depth-based TOC trees). */
function filterTocList(tocTag: InstanceType<typeof Tag>, scopedIds: Set<string>): void {
	for (const child of tocTag.children ?? []) {
		filterTocItems_recurse(child, scopedIds);
	}
}

function filterTocItems_recurse(node: unknown, scopedIds: Set<string>): void {
	if (Array.isArray(node)) {
		for (const c of node) filterTocItems_recurse(c, scopedIds);
		return;
	}
	if (!Tag.isTag(node as never)) return;
	const tag = node as InstanceType<typeof Tag>;
	if (tag.name === 'ul' || tag.name === 'ol') {
		tag.children = (tag.children ?? []).filter((child) => {
			if (!Tag.isTag(child as never)) return true;
			const li = child as InstanceType<typeof Tag>;
			if (li.name !== 'li') return true;
			// Drop the li when any anchor inside it points to a scoped id.
			return !liReferencesScopedHeading(li, scopedIds);
		});
	}
	for (const c of tag.children ?? []) filterTocItems_recurse(c, scopedIds);
}

function liReferencesScopedHeading(
	li: InstanceType<typeof Tag>,
	scopedIds: Set<string>,
): boolean {
	for (const c of li.children ?? []) {
		if (!Tag.isTag(c as never)) continue;
		const tag = c as InstanceType<typeof Tag>;
		if (tag.name === 'a') {
			const href = (tag.attributes as Record<string, unknown> | undefined)?.href;
			if (typeof href === 'string' && href.startsWith('#') && scopedIds.has(href.slice(1))) {
				return true;
			}
		}
		if (liReferencesScopedHeading(tag, scopedIds)) return true;
	}
	return false;
}
