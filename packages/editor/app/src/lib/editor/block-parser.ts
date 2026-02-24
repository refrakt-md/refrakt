import type { RuneInfo } from '../api/client.js';

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

let nextId = 0;
function uid(): string {
	return `blk_${++nextId}`;
}

// ── Rune tag regex helpers ───────────────────────────────────────────

/** Matches an opening rune tag: {% name attr="val" %} or self-closing {% name /%} */
const RUNE_OPEN_RE = /^\{%\s+(\w[\w-]*)((?:\s+\w[\w-]*(?:="[^"]*")?)*)\s*(\/?)\s*%\}/;

/** Matches a closing rune tag: {% /name %} */
function runeCloseRe(name: string): RegExp {
	return new RegExp(`^\\{%\\s+/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*%\\}`);
}

/** Parse attribute string like `method="POST" path="/users" auth` into Record */
function parseAttributes(raw: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const re = /(\w[\w-]*)(?:="([^"]*)")?/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(raw)) !== null) {
		attrs[m[1]] = m[2] ?? 'true';
	}
	return attrs;
}

/** Serialize attributes back to Markdoc syntax */
export function serializeAttributes(attrs: Record<string, string>): string {
	const parts: string[] = [];
	for (const [key, value] of Object.entries(attrs)) {
		if (value === 'true') {
			parts.push(key);
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
				id: uid(),
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
				blocks.push({
					id: uid(),
					type: 'rune',
					source: lines.slice(start, i).join('\n'),
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
				blocks.push({
					id: uid(),
					type: 'rune',
					source: lines.slice(start, i).join('\n'),
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
			blocks.push({
				id: uid(),
				type: 'heading',
				source: lines.slice(start, i).join('\n'),
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
			blocks.push({
				id: uid(),
				type: 'hr',
				source: lines.slice(start, i).join('\n'),
				startLine: start,
				endLine: i,
			});
			continue;
		}

		// ── Image (standalone line) ──────────────────────────────
		if (/^!\[.*\]\(.*\)\s*$/.test(trimmed)) {
			const start = i;
			i++;
			blocks.push({
				id: uid(),
				type: 'image',
				source: lines.slice(start, i).join('\n'),
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
			blocks.push({
				id: uid(),
				type: 'quote',
				source: lines.slice(start, i).join('\n'),
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
			blocks.push({
				id: uid(),
				type: 'list',
				source: lines.slice(start, i).join('\n'),
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
			blocks.push({
				id: uid(),
				type: 'paragraph',
				source: lines.slice(start, i).join('\n'),
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
