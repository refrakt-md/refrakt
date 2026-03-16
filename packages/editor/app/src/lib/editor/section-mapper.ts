import { parseContentTree, type ContentNode } from './block-parser.js';
import { stripInlineMarkdown } from './inline-markdown.js';

export interface SectionMapping {
	/** The data-name value from the rendered HTML */
	dataName: string;
	/** Plain text content (without markdown syntax) — used for matching */
	text: string;
	/** Original markdown source line(s) */
	source: string;
	/** Prefix to preserve when editing (e.g., "## " for headings, "> " for blockquotes) */
	sourcePrefix: string;
	/** Inline markdown content after prefix stripping, preserving formatting (links, bold, etc.) */
	inlineSource: string;
}

/**
 * Check whether a Shadow DOM element is an editable leaf section.
 * Returns true for elements with only inline content (text, em, strong, a, code, etc.)
 * and false for wrapper elements containing block-level children.
 */
export function isEditableSection(el: HTMLElement): boolean {
	const blockTags = new Set([
		'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV',
		'UL', 'OL', 'LI', 'TABLE', 'BLOCKQUOTE', 'PRE', 'FIGURE',
		'DETAILS', 'SUMMARY', 'ASIDE', 'MAIN', 'FORM',
	]);
	for (const child of el.children) {
		if (blockTags.has(child.tagName)) return false;
	}
	return true;
}

/**
 * Extract the plain text from a markdown source line, stripping syntax prefixes.
 * Returns { text, prefix } where prefix is the markdown syntax to preserve.
 */
function stripMarkdownPrefix(source: string): { text: string; prefix: string } {
	const trimmed = source.trim();

	// Heading: ## text
	const headingMatch = trimmed.match(/^(#{1,6}\s+)(.*)/);
	if (headingMatch) return { text: headingMatch[2], prefix: headingMatch[1] };

	// Blockquote: > text
	const quoteMatch = trimmed.match(/^(>\s*)(.*)/);
	if (quoteMatch) return { text: quoteMatch[2], prefix: quoteMatch[1] };

	// Plain paragraph
	return { text: trimmed, prefix: '' };
}

/**
 * Normalize text for comparison: collapse whitespace, trim, lowercase.
 */
function normalizeText(s: string): string {
	return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Find the section mapping for a given data-name and its rendered text content
 * within a rune's inner content.
 *
 * Uses text-matching: strips markdown prefixes from each content node's source
 * and compares with the rendered text to find the matching node.
 */
export function findSectionMapping(
	innerContent: string,
	dataName: string,
	renderedText: string,
): SectionMapping | null {
	const nodes = parseContentTree(innerContent);
	const normalizedRendered = normalizeText(renderedText);

	// Try to match each node's text against the rendered text
	for (const node of nodes) {
		const { text, prefix } = stripMarkdownPrefix(node.source);
		const plainText = stripInlineMarkdown(text);
		if (normalizeText(plainText) === normalizedRendered) {
			return {
				dataName,
				text: plainText,
				source: node.source,
				sourcePrefix: prefix,
				inlineSource: text,
			};
		}

		// For multi-line paragraphs, check if the joined text matches
		if (node.type === 'paragraph') {
			const joined = node.source.split('\n').map(l => l.trim()).join(' ');
			const joinedPlain = stripInlineMarkdown(joined);
			if (normalizeText(joinedPlain) === normalizedRendered) {
				return {
					dataName,
					text: joinedPlain,
					source: node.source,
					sourcePrefix: '',
					inlineSource: joined,
				};
			}
		}
	}

	// For list nodes, try matching within individual list items
	for (const node of nodes) {
		if (node.type !== 'list') continue;
		const result = findListItemMapping(node.source, dataName, normalizedRendered);
		if (result) return result;
	}

	// Fallback: try matching against child nodes of rune nodes
	for (const node of nodes) {
		if (node.children) {
			const result = findSectionMapping(
				node.innerContent ?? '',
				dataName,
				renderedText,
			);
			if (result) return result;
		}
	}

	return null;
}

/**
 * Split a list source into individual item sources.
 * Each item starts with a list marker (-, *, +, or 1.) and may have
 * indented continuation lines.
 */
function splitListItems(listSource: string): string[] {
	const lines = listSource.split('\n');
	const items: string[] = [];
	let current: string[] = [];

	for (const line of lines) {
		if (/^[-*+]\s|^\d+\.\s/.test(line) && current.length > 0) {
			items.push(current.join('\n'));
			current = [line];
		} else {
			current.push(line);
		}
	}
	if (current.length > 0) items.push(current.join('\n'));
	return items;
}

/**
 * Try to find a section mapping within a list item's content.
 * Handles bold text on the first line (definition title) and
 * continuation lines (definition description).
 */
function findListItemMapping(
	listSource: string,
	dataName: string,
	normalizedRendered: string,
): SectionMapping | null {
	const items = splitListItems(listSource);

	for (const itemSrc of items) {
		const lines = itemSrc.split('\n');
		const firstLine = lines[0];

		// Match bold text on first line: "- **Title**", "- **Title** extra",
		// or with content before bold: "- {% icon ... /%} **Title**"
		const boldMatch = firstLine.match(/^([-*+]\s+.*?)\*\*(.+?)\*\*(.*)/);
		if (boldMatch) {
			const [, prefix, boldText] = boldMatch;
			if (normalizeText(boldText) === normalizedRendered) {
				return {
					dataName,
					text: boldText,
					source: firstLine,
					sourcePrefix: prefix,
					inlineSource: `**${boldText}**${boldMatch[3]}`,
				};
			}
		}

		// Match continuation lines (description text)
		if (lines.length > 1) {
			const contLines = lines.slice(1)
				.map(l => l.replace(/^\s+/, ''))
				.filter(Boolean);
			const contText = contLines.join(' ');
			const contPlain = stripInlineMarkdown(contText);
			if (contLines.length > 0 && normalizeText(contPlain) === normalizedRendered) {
				const contSource = lines.slice(1).join('\n');
				// Find indentation from first non-empty continuation line
				// (lines[1] may be a blank separator line)
				const firstContentLine = lines.slice(1).find(l => l.trim().length > 0);
				const indentMatch = firstContentLine?.match(/^(\s+)/);
				const indent = indentMatch ? indentMatch[1] : '';
				// Include leading blank lines in the prefix so the replacement
				// preserves the blank-line separator between title and description
				const firstContentIdx = firstContentLine ? contSource.indexOf(firstContentLine) : 0;
				const prefix = contSource.slice(0, firstContentIdx) + indent;
				return {
					dataName,
					text: contPlain,
					source: contSource,
					sourcePrefix: prefix,
					inlineSource: contText,
				};
			}
		}
	}

	return null;
}

/**
 * Apply an inline edit to a section within the rune's inner content.
 * Finds the original source and replaces it with the new inline markdown,
 * preserving markdown syntax prefixes (e.g., "## " for headings).
 */
export function applySectionEdit(
	innerContent: string,
	mapping: SectionMapping,
	newInlineSource: string,
): string {
	const newSource = mapping.sourcePrefix + newInlineSource;
	const idx = innerContent.indexOf(mapping.source);
	if (idx === -1) return innerContent;
	return innerContent.slice(0, idx) + newSource + innerContent.slice(idx + mapping.source.length);
}

// ── Action item mapping ──────────────────────────────────────────────

export interface ActionMapping {
	/** The full source line (e.g., "- [Get started](/docs/getting-started)") */
	source: string;
	/** The list item prefix (e.g., "- ") */
	listPrefix: string;
	/** Link display text */
	text: string;
	/** Link URL */
	href: string;
}

/**
 * Find a markdown link within a list item in the rune's inner content,
 * matching by rendered text and href.
 */
export function findActionMapping(
	innerContent: string,
	renderedText: string,
	href: string,
): ActionMapping | null {
	const normalizedRendered = normalizeText(renderedText);
	const lines = innerContent.split('\n');

	for (const line of lines) {
		const match = line.match(/^(\s*[-*+]\s+)\[([^\]]*)\]\(([^)]*)\)\s*$/);
		if (!match) continue;

		const [, listPrefix, linkText, linkUrl] = match;
		if (
			normalizeText(linkText) === normalizedRendered ||
			linkUrl === href
		) {
			return { source: line, listPrefix, text: linkText, href: linkUrl };
		}
	}

	return null;
}

/**
 * Apply an action edit: replace the markdown link in the inner content.
 */
export function applyActionEdit(
	innerContent: string,
	mapping: ActionMapping,
	newText: string,
	newHref: string,
): string {
	const newSource = `${mapping.listPrefix}[${newText}](${newHref})`;
	const idx = innerContent.indexOf(mapping.source);
	if (idx === -1) return innerContent;
	return innerContent.slice(0, idx) + newSource + innerContent.slice(idx + mapping.source.length);
}

// ── Command (fenced code block) mapping ──────────────────────────────

export interface CommandMapping {
	/** Full fenced code block source (including backtick delimiters) */
	source: string;
	/** Just the code content between the fences */
	code: string;
	/** Language tag (e.g., 'bash', 'sh') */
	language: string;
	/** Full opening line before the newline (e.g., "```js" or "````markdoc") */
	opener: string;
	/** Backtick delimiter sequence (e.g., "```" or "````") */
	delimiter: string;
}

/**
 * Find a fenced code block in the rune's inner content,
 * matching by comparing the code content to the rendered text.
 *
 * Handles 3+ backtick delimiters and info strings after the language tag
 * (e.g., `` ```yaml title="config.ts" `` or `` ````markdoc ``).
 */
export function findCommandMapping(
	innerContent: string,
	renderedText: string,
): CommandMapping | null {
	const normalizedRendered = normalizeText(renderedText);
	// Match 3+ backticks, optional language, optional info string, then
	// use a backreference (\2) to match the same-length closing delimiter.
	const fenceRegex = /^((`{3,})(\w*)[^\n]*\n)([\s\S]*?)\n\2\s*$/gm;
	let match;

	while ((match = fenceRegex.exec(innerContent)) !== null) {
		const [fullMatch, opener, delimiter, language, code] = match;
		if (normalizeText(code) === normalizedRendered) {
			return {
				source: fullMatch,
				code,
				language: language || '',
				opener: opener.trimEnd(),
				delimiter,
			};
		}
	}

	return null;
}

/**
 * Apply a command edit: replace the code content within the fenced code block.
 * Preserves the original opening line (including delimiter length and info string)
 * and uses the same backtick delimiter for the closing fence.
 */
export function applyCommandEdit(
	innerContent: string,
	mapping: CommandMapping,
	newCode: string,
): string {
	const newSource = mapping.opener + '\n' + newCode + '\n' + mapping.delimiter;
	const idx = innerContent.indexOf(mapping.source);
	if (idx === -1) return innerContent;
	return innerContent.slice(0, idx) + newSource + innerContent.slice(idx + mapping.source.length);
}
