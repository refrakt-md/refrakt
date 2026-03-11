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
