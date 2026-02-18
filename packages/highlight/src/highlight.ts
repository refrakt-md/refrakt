import { createHighlighter, createCssVariablesTheme } from 'shiki';
import type { LanguageRegistration, HighlighterGeneric, BundledLanguage, BundledTheme } from 'shiki';
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
	/** Shiki theme — a built-in theme name, or { light, dark } pair for dual themes.
	 *  Default: CSS variables theme (--shiki-token-* custom properties). */
	theme?: string | { light: string; dark: string };
}

/** A highlight transform function with an attached `.css` property containing
 *  any CSS needed for the selected theme (background overrides, dual-theme toggle). */
export type HighlightTransform = ((tree: RendererNode) => RendererNode) & { css: string };

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
 * Uses Shiki with a CSS variables theme by default. Pass a `theme` option
 * to use any built-in Shiki theme, or a `{ light, dark }` pair for
 * dual-theme support that switches with the site's light/dark mode.
 *
 * The returned function has a `.css` property containing any CSS needed
 * for the selected theme (background color overrides, dual-theme toggle rules).
 */
export async function createHighlightTransform(
	options: HighlightOptions = {}
): Promise<HighlightTransform> {
	const { langs = DEFAULT_LANGS, highlight: customHighlight, theme } = options;

	let highlightFn: (code: string, lang: string) => string;
	let css = '';

	if (customHighlight) {
		highlightFn = customHighlight;
	} else if (theme && typeof theme === 'object') {
		// Dual theme: { light, dark }
		const highlighter = await createHighlighter({
			themes: [theme.light, theme.dark],
			langs,
		});
		highlightFn = (code: string, lang: string) => {
			const html = highlighter.codeToHtml(code, {
				lang,
				themes: { light: theme.light, dark: theme.dark },
				defaultColor: false,
			});
			return extractInnerHtml(html);
		};
		css = buildDualThemeCss(highlighter, theme.light, theme.dark);
	} else if (theme && typeof theme === 'string') {
		// Single named theme
		const highlighter = await createHighlighter({
			themes: [theme],
			langs,
		});
		highlightFn = (code: string, lang: string) => {
			const html = highlighter.codeToHtml(code, { lang, theme });
			return extractInnerHtml(html);
		};
		css = buildSingleThemeCss(highlighter, theme);
	} else {
		// Default: CSS variables theme
		const highlighter = await createHighlighter({
			themes: [cssVarsTheme],
			langs,
		});
		highlightFn = (code: string, lang: string) => {
			const html = highlighter.codeToHtml(code, { lang, theme: 'css-variables' });
			return extractInnerHtml(html);
		};
	}

	const transform = ((tree: RendererNode) => walk(tree, highlightFn)) as HighlightTransform;
	transform.css = css;
	return transform;
}

/** Build CSS for a single named theme — overrides code block bg/fg. */
function buildSingleThemeCss(
	highlighter: HighlighterGeneric<BundledLanguage, BundledTheme>,
	themeName: string,
): string {
	const theme = highlighter.getTheme(themeName);
	const bg = theme.bg;
	const fg = theme.fg;
	return `:root {\n\t--rf-color-code-bg: ${bg};\n\t--rf-color-code-text: ${fg};\n}\n`;
}

/** Build CSS for dual themes — bg/fg overrides for both modes + span toggle rules. */
function buildDualThemeCss(
	highlighter: HighlighterGeneric<BundledLanguage, BundledTheme>,
	lightName: string,
	darkName: string,
): string {
	const light = highlighter.getTheme(lightName);
	const dark = highlighter.getTheme(darkName);

	return `/* Highlight theme: ${lightName} / ${darkName} */
:root {
\t--rf-color-code-bg: ${light.bg};
\t--rf-color-code-text: ${light.fg};
}
[data-theme="dark"] {
\t--rf-color-code-bg: ${dark.bg};
\t--rf-color-code-text: ${dark.fg};
}
@media (prefers-color-scheme: dark) {
\t:root:not([data-theme="light"]) {
\t\t--rf-color-code-bg: ${dark.bg};
\t\t--rf-color-code-text: ${dark.fg};
\t}
}
[data-codeblock] span {
\tcolor: var(--shiki-light);
\tbackground-color: var(--shiki-light-bg);
\tfont-style: var(--shiki-light-font-style);
\tfont-weight: var(--shiki-light-font-weight);
\ttext-decoration: var(--shiki-light-text-decoration);
}
[data-theme="dark"] [data-codeblock] span {
\tcolor: var(--shiki-dark);
\tbackground-color: var(--shiki-dark-bg);
\tfont-style: var(--shiki-dark-font-style);
\tfont-weight: var(--shiki-dark-font-weight);
\ttext-decoration: var(--shiki-dark-text-decoration);
}
@media (prefers-color-scheme: dark) {
\t:root:not([data-theme="light"]) [data-codeblock] span {
\t\tcolor: var(--shiki-dark);
\t\tbackground-color: var(--shiki-dark-bg);
\t\tfont-style: var(--shiki-dark-font-style);
\t\tfont-weight: var(--shiki-dark-font-weight);
\t\ttext-decoration: var(--shiki-dark-text-decoration);
\t}
}
`;
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
	const match = html.match(/<code[^>]*>([\s\S]*)<\/code>/);
	if (match) return match[1];
	return html;
}
