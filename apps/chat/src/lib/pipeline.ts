import Markdoc from '@markdoc/markdoc';
import { tags, nodes, serializeTree } from '@refrakt-md/runes';
import { identityTransform } from '@refrakt-md/lumina/transform';
import { createHighlightTransform } from '@refrakt-md/highlight';
import type { RendererNode } from '@refrakt-md/types';
import { scanInProgressBlocks, type InProgressBlock } from './block-scanner.js';

let hlTransform: ((tree: RendererNode) => RendererNode) | null = null;
let hlCss = '';

/**
 * Initialize syntax highlighting. Call once on app startup.
 * Loads Shiki WASM — async, but subsequent calls are instant (cached).
 */
export async function initHighlight(): Promise<void> {
	const hl = await createHighlightTransform({
		theme: { light: 'laserwave', dark: 'laserwave' },
	});
	hlTransform = hl;
	hlCss = hl.css;
}

/**
 * Run a Markdoc string through the full refrakt.md rendering pipeline.
 * Returns a RendererNode tree ready for Renderer.svelte.
 */
export function renderMarkdoc(source: string): RendererNode {
	// 1. Parse Markdoc → AST
	const ast = Markdoc.parse(source);

	// 2. Transform with rune schemas (reinterpret children, emit typeof markers)
	// Pass __source so sandbox/preview can extract raw HTML via node.lines
	const renderable = Markdoc.transform(ast, { tags, nodes, variables: { __source: source } });

	// 3. Serialize (Markdoc Tag instances → plain JSON objects)
	const serialized = serializeTree(renderable) as RendererNode;

	// 4. Identity transform (BEM classes, structural injection, meta consumption)
	const transformed = identityTransform(serialized);

	// 5. Syntax highlighting (find data-language elements, apply Shiki)
	return hlTransform ? hlTransform(transformed) : transformed;
}

/**
 * Get the CSS needed for syntax highlight themes.
 * Returns empty string if highlight hasn't been initialized.
 */
export function getHighlightCss(): string {
	return hlCss;
}

export interface RenderResult {
	renderable: RendererNode | null;
	inProgressBlocks: InProgressBlock[];
	degraded: boolean;
	errors: string[];
}

/**
 * Render with graceful degradation chain. Never throws.
 *
 * Tier 1: Full pipeline (parse + rune schemas + identity transform + highlight)
 * Tier 2: Parse-only (basic Markdown, no rune schemas)
 * Tier 3: Return null (caller shows raw text)
 */
export function renderMarkdocSafe(source: string): RenderResult {
	const inProgressBlocks = scanInProgressBlocks(source);
	const errors: string[] = [];

	// Tier 1: Full pipeline
	try {
		const renderable = renderMarkdoc(source);
		return { renderable, inProgressBlocks, degraded: false, errors };
	} catch (err) {
		errors.push(`Full pipeline failed: ${err instanceof Error ? err.message : String(err)}`);
	}

	// Tier 2: Parse-only (Markdoc without rune schemas → basic Markdown)
	try {
		const ast = Markdoc.parse(source);
		const renderable = Markdoc.transform(ast, {});
		const serialized = serializeTree(renderable) as RendererNode;
		const result = hlTransform ? hlTransform(serialized) : serialized;
		return { renderable: result, inProgressBlocks, degraded: true, errors };
	} catch (err) {
		errors.push(`Markdown fallback failed: ${err instanceof Error ? err.message : String(err)}`);
	}

	// Tier 3: Unparseable — caller shows raw text
	return { renderable: null, inProgressBlocks, degraded: true, errors };
}
