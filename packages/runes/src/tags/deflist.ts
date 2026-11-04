import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, Node } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { createContentModelSchema, asNodes } from '../lib/index.js';

function extractTermPrefix(
	itemNode: Node,
): { term: Node[]; rest: Node[]; restBlocks: Node[] } | null {
	const children = itemNode.children ?? [];
	if (children.length === 0) return null;

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

	const strongChildren = head.children ?? [];
	let strongText = '';
	for (const c of strongChildren) {
		if (c.type === 'text' && typeof c.attributes?.content === 'string') {
			strongText += c.attributes.content;
		}
	}
	if (!strongText.endsWith(':')) return null;

	const termText = strongText.slice(0, -1);
	const termNodes: Node[] = [new Ast.Node('text', { content: termText }) as Node];

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

	const restInline = trimmed.length > 0 ? [new Ast.Node('inline', {}, trimmed) as Node] : [];

	const restParagraph: Node[] =
		restInline.length > 0 ? [new Ast.Node('paragraph', {}, restInline) as Node] : [];

	return {
		term: termNodes,
		rest: restInline,
		restBlocks: [...restParagraph, ...restBlockChildren],
	};
}

export const deflist = createContentModelSchema({
	attributes: {},
	contentModel: {
		type: 'sequence',
		fields: [{ name: 'list', match: 'list', optional: false }],
	},
	transform(resolved, _attrs, config) {
		const listNodes = asNodes(resolved.list);
		const listNode = listNodes.find((n) => n.type === 'list');
		if (!listNode) {
			return new Tag(
				'dl',
				{
					'data-rune': 'deflist',
					'data-zone-layout': 'definition-list',
				},
				[],
			);
		}

		const items = (listNode.children ?? []).filter((c) => c.type === 'item');
		const rows: RenderableTreeNode[] = [];

		for (const item of items) {
			const extracted = extractTermPrefix(item);
			let dt: RenderableTreeNode;
			let dd: RenderableTreeNode;

			if (extracted) {
				const termRendered = Markdoc.transform(extracted.term, config) as RenderableTreeNode[];
				const valueRendered = Markdoc.transform(
					extracted.restBlocks,
					config,
				) as RenderableTreeNode[];
				dt = new Tag('dt', { 'data-meta-label': '' }, termRendered);
				dd = new Tag('dd', {}, unwrapSingleParagraph(valueRendered));
			} else {
				const fullRendered = Markdoc.transform(item.children ?? [], config) as RenderableTreeNode[];
				dt = new Tag('dt', { 'data-meta-label': '' }, []);
				dd = new Tag('dd', {}, unwrapSingleParagraph(fullRendered));
				warnDeflistUnparsedItem(item);
			}

			rows.push(new Tag('div', { 'data-name': 'row' }, [dt, dd]));
		}

		return new Tag(
			'dl',
			{
				'data-rune': 'deflist',
				'data-zone-layout': 'definition-list',
			},
			rows,
		);
	},
});

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
