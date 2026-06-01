import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, Node } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { createContentModelSchema, asNodes } from '../lib/index.js';

/** Parse a list item's first paragraph node to look for a `**Term:**`
 *  prefix. Returns `{ term, rest }` where `term` is the bold-text
 *  content (without the trailing `:`) and `rest` is the remaining
 *  inline content of the paragraph + subsequent block children. If no
 *  bold prefix is found, returns `null` — the deflist rune falls back
 *  to an empty `<dt>` + the item's full content in `<dd>`. */
function extractTermPrefix(itemNode: Node): { term: Node[]; rest: Node[]; restBlocks: Node[] } | null {
	const children = itemNode.children ?? [];
	if (children.length === 0) return null;

	// Markdoc list items hold their content as either:
	//   - a tight `inline` node directly under `item` (simple one-line item)
	//   - a `paragraph` wrapping an `inline` node (loose / multi-block item)
	// Handle both shapes — extract the inline node either way.
	let inlineNode: Node | undefined;
	let restBlockChildren: Node[];

	const first = children[0];
	if (first?.type === 'inline') {
		inlineNode = first;
		restBlockChildren = children.slice(1);
	} else if (first?.type === 'paragraph') {
		inlineNode = first.children?.[0];
		restBlockChildren = children.slice(1);
	} else {
		return null;
	}

	if (!inlineNode || inlineNode.type !== 'inline') return null;

	const inlineKids = inlineNode.children ?? [];
	if (inlineKids.length === 0) return null;

	const head = inlineKids[0];
	if (!head || head.type !== 'strong') return null;

	// Extract the bold text content; require it to end with `:`.
	const strongChildren = head.children ?? [];
	let strongText = '';
	for (const c of strongChildren) {
		if (c.type === 'text' && typeof c.attributes?.content === 'string') {
			strongText += c.attributes.content;
		}
	}
	if (!strongText.endsWith(':')) return null;

	// Remove the trailing `:` from the term — common-case "Priority:" → "Priority".
	const termText = strongText.slice(0, -1);
	const termNodes: Node[] = [
		// Build a fresh text node with the cleaned term so the dt content
		// is just the term name, no trailing colon.
		new Ast.Node('text', { content: termText }) as Node,
	];

	// Build the rest of the inline content: drop the leading strong, and
	// strip ONE leading whitespace text node if present (the space after
	// `**Term:**` in markdown).
	const remainingInline = inlineKids.slice(1);
	const trimmed = (() => {
		const first = remainingInline[0];
		if (first?.type === 'text' && typeof first.attributes?.content === 'string') {
			const stripped = first.attributes.content.replace(/^\s+/, '');
			if (stripped === '') return remainingInline.slice(1);
			const clone = new Ast.Node('text', { content: stripped }) as Node;
			return [clone, ...remainingInline.slice(1)];
		}
		return remainingInline;
	})();

	const restInline = trimmed.length > 0
		? [new Ast.Node('inline', {}, trimmed) as Node]
		: [];

	const restParagraph: Node[] = restInline.length > 0
		? [new Ast.Node('paragraph', {}, restInline) as Node]
		: [];

	return {
		term: termNodes,
		rest: restInline,
		restBlocks: [...restParagraph, ...restBlockChildren],
	};
}

/**
 * Deflist rune — block-level wrapper that renders the SPEC-079
 * `definition-list` layout primitive over an author-written markdown
 * list. Each list item starting with `**Term:**` produces a `<dt>` +
 * `<dd>` pair; items without that prefix get an empty `<dt>` plus the
 * full content in `<dd>` (plus a build-time warning naming the line).
 *
 * Composable inside any container rune; same DOM as a projected
 * metadata zone using the `definition-list` layout.
 *
 * Usage:
 *   {% deflist %}
 *   - **Priority:** {% badge sentiment="caution" %}high{% /badge %}
 *   - **Complexity:** moderate
 *   - **Assignee:** @alice
 *   {% /deflist %}
 */
export const deflist = createContentModelSchema({
	attributes: {},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'list', match: 'list', optional: false },
		],
	},
	transform(resolved, _attrs, config) {
		const listNodes = asNodes(resolved.list);
		const listNode = listNodes.find(n => n.type === 'list');
		if (!listNode) {
			// Fallback when the content model didn't capture a list — render
			// an empty dl so DOM stays valid; the content-model resolver
			// already emits its own diagnostic.
			return new Tag('dl', {
				'data-rune': 'deflist',
				'data-zone-layout': 'definition-list',
			}, []);
		}

		const items = (listNode.children ?? []).filter(c => c.type === 'item');
		const rows: RenderableTreeNode[] = [];

		for (const item of items) {
			const extracted = extractTermPrefix(item);
			let dt: RenderableTreeNode;
			let dd: RenderableTreeNode;

			if (extracted) {
				const termRendered = Markdoc.transform(extracted.term, config) as RenderableTreeNode[];
				const valueRendered = Markdoc.transform(extracted.restBlocks, config) as RenderableTreeNode[];
				dt = new Tag('dt', { 'data-meta-label': '' }, termRendered);
				dd = new Tag('dd', {}, unwrapSingleParagraph(valueRendered));
			} else {
				// Fallback: empty <dt> + full item content in <dd>. Warn once
				// per process so authors find the unparsed item.
				const fullRendered = Markdoc.transform(item.children ?? [], config) as RenderableTreeNode[];
				dt = new Tag('dt', { 'data-meta-label': '' }, []);
				dd = new Tag('dd', {}, unwrapSingleParagraph(fullRendered));
				warnDeflistUnparsedItem(item);
			}

			rows.push(new Tag('div', { 'data-name': 'row' }, [dt, dd]));
		}

		return new Tag('dl', {
			'data-rune': 'deflist',
			'data-zone-layout': 'definition-list',
		}, rows);
	},
});

/** When the dd's content is a single `<p>` (the typical case for a
 *  short inline value), unwrap it so the dd renders as `<dd>value</dd>`
 *  instead of `<dd><p>value</p></dd>`. Multi-paragraph dd content stays
 *  wrapped. */
function unwrapSingleParagraph(nodes: RenderableTreeNode[]): RenderableTreeNode[] {
	if (nodes.length !== 1) return nodes;
	const only = nodes[0];
	if (!Markdoc.Tag.isTag(only) || only.name !== 'p') return nodes;
	return only.children;
}

const DEFLIST_WARNED = new Set<string>();
function warnDeflistUnparsedItem(item: Node): void {
	const loc = item.location ?? null;
	const key = loc ? `${loc.start?.line ?? '?'}:${loc.start?.character ?? '?'}` : 'unknown';
	if (DEFLIST_WARNED.has(key)) return;
	DEFLIST_WARNED.add(key);
	// eslint-disable-next-line no-console
	console.warn(
		`[refrakt] {% deflist %} item at line ${loc?.start?.line ?? '?'} lacks ` +
		`a \`**Term:**\` prefix — rendered with empty <dt>. Prefix the item ` +
		`with bold term text ending in \`:\` to label it.`,
	);
}
