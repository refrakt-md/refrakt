import type { RuneInfo } from '../api/client.js';
import type { ResolvedStructure, ResolvedField } from './content-model-resolver.js';

/**
 * Block types recognized by the visual editor.
 *
 * - heading:  `# …` through `###### …`
 * - paragraph: plain text (may span multiple lines)
 * - fence:    ``` code blocks ```
 * - rune:     `{% name … %}…{% /name %}` or self-closing `{% name … /%}`
 * - list:     `- …` or `1. …` runs
 * - quote:    `> …` runs
 * - hr:       `---` / `***` / `___`
 * - image:    `![alt](src)` on its own line
 */
export type BlockType =
	| 'heading'
	| 'paragraph'
	| 'fence'
	| 'rune'
	| 'list'
	| 'quote'
	| 'hr'
	| 'image';

export interface Block {
	id: string;
	type: BlockType;
	/** Raw source text for this block (including tag delimiters for runes) */
	source: string;
	/** 0-based start line in the document */
	startLine: number;
	/** 0-based end line (exclusive) */
	endLine: number;
}

export interface HeadingBlock extends Block {
	type: 'heading';
	level: number;
	text: string;
}

export interface RuneBlock extends Block {
	type: 'rune';
	runeName: string;
	selfClosing: boolean;
	/** Parsed attribute key=value pairs */
	attributes: Record<string, string>;
	/** Inner content (between open/close tags) */
	innerContent: string;
}

export interface FenceBlock extends Block {
	type: 'fence';
	language: string;
	code: string;
}

export interface ListBlock extends Block {
	type: 'list';
	ordered: boolean;
}

export type ParsedBlock =
	| HeadingBlock
	| RuneBlock
	| FenceBlock
	| ListBlock
	| (Block & { type: 'paragraph' | 'quote' | 'hr' | 'image' });

/** Deterministic hash (djb2) for stable block IDs across re-parses */
function hashSource(s: string): string {
	let h = 5381;
	for (let i = 0; i < s.length; i++) {
		h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
	}
	return h.toString(36);
}

/** Generate a stable ID from block source content, deduplicating identical blocks */
function stableId(source: string, seen: Map<string, number>): string {
	const hash = hashSource(source);
	const count = seen.get(hash) ?? 0;
	seen.set(hash, count + 1);
	return count === 0 ? `blk_${hash}` : `blk_${hash}_${count}`;
}

// ── Rune tag regex helpers ───────────────────────────────────────────

/** Matches an opening rune tag: {% name attr="val" attr=2 %} or self-closing {% name /%} */
const RUNE_OPEN_RE = /^\{%\s+(\w[\w-]*)((?:\s+\w[\w-]*(?:="[^"]*"|=[\w.-]+)?)*)\s*(\/?)\s*%\}/;

/** Matches a closing rune tag: {% /name %} */
function runeCloseRe(name: string): RegExp {
	return new RegExp(`^\\{%\\s+/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*%\\}`);
}

/** Parse attribute string like `method="POST" path="/users" count=3 auth` into Record */
function parseAttributes(raw: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const re = /(\w[\w-]*)(?:="([^"]*)"|=([\w.-]+))?/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(raw)) !== null) {
		attrs[m[1]] = m[2] ?? m[3] ?? 'true';
	}
	return attrs;
}

/** Check if a string value represents a number */
function isNumericValue(value: string): boolean {
	return value !== '' && !isNaN(Number(value));
}

/** Serialize attributes back to Markdoc syntax */
export function serializeAttributes(attrs: Record<string, string>): string {
	const parts: string[] = [];
	for (const [key, value] of Object.entries(attrs)) {
		if (value === 'true') {
			parts.push(key);
		} else if (value === 'false' || isNumericValue(value)) {
			parts.push(`${key}=${value}`);
		} else {
			parts.push(`${key}="${value}"`);
		}
	}
	return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

// ── Main parser ──────────────────────────────────────────────────────

/**
 * Parse a Markdoc body string into an ordered list of blocks.
 * Each block maps to a contiguous range of source lines.
 */
export function parseBlocks(source: string): ParsedBlock[] {
	const lines = source.split('\n');
	const blocks: ParsedBlock[] = [];
	const seen = new Map<string, number>();
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		const trimmed = line.trimStart();

		// Skip blank lines between blocks
		if (trimmed === '') {
			i++;
			continue;
		}

		// ── Fenced code blocks ───────────────────────────────────
		if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
			const fence = trimmed.slice(0, 3);
			const lang = trimmed.slice(3).trim();
			const start = i;
			i++;
			const codeLines: string[] = [];
			while (i < lines.length && !lines[i].trimStart().startsWith(fence)) {
				codeLines.push(lines[i]);
				i++;
			}
			if (i < lines.length) i++; // skip closing fence
			const src = lines.slice(start, i).join('\n');
			blocks.push({
				id: stableId(src, seen),
				type: 'fence',
				source: src,
				startLine: start,
				endLine: i,
				language: lang,
				code: codeLines.join('\n'),
			});
			continue;
		}

		// ── Rune tags ────────────────────────────────────────────
		const runeMatch = RUNE_OPEN_RE.exec(trimmed);
		if (runeMatch) {
			const name = runeMatch[1];
			const attrStr = runeMatch[2] ?? '';
			const selfClose = runeMatch[3] === '/';
			const start = i;

			if (selfClose) {
				i++;
				const src = lines.slice(start, i).join('\n');
				blocks.push({
					id: stableId(src, seen),
					type: 'rune',
					source: src,
					startLine: start,
					endLine: i,
					runeName: name,
					selfClosing: true,
					attributes: parseAttributes(attrStr),
					innerContent: '',
				});
			} else {
				// Find matching close tag
				i++;
				const closeRe = runeCloseRe(name);
				const innerLines: string[] = [];
				let depth = 1;
				while (i < lines.length) {
					const lt = lines[i].trimStart();
					// Check for nested open of same name
					const nestedOpen = RUNE_OPEN_RE.exec(lt);
					if (nestedOpen && nestedOpen[1] === name && nestedOpen[3] !== '/') {
						depth++;
					}
					if (closeRe.test(lt)) {
						depth--;
						if (depth === 0) break;
					}
					innerLines.push(lines[i]);
					i++;
				}
				if (i < lines.length) i++; // skip close tag
				const src = lines.slice(start, i).join('\n');
				blocks.push({
					id: stableId(src, seen),
					type: 'rune',
					source: src,
					startLine: start,
					endLine: i,
					runeName: name,
					selfClosing: false,
					attributes: parseAttributes(attrStr),
					innerContent: innerLines.join('\n'),
				});
			}
			continue;
		}

		// ── Headings ─────────────────────────────────────────────
		const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
		if (headingMatch) {
			const start = i;
			i++;
			const src = lines.slice(start, i).join('\n');
			blocks.push({
				id: stableId(src, seen),
				type: 'heading',
				source: src,
				startLine: start,
				endLine: i,
				level: headingMatch[1].length,
				text: headingMatch[2],
			});
			continue;
		}

		// ── HR ───────────────────────────────────────────────────
		if (/^(---+|___+|\*\*\*+)\s*$/.test(trimmed)) {
			const start = i;
			i++;
			const src = lines.slice(start, i).join('\n');
			blocks.push({
				id: stableId(src, seen),
				type: 'hr',
				source: src,
				startLine: start,
				endLine: i,
			});
			continue;
		}

		// ── Image (standalone line) ──────────────────────────────
		if (/^!\[.*\]\(.*\)\s*$/.test(trimmed)) {
			const start = i;
			i++;
			const src = lines.slice(start, i).join('\n');
			blocks.push({
				id: stableId(src, seen),
				type: 'image',
				source: src,
				startLine: start,
				endLine: i,
			});
			continue;
		}

		// ── Blockquote ───────────────────────────────────────────
		if (trimmed.startsWith('>')) {
			const start = i;
			while (i < lines.length && (lines[i].trimStart().startsWith('>') || (lines[i].trim() !== '' && !isBlockStart(lines[i])))) {
				i++;
			}
			const src = lines.slice(start, i).join('\n');
			blocks.push({
				id: stableId(src, seen),
				type: 'quote',
				source: src,
				startLine: start,
				endLine: i,
			});
			continue;
		}

		// ── List ─────────────────────────────────────────────────
		const listMatch = trimmed.match(/^(\d+\.|[-*+])\s/);
		if (listMatch) {
			const ordered = /^\d+\./.test(listMatch[1]);
			const start = i;
			while (i < lines.length) {
				const lt = lines[i].trimStart();
				// Continue if it's a list item, continuation indent, or blank line within
				if (/^(\d+\.|[-*+])\s/.test(lt) || (lt === '' && i + 1 < lines.length && /^(\s+|\d+\.|[-*+]\s)/.test(lines[i + 1])) || (lt !== '' && lines[i].startsWith('  '))) {
					i++;
				} else {
					break;
				}
			}
			const src = lines.slice(start, i).join('\n');
			blocks.push({
				id: stableId(src, seen),
				type: 'list',
				source: src,
				startLine: start,
				endLine: i,
				ordered,
			});
			continue;
		}

		// ── Paragraph (catch-all) ────────────────────────────────
		{
			const start = i;
			while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
				i++;
			}
			const src = lines.slice(start, i).join('\n');
			blocks.push({
				id: stableId(src, seen),
				type: 'paragraph',
				source: src,
				startLine: start,
				endLine: i,
			});
		}
	}

	return blocks;
}

/** Check if a line starts a new block-level element */
function isBlockStart(line: string): boolean {
	const t = line.trimStart();
	if (t.startsWith('#')) return true;
	if (t.startsWith('```') || t.startsWith('~~~')) return true;
	if (RUNE_OPEN_RE.test(t)) return true;
	if (/^(---+|___+|\*\*\*+)\s*$/.test(t)) return true;
	if (t.startsWith('>')) return true;
	if (/^(\d+\.|[-*+])\s/.test(t)) return true;
	if (/^!\[.*\]\(.*\)\s*$/.test(t)) return true;
	return false;
}

// ── Content tree parser (for nested rune editing) ────────────────────

export interface ContentNode {
	type: 'rune' | 'heading' | 'paragraph' | 'fence' | 'list' | 'quote' | 'hr' | 'image';
	label: string;
	source: string;
	// Rune-specific
	runeName?: string;
	selfClosing?: boolean;
	attributes?: Record<string, string>;
	innerContent?: string;
	children?: ContentNode[];
	// Type-specific (populated during parsing)
	headingLevel?: number;
	headingText?: string;
	fenceLanguage?: string;
	fenceCode?: string;
	listOrdered?: boolean;
}

/**
 * Parse a content string into a tree of ContentNodes.
 * Similar to parseBlocks() but builds a tree: rune nodes recursively
 * parse their inner content into children.
 */
export function parseContentTree(content: string): ContentNode[] {
	if (!content.trim()) return [];

	const lines = content.split('\n');
	const nodes: ContentNode[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		const trimmed = line.trimStart();

		if (trimmed === '') { i++; continue; }

		// Fenced code
		if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
			const fence = trimmed.slice(0, 3);
			const lang = trimmed.slice(3).trim();
			const start = i;
			i++;
			const codeStart = i;
			while (i < lines.length && !lines[i].trimStart().startsWith(fence)) i++;
			const code = lines.slice(codeStart, i).join('\n');
			if (i < lines.length) i++;
			nodes.push({
				type: 'fence',
				label: lang ? `Code (${lang})` : 'Code',
				source: lines.slice(start, i).join('\n'),
				fenceLanguage: lang,
				fenceCode: code,
			});
			continue;
		}

		// Rune tags
		const runeMatch = RUNE_OPEN_RE.exec(trimmed);
		if (runeMatch) {
			const name = runeMatch[1];
			const attrStr = runeMatch[2] ?? '';
			const selfClose = runeMatch[3] === '/';
			const start = i;

			if (selfClose) {
				i++;
				nodes.push({
					type: 'rune',
					label: name,
					source: lines.slice(start, i).join('\n'),
					runeName: name,
					selfClosing: true,
					attributes: parseAttributes(attrStr),
					innerContent: '',
					children: [],
				});
			} else {
				i++;
				const closeRe = runeCloseRe(name);
				const innerLines: string[] = [];
				let depth = 1;
				while (i < lines.length) {
					const lt = lines[i].trimStart();
					const nestedOpen = RUNE_OPEN_RE.exec(lt);
					if (nestedOpen && nestedOpen[1] === name && nestedOpen[3] !== '/') depth++;
					if (closeRe.test(lt)) { depth--; if (depth === 0) break; }
					innerLines.push(lines[i]);
					i++;
				}
				if (i < lines.length) i++;
				const inner = innerLines.join('\n');
				nodes.push({
					type: 'rune',
					label: name,
					source: lines.slice(start, i).join('\n'),
					runeName: name,
					selfClosing: false,
					attributes: parseAttributes(attrStr),
					innerContent: inner,
					children: parseContentTree(inner),
				});
			}
			continue;
		}

		// Heading
		const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const text = headingMatch[2];
			i++;
			nodes.push({
				type: 'heading',
				label: `${'#'.repeat(level)} ${text}`,
				source: lines.slice(i - 1, i).join('\n'),
				headingLevel: level,
				headingText: text,
			});
			continue;
		}

		// HR
		if (/^(---+|___+|\*\*\*+)\s*$/.test(trimmed)) {
			i++;
			nodes.push({ type: 'hr', label: 'Divider', source: lines.slice(i - 1, i).join('\n') });
			continue;
		}

		// Image
		if (/^!\[.*\]\(.*\)\s*$/.test(trimmed)) {
			i++;
			nodes.push({ type: 'image', label: 'Image', source: lines.slice(i - 1, i).join('\n') });
			continue;
		}

		// Blockquote
		if (trimmed.startsWith('>')) {
			const start = i;
			while (i < lines.length && (lines[i].trimStart().startsWith('>') || (lines[i].trim() !== '' && !isBlockStart(lines[i])))) i++;
			const src = lines.slice(start, i).join('\n');
			nodes.push({ type: 'quote', label: 'Blockquote', source: src });
			continue;
		}

		// List
		if (/^(\d+\.|[-*+])\s/.test(trimmed)) {
			const start = i;
			while (i < lines.length) {
				const lt = lines[i].trimStart();
				if (/^(\d+\.|[-*+])\s/.test(lt) || (lt === '' && i + 1 < lines.length && /^(\s+|\d+\.|[-*+]\s)/.test(lines[i + 1])) || (lt !== '' && lines[i].startsWith('  '))) {
					i++;
				} else { break; }
			}
			const ordered = /^\d+\./.test(trimmed);
			nodes.push({ type: 'list', label: ordered ? 'Ordered list' : 'List', source: lines.slice(start, i).join('\n'), listOrdered: ordered });
			continue;
		}

		// Paragraph
		{
			const start = i;
			while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) i++;
			const src = lines.slice(start, i).join('\n');
			const preview = src.length > 40 ? src.slice(0, 40) + '…' : src;
			nodes.push({ type: 'paragraph', label: preview, source: src });
		}
	}

	return nodes;
}

/**
 * Replace a nested rune node's source within a parent content string.
 * Finds the node's original source and replaces it with the new source.
 */
export function replaceNodeSource(parentContent: string, oldSource: string, newSource: string): string {
	const idx = parentContent.indexOf(oldSource);
	if (idx === -1) return parentContent;
	return parentContent.slice(0, idx) + newSource + parentContent.slice(idx + oldSource.length);
}

// ── Content model field insertion / removal ──────────────────────────

/** Default markdown template for a field's match type */
function defaultTemplate(match: string): string {
	const primary = match.includes('|') ? match.split('|')[0] : match;
	switch (primary) {
		case 'heading': return '## Heading';
		case 'heading:1': return '# Heading';
		case 'heading:2': return '## Heading';
		case 'heading:3': return '### Heading';
		case 'heading:4': return '#### Heading';
		case 'heading:5': return '##### Heading';
		case 'heading:6': return '###### Heading';
		case 'paragraph': return 'Text content';
		case 'list': case 'list:unordered': return '- Item 1\n- Item 2';
		case 'list:ordered': return '1. Item 1\n2. Item 2';
		case 'fence': return '```\ncode\n```';
		case 'image': return '![alt](url)';
		case 'blockquote': case 'quote': return '> Quote';
		case 'any': return 'Content';
		default: return 'Content';
	}
}

/**
 * Insert content for an empty field in a resolved structure.
 * Returns the updated innerContent string.
 */
export function insertFieldContent(
	innerContent: string,
	structure: ResolvedStructure,
	fieldName: string,
	zoneName?: string,
): string {
	const { field, fields } = findField(structure, fieldName, zoneName);
	if (!field || field.filled) return innerContent;

	const template = field.template || defaultTemplate(field.match);

	if (structure.type === 'delimited' && zoneName) {
		return insertInDelimited(innerContent, structure, zoneName, fieldName, fields!, template);
	}

	if (structure.type === 'sequence') {
		return insertInSequence(innerContent, structure.fields, fieldName, template);
	}

	return innerContent;
}

/**
 * Remove content for a filled field in a resolved structure.
 * Returns the updated innerContent string.
 */
export function removeFieldContent(
	innerContent: string,
	structure: ResolvedStructure,
	fieldName: string,
	zoneName?: string,
): string {
	const { field } = findField(structure, fieldName, zoneName);
	if (!field || !field.filled || field.nodes.length === 0) return innerContent;

	let result = innerContent;
	// Remove all matched nodes' source text (reverse order to preserve indices)
	for (let i = field.nodes.length - 1; i >= 0; i--) {
		const nodeSource = field.nodes[i].source;
		result = removeNodeSource(result, nodeSource);
	}

	// Clean up double blank lines left by removal
	result = result.replace(/\n{3,}/g, '\n\n');

	return result;
}

/**
 * Append a new item to a filled list field.
 * Returns the updated innerContent string.
 */
export function appendListItem(
	innerContent: string,
	structure: ResolvedStructure,
	fieldName: string,
	zoneName?: string,
): string {
	const { field } = findField(structure, fieldName, zoneName);
	if (!field || !field.filled || field.nodes.length === 0) return innerContent;

	const template = field.template || '- New item';
	const lastNode = field.nodes[field.nodes.length - 1];
	const idx = innerContent.indexOf(lastNode.source);
	if (idx === -1) return innerContent;

	const afterEnd = idx + lastNode.source.length;
	return innerContent.slice(0, afterEnd) + '\n' + template + innerContent.slice(afterEnd);
}

function findField(
	structure: ResolvedStructure,
	fieldName: string,
	zoneName?: string,
): { field: ResolvedField | null; fields: ResolvedField[] | null } {
	if (structure.type === 'sequence') {
		const field = structure.fields.find(f => f.name === fieldName) ?? null;
		return { field, fields: structure.fields };
	}
	if (structure.type === 'delimited' && zoneName) {
		const zone = structure.zones.find(z => z.name === zoneName);
		if (!zone) return { field: null, fields: null };
		const field = zone.fields.find(f => f.name === fieldName) ?? null;
		return { field, fields: zone.fields };
	}
	return { field: null, fields: null };
}

/** Remove a node's source from content, handling surrounding whitespace */
function removeNodeSource(content: string, nodeSource: string): string {
	const idx = content.indexOf(nodeSource);
	if (idx === -1) return content;

	let start = idx;
	let end = idx + nodeSource.length;

	// Extend to consume surrounding blank lines
	while (start > 0 && content[start - 1] === '\n') start--;
	if (start > 0) start++; // Keep one newline
	while (end < content.length && content[end] === '\n') end++;

	return content.slice(0, start) + content.slice(end);
}

function insertInSequence(
	innerContent: string,
	fields: ResolvedField[],
	fieldName: string,
	template: string,
): string {
	const fieldIndex = fields.findIndex(f => f.name === fieldName);
	if (fieldIndex === -1) return innerContent;

	// Find the last filled field before this one to insert after
	let insertAfterNode: ContentNode | null = null;
	for (let i = fieldIndex - 1; i >= 0; i--) {
		if (fields[i].filled && fields[i].nodes.length > 0) {
			const nodes = fields[i].nodes;
			insertAfterNode = nodes[nodes.length - 1];
			break;
		}
	}

	if (insertAfterNode) {
		const idx = innerContent.indexOf(insertAfterNode.source);
		if (idx !== -1) {
			const afterEnd = idx + insertAfterNode.source.length;
			return innerContent.slice(0, afterEnd) + '\n\n' + template + innerContent.slice(afterEnd);
		}
	}

	// Find the first filled field after this one to insert before
	for (let i = fieldIndex + 1; i < fields.length; i++) {
		if (fields[i].filled && fields[i].nodes.length > 0) {
			const beforeNode = fields[i].nodes[0];
			const idx = innerContent.indexOf(beforeNode.source);
			if (idx !== -1) {
				return innerContent.slice(0, idx) + template + '\n\n' + innerContent.slice(idx);
			}
		}
	}

	// No adjacent filled fields — append to content
	const trimmed = innerContent.trimEnd();
	return trimmed + (trimmed ? '\n\n' : '') + template;
}

function insertInDelimited(
	innerContent: string,
	structure: ResolvedStructure & { type: 'delimited' },
	zoneName: string,
	fieldName: string,
	fields: ResolvedField[],
	template: string,
): string {
	const zoneIndex = structure.zones.findIndex(z => z.name === zoneName);
	if (zoneIndex === -1) return innerContent;

	// Split content at delimiters (---) to find zone boundaries
	const lines = innerContent.split('\n');
	const delimiterIndices: number[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].trim() === '---') delimiterIndices.push(i);
	}

	// If the target zone doesn't exist yet (no delimiter), add one
	if (zoneIndex > 0 && delimiterIndices.length < zoneIndex) {
		const trimmed = innerContent.trimEnd();
		const missingDelimiters = zoneIndex - delimiterIndices.length;
		let insert = '';
		for (let i = 0; i < missingDelimiters; i++) {
			insert += '\n\n---';
		}
		return trimmed + insert + '\n\n' + template;
	}

	// Zone exists — insert within it using sequence logic
	// Determine the zone's content range in lines
	const zoneStart = zoneIndex === 0 ? 0 : delimiterIndices[zoneIndex - 1] + 1;
	const zoneEnd = zoneIndex < delimiterIndices.length ? delimiterIndices[zoneIndex] : lines.length;
	const zoneContent = lines.slice(zoneStart, zoneEnd).join('\n');

	const updatedZone = insertInSequence(zoneContent, fields, fieldName, template);

	const before = lines.slice(0, zoneStart).join('\n');
	const after = lines.slice(zoneEnd).join('\n');

	return [before, updatedZone, after].filter(Boolean).join('\n');
}

// ── Serialization ────────────────────────────────────────────────────

/** Reconstruct source text from blocks */
export function serializeBlocks(blocks: ParsedBlock[]): string {
	return blocks.map((b) => b.source).join('\n\n');
}

/** Rebuild a rune block's source from its attributes and inner content */
export function rebuildRuneSource(block: RuneBlock): string {
	const attrStr = serializeAttributes(block.attributes);
	if (block.selfClosing) {
		return `{% ${block.runeName}${attrStr} /%}`;
	}
	const inner = block.innerContent.trim();
	if (inner) {
		return `{% ${block.runeName}${attrStr} %}\n${inner}\n{% /${block.runeName} %}`;
	}
	return `{% ${block.runeName}${attrStr} %}\n\n{% /${block.runeName} %}`;
}

/** Rebuild a heading block's source from level and text */
export function rebuildHeadingSource(block: HeadingBlock): string {
	return '#'.repeat(block.level) + ' ' + block.text;
}

/** Rebuild a fence block's source from language and code */
export function rebuildFenceSource(block: FenceBlock): string {
	return '```' + block.language + '\n' + block.code + '\n```';
}

// ── Rune lookup helper ───────────────────────────────────────────────

/** Build a map from rune name/alias to RuneInfo */
export function buildRuneMap(runes: RuneInfo[]): Map<string, RuneInfo> {
	const map = new Map<string, RuneInfo>();
	for (const r of runes) {
		map.set(r.name, r);
		for (const alias of r.aliases) {
			map.set(alias, r);
		}
	}
	return map;
}

// ── Example content extraction ───────────────────────────────────────

/** Extract the inner content from a full rune example string, stripping the opening/closing tags */
export function extractRuneInner(example: string, name: string): string {
	const lines = example.split('\n');
	// Strip opening tag line ({% name ... %})
	const openRe = new RegExp(`^\\{%\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b.*%\\}\\s*$`);
	const closeRe = new RegExp(`^\\{%\\s+/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*%\\}\\s*$`);

	let start = 0;
	let end = lines.length;

	if (openRe.test(lines[0].trim())) start = 1;
	if (end > start && closeRe.test(lines[end - 1].trim())) end -= 1;

	return lines.slice(start, end).join('\n').trim();
}

/** Human-readable label for a block, used in rail labels and edit panel header */
export function blockLabel(block: ParsedBlock): string {
	switch (block.type) {
		case 'heading':
			return `H${(block as HeadingBlock).level}`;
		case 'rune':
			return (block as RuneBlock).runeName;
		case 'fence': {
			const lang = (block as FenceBlock).language;
			return lang ? `Code (${lang})` : 'Code';
		}
		case 'list':
			return (block as ListBlock).ordered ? 'Ordered List' : 'List';
		case 'quote':
			return 'Blockquote';
		case 'hr':
			return 'Divider';
		case 'image':
			return 'Image';
		case 'paragraph':
			return 'Paragraph';
		default:
			return block.type;
	}
}
