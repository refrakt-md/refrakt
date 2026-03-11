import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';

/**
 * Parse inline markdown source into HTML suitable for contentEditable.
 *
 * Uses Markdoc.parse() on a synthetic paragraph, then walks the inline AST
 * to produce clean HTML with only the inline elements we support:
 * strong, em, code, and links.
 */
export function parseInlineMarkdown(source: string): string {
	if (!source) return '';

	const ast = Markdoc.parse(source);
	// The AST is: document > paragraph > inline children
	const doc = ast;
	if (!doc.children?.length) return escapeHtml(source);

	const paragraph = doc.children[0];
	if (!paragraph?.children?.length) return escapeHtml(source);

	return renderInlineNodes(paragraph.children);
}

function renderInlineNodes(nodes: Node[]): string {
	return nodes.map(renderInlineNode).join('');
}

function renderInlineNode(node: Node): string {
	switch (node.type) {
		case 'text':
			return escapeHtml(node.attributes.content ?? '');

		case 'strong':
			return `<strong>${renderInlineNodes(node.children)}</strong>`;

		case 'em':
			return `<em>${renderInlineNodes(node.children)}</em>`;

		case 's':
			return `<s>${renderInlineNodes(node.children)}</s>`;

		case 'code':
			return `<code>${escapeHtml(node.attributes.content ?? '')}</code>`;

		case 'link': {
			const href = node.attributes.href ?? '';
			const title = node.attributes.title;
			const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
			return `<a href="${escapeAttr(href)}"${titleAttr}>${renderInlineNodes(node.children)}</a>`;
		}

		case 'hardbreak':
			return ' ';

		case 'softbreak':
			return ' ';

		default:
			// Graceful fallback: render children if any
			if (node.children?.length) {
				return renderInlineNodes(node.children);
			}
			return '';
	}
}

/**
 * Serialize the DOM contents of a contentEditable element back to inline markdown.
 */
export function serializeInlineHtml(el: HTMLElement): string {
	return serializeNodes(el.childNodes);
}

function serializeNodes(nodes: NodeListOf<ChildNode> | ChildNode[]): string {
	const parts: string[] = [];
	for (const node of nodes) {
		parts.push(serializeNode(node));
	}
	return parts.join('');
}

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

function serializeNode(node: ChildNode): string {
	if (node.nodeType === TEXT_NODE) {
		return escapeMarkdown(node.textContent ?? '');
	}

	if (node.nodeType !== ELEMENT_NODE) return '';

	const el = node as HTMLElement;
	const tag = el.tagName;

	switch (tag) {
		case 'STRONG':
		case 'B':
			return `**${serializeNodes(el.childNodes)}**`;

		case 'EM':
		case 'I':
			return `*${serializeNodes(el.childNodes)}*`;

		case 'S':
		case 'STRIKE':
		case 'DEL':
			return `~~${serializeNodes(el.childNodes)}~~`;

		case 'CODE':
			return `\`${el.textContent ?? ''}\``;

		case 'A': {
			const href = el.getAttribute('href') ?? '';
			const text = serializeNodes(el.childNodes);
			return `[${text}](${href})`;
		}

		case 'BR':
			return ' ';

		// Browser quirks: contentEditable may wrap text in divs/spans
		case 'DIV':
		case 'P':
		case 'SPAN':
			return serializeNodes(el.childNodes);

		default:
			return serializeNodes(el.childNodes);
	}
}

/**
 * Strip inline markdown formatting to produce plain text (for matching).
 */
export function stripInlineMarkdown(source: string): string {
	return source
		// Links: [text](url) or [text](url "title") → text
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		// Images: ![alt](url) → alt
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		// Bold: **text** or __text__
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/__(.+?)__/g, '$1')
		// Italic: *text* or _text_
		.replace(/\*(.+?)\*/g, '$1')
		.replace(/_(.+?)_/g, '$1')
		// Strikethrough: ~~text~~
		.replace(/~~(.+?)~~/g, '$1')
		// Inline code: `text`
		.replace(/`([^`]+)`/g, '$1');
}

// ── Helpers ──────────────────────────────────────────────────

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * Escape markdown-significant characters in plain text that will be
 * inserted into a markdown context. Only escapes characters that would
 * otherwise trigger formatting.
 */
function escapeMarkdown(s: string): string {
	// Escape characters that start markdown formatting tokens
	// when they appear in text nodes (i.e. user typed them literally)
	return s.replace(/([\\*_`~\[\]])/g, '\\$1');
}

/**
 * Normalize a contentEditable element's DOM to clean up browser quirks.
 * Call this after paste or format operations.
 */
export function normalizeEditableDom(el: HTMLElement): void {
	// Replace <b> with <strong>, <i> with <em>
	for (const b of Array.from(el.querySelectorAll('b'))) {
		const strong = document.createElement('strong');
		strong.innerHTML = b.innerHTML;
		b.replaceWith(strong);
	}
	for (const i of Array.from(el.querySelectorAll('i'))) {
		const em = document.createElement('em');
		em.innerHTML = i.innerHTML;
		i.replaceWith(em);
	}

	// Remove styled spans (browser formatting artifacts)
	for (const span of Array.from(el.querySelectorAll('span[style]'))) {
		// Check if the style indicates bold or italic and convert
		const style = (span as HTMLElement).style;
		const parent = span.parentNode;
		if (!parent) continue;

		if (style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 700) {
			const strong = document.createElement('strong');
			strong.innerHTML = span.innerHTML;
			span.replaceWith(strong);
		} else if (style.fontStyle === 'italic') {
			const em = document.createElement('em');
			em.innerHTML = span.innerHTML;
			span.replaceWith(em);
		} else {
			// Unwrap the span, keeping its children
			while (span.firstChild) {
				parent.insertBefore(span.firstChild, span);
			}
			span.remove();
		}
	}

	// Flatten block elements that contentEditable may create
	for (const div of Array.from(el.querySelectorAll('div, p'))) {
		const parent = div.parentNode;
		if (!parent || div === el) continue;
		// Replace with a space + children
		if (div.previousSibling) {
			parent.insertBefore(document.createTextNode(' '), div);
		}
		while (div.firstChild) {
			parent.insertBefore(div.firstChild, div);
		}
		div.remove();
	}
}
