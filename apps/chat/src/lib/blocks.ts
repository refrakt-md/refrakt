import Markdoc from '@markdoc/markdoc';
import type { RendererNode, SerializedTag } from '@refrakt-md/types';

export type BlockType =
	| 'heading'
	| 'paragraph'
	| 'rune'
	| 'list'
	| 'code'
	| 'table'
	| 'blockquote'
	| 'image'
	| 'hr'
	| 'unknown';

export interface ContentBlock {
	id: string;
	index: number;
	type: BlockType;
	typeName?: string;
	label: string;
	node: RendererNode;
}

const BLOCK_ICONS: Record<BlockType, string> = {
	rune: '◈',
	heading: 'H',
	paragraph: '¶',
	code: '⟨⟩',
	list: '≡',
	table: '▦',
	blockquote: '"',
	image: '▣',
	hr: '—',
	unknown: '?',
};

export function getBlockIcon(type: BlockType): string {
	return BLOCK_ICONS[type];
}

function isTag(node: RendererNode): node is SerializedTag {
	return (
		node != null &&
		typeof node === 'object' &&
		!Array.isArray(node) &&
		(node as SerializedTag).$$mdtype === 'Tag'
	);
}

/** Extract plain text from a node tree, truncated to `max` characters. */
export function extractText(node: RendererNode, max = 60): string {
	let result = '';

	function walk(n: RendererNode): boolean {
		if (result.length >= max) return true;
		if (n == null) return false;
		if (typeof n === 'string') {
			result += n;
			return result.length >= max;
		}
		if (typeof n === 'number') {
			result += String(n);
			return result.length >= max;
		}
		if (Array.isArray(n)) {
			for (const child of n) {
				if (walk(child)) return true;
			}
			return false;
		}
		if (isTag(n)) {
			for (const child of n.children) {
				if (walk(child)) return true;
			}
		}
		return false;
	}

	walk(node);

	if (result.length > max) {
		return result.slice(0, max) + '…';
	}
	return result;
}

function countListItems(node: SerializedTag): number {
	return node.children.filter((c) => isTag(c) && c.name === 'li').length;
}

function classifyBlock(node: SerializedTag): { type: BlockType; typeName?: string; label: string } {
	// Rune blocks have a typeof attribute
	if (node.attributes.typeof) {
		return {
			type: 'rune',
			typeName: node.attributes.typeof,
			label: node.attributes.typeof,
		};
	}

	const { name } = node;

	if (/^h[1-6]$/.test(name)) {
		return { type: 'heading', label: extractText(node, 60) || 'Heading' };
	}

	if (name === 'p') {
		return { type: 'paragraph', label: extractText(node, 40) || 'Paragraph' };
	}

	if (name === 'pre') {
		// Look for data-language on the pre or a child code element
		const lang =
			node.attributes['data-language'] ??
			(isTag(node.children[0]) ? node.children[0].attributes['data-language'] : undefined);
		return { type: 'code', label: lang ? `Code (${lang})` : 'Code' };
	}

	if (name === 'ul' || name === 'ol') {
		const count = countListItems(node);
		return { type: 'list', label: `List (${count} item${count !== 1 ? 's' : ''})` };
	}

	if (name === 'table') {
		return { type: 'table', label: 'Table' };
	}

	if (name === 'blockquote') {
		return { type: 'blockquote', label: extractText(node, 40) || 'Blockquote' };
	}

	if (name === 'figure') {
		return { type: 'image', label: 'Image' };
	}

	if (name === 'hr') {
		return { type: 'hr', label: 'Divider' };
	}

	return { type: 'unknown', label: extractText(node, 30) || name };
}

/** Wrapper tags that should be unwrapped to get top-level content blocks */
const WRAPPER_TAGS = new Set(['article', 'document', 'div', 'section']);

function isWrapperTag(node: SerializedTag): boolean {
	return WRAPPER_TAGS.has(node.name) && !node.attributes.typeof && !node.attributes['data-name'];
}

function getTopLevelChildren(node: RendererNode): RendererNode[] {
	if (Array.isArray(node)) return node;
	if (isTag(node) && isWrapperTag(node)) return node.children;
	if (isTag(node)) return [node];
	return [];
}

/**
 * Extract top-level content blocks from a rendered tree.
 * Each block represents a visually distinct unit (heading, paragraph, rune, etc.)
 */
export function extractBlocks(node: RendererNode, messageIndex: number): ContentBlock[] {
	const children = getTopLevelChildren(node);
	const blocks: ContentBlock[] = [];
	let blockIndex = 0;

	for (const child of children) {
		if (child == null) continue;
		if (typeof child === 'string' && !child.trim()) continue;
		if (typeof child === 'number') continue;

		if (isTag(child)) {
			const { type, typeName, label } = classifyBlock(child);
			blocks.push({
				id: `${messageIndex}:${blockIndex}:${type}`,
				index: blockIndex,
				type,
				typeName,
				label,
				node: child,
			});
			blockIndex++;
		} else if (typeof child === 'string' && child.trim()) {
			// Standalone text node (rare but possible)
			blocks.push({
				id: `${messageIndex}:${blockIndex}:paragraph`,
				index: blockIndex,
				type: 'paragraph',
				label: child.trim().slice(0, 40) + (child.trim().length > 40 ? '…' : ''),
				node: child,
			});
			blockIndex++;
		} else if (Array.isArray(child)) {
			// Nested array — recurse and flatten
			const nested = extractBlocks(child, messageIndex);
			for (const b of nested) {
				blocks.push({ ...b, id: `${messageIndex}:${blockIndex}:${b.type}`, index: blockIndex });
				blockIndex++;
			}
		}
	}

	return blocks;
}

/**
 * Extract the Markdoc source text for a single block by its index.
 * Parses the message with Markdoc to get AST nodes with line numbers,
 * then slices the source by line range.
 */
export function extractBlockSource(
	messageContent: string,
	blockIndex: number,
): string | null {
	const ast = Markdoc.parse(messageContent);
	const lines = messageContent.split('\n');

	let idx = 0;
	for (const child of ast.children) {
		if (!child.lines || child.lines.length === 0) continue;
		if (idx === blockIndex) {
			const startLine = child.lines[0];
			const endLine = child.lines[child.lines.length - 1];
			return lines.slice(startLine, endLine + 1).join('\n').trimEnd();
		}
		idx++;
	}
	return null;
}

/**
 * Extract source for multiple blocks at once (avoids re-parsing).
 * Returns a Map of blockIndex → source text.
 */
export function extractBlockSources(
	messageContent: string,
	blockIndices: number[],
): Map<number, string> {
	const ast = Markdoc.parse(messageContent);
	const lines = messageContent.split('\n');
	const result = new Map<number, string>();
	const indexSet = new Set(blockIndices);

	let idx = 0;
	for (const child of ast.children) {
		if (!child.lines || child.lines.length === 0) continue;
		if (indexSet.has(idx)) {
			const startLine = child.lines[0];
			const endLine = child.lines[child.lines.length - 1];
			result.set(idx, lines.slice(startLine, endLine + 1).join('\n').trimEnd());
		}
		idx++;
	}
	return result;
}
