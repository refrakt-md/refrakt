import { createHighlighter, createCssVariablesTheme } from 'shiki';
import type { LanguageRegistration } from 'shiki';
import { isTag } from '@refrakt-md/transform';
import type { RendererNode, SerializedTag } from '@refrakt-md/types';
import { markdocLanguage } from './langs/markdoc.js';

const cssVarsTheme = createCssVariablesTheme();

export interface HighlightOptions {
	/** Languages to pre-load when using the default Shiki highlighter.
	 *  Accepts bundled language names or custom LanguageRegistration objects. */
	langs?: (string | LanguageRegistration)[];
	/** Custom highlight function. Receives raw code + language, returns HTML string.
	 *  Default: Shiki with css-variables theme. */
	highlight?: (code: string, lang: string) => string;
}

const DEFAULT_LANGS: (string | LanguageRegistration)[] = [
	'javascript', 'typescript', 'html', 'css', 'json', 'shell',
	'python', 'ruby', 'go', 'rust', 'java', 'c', 'cpp',
	'markdown', 'yaml', 'toml', 'sql', 'graphql', 'svelte',
	'jsx', 'tsx', 'diff', 'xml',
	markdocLanguage,
];

/**
 * Create a syntax highlight transform that walks the serialized tree,
 * finds elements with `data-language` + text children, highlights them,
 * and sets `data-codeblock: true` for raw HTML injection by the Renderer.
 *
 * Uses Shiki with a CSS variables theme by default. Pass a custom
 * `highlight` function to use a different highlighter.
 */
export async function createHighlightTransform(
	options: HighlightOptions = {}
): Promise<(tree: RendererNode) => RendererNode> {
	const { langs = DEFAULT_LANGS, highlight: customHighlight } = options;

	let highlightFn: (code: string, lang: string) => string;

	if (customHighlight) {
		highlightFn = customHighlight;
	} else {
		const highlighter = await createHighlighter({
			themes: [cssVarsTheme],
			langs,
		});
		highlightFn = (code: string, lang: string) => {
			const html = highlighter.codeToHtml(code, { lang, theme: 'css-variables' });
			return extractInnerHtml(html);
		};
	}

	return (tree: RendererNode) => walk(tree, highlightFn);
}

/** Walk the serialized tree, highlighting elements with `data-language`. */
function walk(node: RendererNode, highlightFn: (code: string, lang: string) => string): RendererNode {
	if (node === null || node === undefined) return node;
	if (typeof node === 'string' || typeof node === 'number') return node;
	if (!isTag(node)) return node;

	const lang = node.attributes?.['data-language'];

	if (lang && hasTextChildren(node)) {
		return highlightNode(node, lang, highlightFn);
	}

	return {
		...node,
		children: node.children.map(c => walk(c, highlightFn)),
	};
}

function hasTextChildren(node: SerializedTag): boolean {
	return node.children.some(c => typeof c === 'string');
}

function highlightNode(
	node: SerializedTag,
	lang: string,
	highlightFn: (code: string, lang: string) => string,
): SerializedTag {
	const text = node.children
		.filter((c): c is string => typeof c === 'string')
		.join('');

	try {
		const html = highlightFn(text, lang);
		return {
			...node,
			attributes: { ...node.attributes, 'data-codeblock': true },
			children: [html],
		};
	} catch {
		// Unknown language or highlight failure — leave text unchanged
		return node;
	}
}

/** Strip Shiki's <pre><code> wrapper to get just the highlighted spans. */
function extractInnerHtml(html: string): string {
	const codeStart = html.indexOf('<code>');
	const codeEnd = html.lastIndexOf('</code>');
	if (codeStart !== -1 && codeEnd !== -1) {
		return html.slice(codeStart + '<code>'.length, codeEnd);
	}
	return html;
}
