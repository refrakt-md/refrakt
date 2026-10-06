import type { Node } from '@markdoc/markdoc';
import type { NodeFilter, NodeFilterOptions } from '../interfaces.js';

export function isFilterMatching(n: Node, match: NodeFilter) {
	if (typeof match === 'function') {
		return match(n);
	}

	const filter: NodeFilterOptions = typeof match === 'string' ? { node: match } : match;
	if (filter.node && n.type !== filter.node) {
		return false;
	}
	if (filter.descendant && !Array.from(n.walk()).some((n) => n.type === filter.descendant)) {
		return false;
	}
	if (
		filter.descendantTag &&
		!Array.from(n.walk()).some((n) => n.type === 'tag' && n.tag === filter.descendantTag)
	) {
		return false;
	}
	return true;
}

/**
 * Concatenated text of every `text` node under an AST node, unmodified — no
 * trimming, no separator between nodes. For a rendered tree use `textContent`.
 */
export function extractText(node: Node): string {
	return Array.from(node.walk())
		.filter((n) => n.type === 'text')
		.map((n) => n.attributes.content)
		.join('');
}

/** Callbacks for `groupByHeading`. `G` is whatever the rune tracks per group. */
export interface GroupByHeadingHandlers<G> {
	/** The group in effect before the first heading. */
	initial: G;
	/** A heading starts a group: return the one now in effect. */
	heading: (heading: Node, current: G) => G;
	/** Each item of a list, with the group in effect where the list appears. */
	item: (item: Node, group: G) => void;
	/** Any other child (neither heading nor list), in document order. */
	other?: (node: Node) => void;
}

/**
 * The "a heading sets the running group, list items become entries" walk over
 * a rune's children. Only the traversal is shared: what a heading means and how
 * an item parses stay with the rune.
 */
export function groupByHeading<G>(
	nodes: Iterable<Node>,
	handlers: GroupByHeadingHandlers<G>,
): void {
	let group = handlers.initial;
	for (const node of nodes) {
		if (node.type === 'heading') {
			group = handlers.heading(node, group);
		} else if (node.type === 'list') {
			for (const item of node.children) {
				if (item.type === 'item') handlers.item(item, group);
			}
		} else {
			handlers.other?.(node);
		}
	}
}
