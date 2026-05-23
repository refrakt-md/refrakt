/**
 * Snippet pipeline hooks (SPEC-062).
 *
 * - **Preprocess** walks the parsed Markdoc AST, finds every `{% snippet %}`
 *   tag, resolves + slices its source file, and replaces the tag with a
 *   Markdoc `fence` node. The fence carries `content` and `language` (so
 *   the existing code-block transform syntax-highlights it identically to
 *   a triple-backtick fence) plus `data-snippet-source` / `data-snippet-title`
 *   / `data-snippet-lines` attributes for downstream tooling and the wrap
 *   step.
 *
 * - **PostProcess** walks the rendered renderable tree, finds every `<pre>`
 *   element carrying `data-snippet-source`, and — when not nested under a
 *   fence-consuming container (`data-rune="code-group"`, `data-rune="diff"`)
 *   — wraps it in `<figure class="rf-snippet">` with an optional
 *   `<figcaption>` populated from `data-snippet-title`.
 *
 * This separation is the SPEC-062 composition story: container runes see
 * snippet output as a regular fence (because preprocess made it one) and
 * consume it transparently; standalone snippets get the figure+caption
 * chrome via the wrap step.
 */

import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import type { PreprocessContext, PreprocessPage, PipelineContext, TransformedPage, AggregatedData } from '@refrakt-md/types';
import { readSnippetFile, SnippetSandboxError } from './lib/read-file.js';
import { inferLanguage } from './lang-map.js';

const { Ast, Tag } = Markdoc;

/** Containers whose output consumes their fence children — wrapping a
 *  snippet-derived `<pre>` inside them would be duplicate chrome. */
const FENCE_CONSUMING_CONTAINERS = new Set(['code-group', 'diff']);

/**
 * Preprocess: replace every `{% snippet %}` tag in the AST with a `fence`
 * node carrying the resolved file content. After this runs, no snippet
 * tags remain in the AST — only fences (some "snippet-derived" identified
 * by their `data-snippet-source` attribute).
 */
export function preprocessSnippets(
	ast: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
): Node | void {
	if (!ctx.projectRoot) {
		// No project root configured — silently no-op. Snippet refs will fall
		// through to the schema's transform, which throws a clear error.
		return;
	}

	let mutated = false;
	walkAndReplaceSnippets(ast, page, ctx, ctx.projectRoot, (didReplace) => {
		if (didReplace) mutated = true;
	});
	return mutated ? ast : undefined;
}

function walkAndReplaceSnippets(
	node: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	projectRoot: string,
	onReplaced: (replaced: boolean) => void,
): void {
	if (!node.children) return;

	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];

		if (child.type === 'tag' && child.tag === 'snippet') {
			const fence = resolveSnippetToFence(child, page, ctx, projectRoot);
			if (fence) {
				node.children[i] = fence;
				onReplaced(true);
			}
			// Don't recurse — replaced.
			continue;
		}

		walkAndReplaceSnippets(child, page, ctx, projectRoot, onReplaced);
	}
}

function resolveSnippetToFence(
	tag: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	projectRoot: string,
): Node | null {
	const pathAttr = String(tag.attributes.path ?? '');
	const lines = tag.attributes.lines !== undefined ? String(tag.attributes.lines) : undefined;
	const langAttr = tag.attributes.lang !== undefined ? String(tag.attributes.lang) : undefined;
	const titleAttr = tag.attributes.title !== undefined ? String(tag.attributes.title) : undefined;

	let result;
	try {
		result = readSnippetFile({
			pathAttr,
			projectRoot,
			lines,
			referencingPage: page.relativePath,
		});
	} catch (err) {
		if (err instanceof SnippetSandboxError) {
			ctx.error(err.message, page.url);
			return null;
		}
		throw err;
	}

	for (const warning of result.warnings) {
		ctx.warn(warning, page.url);
	}

	const language = langAttr ?? inferLanguage(result.relativePath);

	const fenceAttrs: Record<string, unknown> = {
		content: result.content,
		language,
		'data-snippet-source': result.relativePath,
	};
	if (titleAttr) fenceAttrs['data-snippet-title'] = titleAttr;
	if (lines) fenceAttrs['data-snippet-lines'] = lines;

	// Construct a fence Ast.Node. Markdoc parses ``` blocks as
	// new Ast.Node('fence', { content, language }) — same shape here.
	return new Ast.Node('fence', fenceAttrs);
}

/**
 * PostProcess: wrap standalone snippet-derived `<pre>` elements in the
 * snippet figure chrome. Run as part of `corePipelineHooks.postProcess`.
 *
 * Container-nested snippets (inside `<div data-rune="code-group">` or
 * `<div data-rune="diff">` outputs) are left alone — the container's chrome
 * is already there and the figure would be duplicate.
 */
export function wrapStandaloneSnippets(
	page: TransformedPage,
	_aggregated: AggregatedData,
	_ctx: PipelineContext,
): TransformedPage {
	const wrapped = walkAndWrap(page.renderable, /* containerAncestors */ false);
	if (wrapped === page.renderable) return page;
	return { ...page, renderable: wrapped };
}

function walkAndWrap(node: unknown, insideFenceContainer: boolean): unknown {
	if (Array.isArray(node)) {
		let mutated = false;
		const next = node.map((c) => {
			const w = walkAndWrap(c, insideFenceContainer);
			if (w !== c) mutated = true;
			return w;
		});
		return mutated ? next : node;
	}

	if (!Tag.isTag(node as never)) return node;
	const tag = node as InstanceType<typeof Tag>;

	const dataRune = (tag.attributes as Record<string, unknown> | undefined)?.['data-rune'];
	const enteredFenceContainer = typeof dataRune === 'string' && FENCE_CONSUMING_CONTAINERS.has(dataRune);
	const childAncestor = insideFenceContainer || enteredFenceContainer;

	// Wrap matching <pre> elements that aren't inside a fence-consuming container.
	if (
		tag.name === 'pre' &&
		(tag.attributes as Record<string, unknown> | undefined)?.['data-snippet-source'] !== undefined &&
		!insideFenceContainer
	) {
		return wrapPreInFigure(tag);
	}

	if (!tag.children || tag.children.length === 0) return tag;

	let mutated = false;
	const newChildren = tag.children.map((c) => {
		const w = walkAndWrap(c, childAncestor);
		if (w !== c) mutated = true;
		return w;
	});
	if (!mutated) return tag;

	return new Tag(tag.name, tag.attributes, newChildren as any[]);
}

function wrapPreInFigure(preTag: InstanceType<typeof Tag>): InstanceType<typeof Tag> {
	const attrs = preTag.attributes as Record<string, unknown>;
	const source = String(attrs['data-snippet-source'] ?? '');
	const title = attrs['data-snippet-title'] !== undefined ? String(attrs['data-snippet-title']) : undefined;
	const linesAttr = attrs['data-snippet-lines'] !== undefined ? String(attrs['data-snippet-lines']) : undefined;

	const figureChildren: unknown[] = [];
	if (title) {
		figureChildren.push(
			new Tag('figcaption', { class: 'rf-snippet__title' }, [title]),
		);
	}
	figureChildren.push(preTag);

	const figureAttrs: Record<string, unknown> = {
		class: 'rf-snippet',
		'data-rune': 'snippet',
		'data-source-path': source,
	};
	if (linesAttr) figureAttrs['data-lines'] = linesAttr;

	return new Tag('figure', figureAttrs, figureChildren as any[]);
}
