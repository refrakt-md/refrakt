import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import { isTag } from './helpers.js';

const VOID_ELEMENTS = new Set([
	'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
	'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Attributes that are internal markers and should not appear in HTML output */
const INTERNAL_ATTRS = new Set(['$$mdtype', 'typeof', 'property']);

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderAttrs(attrs: Record<string, any>): string {
	const parts: string[] = [];
	for (const [k, v] of Object.entries(attrs)) {
		if (INTERNAL_ATTRS.has(k)) continue;
		if (v === undefined || v === null || v === false) continue;
		if (v === true) { parts.push(k); continue; }
		parts.push(`${k}="${escapeHtml(String(v))}"`);
	}
	return parts.length ? ' ' + parts.join(' ') : '';
}

export interface RenderOptions {
	/** Pretty-print with indentation */
	pretty?: boolean;
	/** Indentation string (default: two spaces) */
	indent?: string;
}

/**
 * Render a serialized tag tree to an HTML string.
 *
 * Mirrors the attribute-handling logic in Renderer.svelte:
 * skip null/undefined/false, bare attribute for true, escape values.
 */
export function renderToHtml(node: RendererNode, options?: RenderOptions): string {
	if (options?.pretty) {
		return renderPretty(node, 0, options.indent ?? '  ');
	}
	return renderFlat(node);
}

function renderFlat(node: RendererNode): string {
	if (node === null || node === undefined) return '';
	if (typeof node === 'string') return escapeHtml(node);
	if (typeof node === 'number') return String(node);
	if (Array.isArray(node)) return node.map(renderFlat).join('');
	if (!isTag(node)) return '';

	const tag = node.name;
	const attrs = renderAttrs(node.attributes);

	if (VOID_ELEMENTS.has(tag)) {
		return `<${tag}${attrs} />`;
	}

	const children = node.children.map(renderFlat).join('');
	return `<${tag}${attrs}>${children}</${tag}>`;
}

function renderPretty(node: RendererNode, depth: number, indent: string): string {
	if (node === null || node === undefined) return '';
	if (typeof node === 'string') return indent.repeat(depth) + escapeHtml(node);
	if (typeof node === 'number') return indent.repeat(depth) + String(node);
	if (Array.isArray(node)) return node.map(n => renderPretty(n, depth, indent)).filter(Boolean).join('\n');
	if (!isTag(node)) return '';

	const tag = node.name;
	const attrs = renderAttrs(node.attributes);
	const pad = indent.repeat(depth);

	if (VOID_ELEMENTS.has(tag)) {
		return `${pad}<${tag}${attrs} />`;
	}

	// <pre> preserves whitespace — render children flat to avoid visible indentation
	if (tag === 'pre') {
		const children = node.children.map(c => renderFlatChild(c)).join('');
		return `${pad}<${tag}${attrs}>${children}</${tag}>`;
	}

	// Inline elements with only text children
	const allText = node.children.every(c => typeof c === 'string' || typeof c === 'number');
	if (allText && node.children.length <= 1) {
		const text = node.children.map(c => typeof c === 'string' ? escapeHtml(c) : String(c)).join('');
		return `${pad}<${tag}${attrs}>${text}</${tag}>`;
	}

	const childLines = node.children
		.map(c => renderPretty(c, depth + 1, indent))
		.filter(Boolean);

	return `${pad}<${tag}${attrs}>\n${childLines.join('\n')}\n${pad}</${tag}>`;
}

/** Render a child node flat (no indentation), respecting data-codeblock raw HTML. */
function renderFlatChild(node: RendererNode): string {
	if (node === null || node === undefined) return '';
	if (typeof node === 'string') return escapeHtml(node);
	if (typeof node === 'number') return String(node);
	if (Array.isArray(node)) return node.map(renderFlatChild).join('');
	if (!isTag(node)) return '';

	const tag = node.name;
	const attrs = renderAttrs(node.attributes);

	if (VOID_ELEMENTS.has(tag)) return `<${tag}${attrs} />`;

	// data-codeblock children are raw HTML from Shiki — don't escape
	const raw = node.attributes?.['data-codeblock'];
	const children = raw
		? node.children.map(c => typeof c === 'string' ? c : renderFlatChild(c)).join('')
		: node.children.map(renderFlatChild).join('');

	return `<${tag}${attrs}>${children}</${tag}>`;
}
