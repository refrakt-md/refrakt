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

// ---------------------------------------------------------------------------
// Section grouping — groups consecutive blocks under headings
// ---------------------------------------------------------------------------

export type SectionType = 'section' | 'rune' | 'hr';

export interface ContentSection {
	id: string;
	index: number;
	type: SectionType;
	label: string;
	/** Heading level (1-6) for section type, undefined for rune/hr */
	headingLevel?: number;
	/** The rendered nodes belonging to this section */
	nodes: RendererNode[];
	/** Indices of the AST children that make up this section */
	blockIndices: number[];
	/** Summary of child block types for display */
	childSummary: string;
}

const SECTION_ICONS: Record<SectionType, string> = {
	section: '§',
	rune: '◈',
	hr: '—',
};

export function getSectionIcon(type: SectionType): string {
	return SECTION_ICONS[type];
}

/**
 * Classify an AST node to determine if it starts a new section.
 * Returns 'heading', 'rune', 'hr', or null (attaches to current section).
 */
function classifyAstNode(node: { type: string; tag?: string; attributes?: Record<string, unknown> }): {
	breaks: boolean;
	sectionType: SectionType;
	headingLevel?: number;
} | null {
	if (node.type === 'heading') {
		const level = (node.attributes?.level as number) ?? 2;
		return { breaks: true, sectionType: 'section', headingLevel: level };
	}
	if (node.type === 'tag') {
		return { breaks: true, sectionType: 'rune' };
	}
	if (node.type === 'hr') {
		return { breaks: true, sectionType: 'hr' };
	}
	return null;
}

/**
 * Group top-level content blocks into sections using heading-delimited grouping.
 *
 * Rules:
 * 1. A heading starts a new section
 * 2. A rune tag ({% tag %}) is always its own section
 * 3. An hr is always its own section (explicit visual break)
 * 4. Everything else (paragraphs, lists, code, tables, etc.) attaches to the
 *    most recent heading section
 * 5. Content before any heading becomes a "Preamble" section
 * 6. A heading of equal or higher level (lower number) than the current
 *    section's heading starts a new section
 */
export function extractSections(node: RendererNode, messageIndex: number, messageContent: string): ContentSection[] {
	const blocks = extractBlocks(node, messageIndex);
	if (blocks.length === 0) return [];

	const ast = Markdoc.parse(messageContent);

	// Build a list of AST children with their classifications
	const astChildren: Array<{
		index: number;
		type: string;
		tag?: string;
		attributes?: Record<string, unknown>;
		lines: number[];
	}> = [];

	let idx = 0;
	for (const child of ast.children) {
		if (!child.lines || child.lines.length === 0) continue;
		astChildren.push({
			index: idx,
			type: child.type,
			tag: child.tag,
			attributes: child.attributes,
			lines: child.lines,
		});
		idx++;
	}

	// If block count and AST child count don't match, fall back to
	// one-section-per-block (the AST and rendered tree can diverge
	// when wrapper tags are stripped)
	if (blocks.length !== astChildren.length) {
		return blocks.map((block, i) => ({
			id: `${messageIndex}:s${i}`,
			index: i,
			type: block.type === 'rune' ? 'rune' as SectionType : block.type === 'hr' ? 'hr' as SectionType : 'section' as SectionType,
			label: block.label,
			headingLevel: block.type === 'heading' ? parseHeadingLevel(block) : undefined,
			nodes: [block.node],
			blockIndices: [block.index],
			childSummary: block.label,
		}));
	}

	const sections: ContentSection[] = [];
	let currentSection: ContentSection | null = null;
	let currentHeadingLevel = 0;
	let sectionIndex = 0;

	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i];
		const astNode = astChildren[i];
		const classification = classifyAstNode(astNode);

		if (classification) {
			const { sectionType, headingLevel } = classification;

			if (sectionType === 'rune' || sectionType === 'hr') {
				// Runes and hrs are always standalone sections
				// Flush current section first
				if (currentSection) {
					currentSection.childSummary = buildChildSummary(currentSection, blocks);
					sections.push(currentSection);
				}

				sections.push({
					id: `${messageIndex}:s${sectionIndex}`,
					index: sectionIndex,
					type: sectionType,
					label: block.label,
					nodes: [block.node],
					blockIndices: [block.index],
					childSummary: block.label,
				});
				sectionIndex++;
				currentSection = null;
				currentHeadingLevel = 0;
			} else if (sectionType === 'section' && headingLevel !== undefined) {
				// Heading — starts a new section if:
				// - No current section exists
				// - The heading is equal or higher level (lower number) than current
				if (!currentSection || headingLevel <= currentHeadingLevel) {
					if (currentSection) {
						currentSection.childSummary = buildChildSummary(currentSection, blocks);
						sections.push(currentSection);
					}

					currentSection = {
						id: `${messageIndex}:s${sectionIndex}`,
						index: sectionIndex,
						type: 'section',
						label: block.label,
						headingLevel,
						nodes: [block.node],
						blockIndices: [block.index],
						childSummary: '',
					};
					sectionIndex++;
					currentHeadingLevel = headingLevel;
				} else {
					// Lower-level heading (e.g. h3 inside an h2 section) — attach to current section
					currentSection.nodes.push(block.node);
					currentSection.blockIndices.push(block.index);
				}
			}
		} else {
			// Non-breaking node: attach to current section or start a preamble
			if (!currentSection) {
				currentSection = {
					id: `${messageIndex}:s${sectionIndex}`,
					index: sectionIndex,
					type: 'section',
					label: 'Preamble',
					nodes: [block.node],
					blockIndices: [block.index],
					childSummary: '',
				};
				sectionIndex++;
				currentHeadingLevel = 0;
			} else {
				currentSection.nodes.push(block.node);
				currentSection.blockIndices.push(block.index);
			}
		}
	}

	// Flush final section
	if (currentSection) {
		currentSection.childSummary = buildChildSummary(currentSection, blocks);
		sections.push(currentSection);
	}

	return sections;
}

function parseHeadingLevel(block: ContentBlock): number | undefined {
	if (block.type !== 'heading') return undefined;
	if (isTag(block.node) && /^h([1-6])$/.test(block.node.name)) {
		return parseInt(block.node.name[1], 10);
	}
	return undefined;
}

function buildChildSummary(section: ContentSection, blocks: ContentBlock[]): string {
	if (section.blockIndices.length <= 1) {
		const block = blocks.find((b) => b.index === section.blockIndices[0]);
		return block?.label ?? '';
	}

	const types: Record<string, number> = {};
	for (const idx of section.blockIndices) {
		const block = blocks.find((b) => b.index === idx);
		if (!block) continue;
		// Skip the heading itself in the summary
		if (block.type === 'heading' && block.index === section.blockIndices[0]) continue;
		const key = block.type === 'rune' ? (block.typeName ?? 'rune') : block.type;
		types[key] = (types[key] ?? 0) + 1;
	}

	const parts: string[] = [];
	for (const [type, count] of Object.entries(types)) {
		if (count === 1) {
			parts.push(type);
		} else {
			parts.push(`${count} ${type}s`);
		}
	}
	return parts.join(', ');
}

/**
 * Extract Markdoc source text for sections.
 * Each section spans from its first AST child's start line
 * to its last AST child's end line.
 */
export function extractSectionSources(
	messageContent: string,
	sections: ContentSection[],
): Map<number, string> {
	const ast = Markdoc.parse(messageContent);
	const lines = messageContent.split('\n');
	const result = new Map<number, string>();

	// Build a lookup from block index to AST line range
	const blockLineRanges = new Map<number, [number, number]>();
	let idx = 0;
	for (const child of ast.children) {
		if (!child.lines || child.lines.length === 0) continue;
		blockLineRanges.set(idx, [child.lines[0], child.lines[child.lines.length - 1]]);
		idx++;
	}

	for (const section of sections) {
		if (section.blockIndices.length === 0) continue;

		const firstRange = blockLineRanges.get(section.blockIndices[0]);
		const lastRange = blockLineRanges.get(section.blockIndices[section.blockIndices.length - 1]);

		if (firstRange && lastRange) {
			const startLine = firstRange[0];
			const endLine = lastRange[1];
			result.set(section.index, lines.slice(startLine, endLine + 1).join('\n').trimEnd());
		}
	}

	return result;
}
