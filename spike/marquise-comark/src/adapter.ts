// Comark tuples <-> Markdoc-shaped AST nodes, so refrakt's resolver runs unchanged.
// Every AST node remembers the Comark node it came from, so resolved fields
// can be handed back to Comark losslessly.
import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';

const { Ast } = Markdoc;

export type CElement = [string | null, Record<string, any>, ...CNode[]];
export type CNode = string | CElement;

export const origin = new WeakMap<Node, CNode>();

const BLOCK = new Set([
	'p',
	'ul',
	'ol',
	'blockquote',
	'pre',
	'hr',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'table',
]);

function mk(node: Node, from: CNode): Node {
	origin.set(node, from);
	return node;
}

export function textOf(n: CNode): string {
	if (typeof n === 'string') return n;
	return (n.slice(2) as CNode[]).map(textOf).join('');
}

function inline(kids: CNode[]): Node {
	return new Ast.Node('inline', {}, kids.map(toInline));
}

function toInline(n: CNode): Node {
	if (typeof n === 'string') return mk(new Ast.Node('text', { content: n }), n);
	const [tag, attrs, ...kids] = n;
	switch (tag) {
		case 'a':
			return mk(
				new Ast.Node('link', { href: attrs.href, title: attrs.title }, kids.map(toInline)),
				n,
			);
		case 'img':
			return mk(new Ast.Node('image', { src: attrs.src, alt: attrs.alt, title: attrs.title }), n);
		case 'strong':
		case 'em':
			return mk(new Ast.Node(tag, {}, kids.map(toInline)), n);
		case 'code':
			return mk(new Ast.Node('code', { content: kids.map(textOf).join('') }), n);
		case 'br':
			return mk(new Ast.Node('hardbreak'), n);
		default:
			return mk(new Ast.Node('tag', attrs, kids.map(toInline), tag ?? undefined), n);
	}
}

function toItem(li: CNode): Node {
	const kids = (li as CElement).slice(2) as CNode[];
	const hasBlocks = kids.some((k) => Array.isArray(k) && BLOCK.has(k[0] as string));
	return mk(new Ast.Node('item', {}, hasBlocks ? kids.map(toBlock) : [inline(kids)]), li);
}

export function toBlock(n: CNode): Node {
	if (typeof n === 'string') return mk(new Ast.Node('paragraph', {}, [inline([n])]), n);
	const [tag, attrs, ...kids] = n;
	if (tag && /^h[1-6]$/.test(tag)) {
		return mk(new Ast.Node('heading', { level: Number(tag[1]) }, [inline(kids)]), n);
	}
	switch (tag) {
		case 'p':
			return mk(new Ast.Node('paragraph', {}, [inline(kids)]), n);
		case 'ul':
		case 'ol':
			return mk(new Ast.Node('list', { ordered: tag === 'ol' }, kids.map(toItem)), n);
		case 'hr':
			return mk(new Ast.Node('hr'), n);
		case 'blockquote':
			return mk(new Ast.Node('blockquote', {}, kids.map(toBlock)), n);
		case 'pre':
			return mk(new Ast.Node('fence', { content: textOf(n), language: attrs.language }), n);
		default:
			return mk(new Ast.Node('tag', attrs, kids.map(toBlock), tag ?? undefined), n);
	}
}

/** The Comark node an AST node came from. */
export function back(node: Node): CNode {
	const c = origin.get(node);
	if (c === undefined) throw new Error(`no origin for ${node.type}`);
	return c;
}
