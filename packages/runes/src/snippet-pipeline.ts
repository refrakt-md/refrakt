/**
 * Snippet pipeline hooks (SPEC-062, WORK-304).
 *
 * - **Preprocess** walks the parsed Markdoc AST, finds every `{% snippet %}`
 *   tag, resolves + slices its source file, and replaces the tag with a
 *   Markdoc `fence` node. The fence carries `content` + `language` (so
 *   the existing code-block transform syntax-highlights it identically to
 *   a triple-backtick fence) plus `source` / `lines` + author-set
 *   `linenumbers` / `highlight` annotations (WORK-304). The fence schema
 *   renders them as `data-source` / `data-lines` / `data-linenumbers` /
 *   `data-highlight-lines` on the output `<pre>` + `<code>`.
 *
 * - **PostProcess** walks the rendered renderable tree, finds every `<pre>`
 *   element carrying `data-source`, and — when not nested under a
 *   fence-consuming container (`data-rune="code-group"`, `data-rune="diff"`)
 *   — wraps it in `<figure class="rf-snippet">` so themes can style snippet
 *   blocks distinctly from regular code blocks (and tooling can find
 *   `data-source-path` on the figure).
 *
 * This separation is the SPEC-062 composition story: container runes see
 * snippet output as a regular fence (because preprocess made it one) and
 * consume it transparently; standalone snippets get the figure chrome via
 * the wrap step. Captions / titles are intentionally not provided — wrap
 * a snippet in `{% codegroup title="..." %}` if you want a labelled chrome.
 */

import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import type { ProjectFiles, PreprocessContext, PreprocessPage, PipelineContext, TransformedPage, AggregatedData } from '@refrakt-md/types';
import { readSnippetFile, SnippetSandboxError } from './lib/read-file.js';
import { inferLanguage } from './lang-map.js';

const { Ast, Tag } = Markdoc;

/** Resolve a Markdoc attribute value to a string. Handles literal strings
 *  and Markdoc `Variable` AST nodes (e.g. `path=$file.path` parses as a
 *  Variable, not a string). Unresolvable references (variable missing from
 *  the context, or attribute is some other AST shape) return an empty
 *  string — matching transform-time variable-evaluation behaviour. */
function resolveAttributeValue(value: unknown, variables: Record<string, unknown> | undefined): string {
	if (value === undefined || value === null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (typeof value === 'object' && '$$mdtype' in (value as Record<string, unknown>)) {
		const node = value as { $$mdtype: string; path?: unknown };
		if (node.$$mdtype === 'Variable' && Array.isArray(node.path)) {
			let current: unknown = variables;
			for (const segment of node.path as string[]) {
				if (current === null || current === undefined) return '';
				current = (current as Record<string, unknown>)[segment];
			}
			return current === null || current === undefined ? '' : String(current);
		}
	}
	return '';
}

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
	if (!ctx.sandbox) {
		// No file provider available (e.g. a tree-mode build that hasn't wired
		// one yet) — silently no-op. Snippet refs fall through to the schema's
		// transform, which throws a clear error.
		return;
	}

	let mutated = false;
	walkAndReplaceSnippets(ast, page, ctx, ctx.sandbox, (didReplace) => {
		if (didReplace) mutated = true;
	});
	return mutated ? ast : undefined;
}

function walkAndReplaceSnippets(
	node: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	files: ProjectFiles,
	onReplaced: (replaced: boolean) => void,
): void {
	if (!node.children) return;

	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];

		if (child.type === 'tag' && child.tag === 'snippet') {
			// Always produce a fence — successful resolution returns the
			// real fence; sandbox / missing-file / variable-resolution errors
			// produce an error fence so the snippet tag never reaches the
			// schema's transform (which throws). The build keeps going and
			// the failure is visible on the rendered page.
			node.children[i] = resolveSnippetToFence(child, page, ctx, files);
			onReplaced(true);
			// Don't recurse — replaced.
			continue;
		}

		walkAndReplaceSnippets(child, page, ctx, files, onReplaced);
	}
}

/** Build a `fence` AST node that renders a clear error message in place of
 *  the snippet. Used when resolution fails (sandbox, missing file, malformed
 *  lines, unresolvable variable reference). The fence carries the original
 *  attempted path in `source` so tooling can still detect snippet
 *  provenance, plus a `data-snippet-error` raw data-attr that's
 *  forwarded through the fence transform for the error styling hook. */
function makeErrorFence(pathAttr: string, message: string): Node {
	return new Ast.Node('fence', {
		content: `snippet error: ${message}\n`,
		language: 'text',
		source: pathAttr || '(unresolved)',
		'data-snippet-error': message,
	});
}

function resolveSnippetToFence(
	tag: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	files: ProjectFiles,
): Node {
	const pathAttr = resolveAttributeValue(tag.attributes.path, ctx.variables);
	const lines = tag.attributes.lines !== undefined
		? resolveAttributeValue(tag.attributes.lines, ctx.variables)
		: undefined;
	const langAttr = tag.attributes.lang !== undefined
		? resolveAttributeValue(tag.attributes.lang, ctx.variables)
		: undefined;
	// WORK-304 — propagate author-set fence-level annotations from the
	// snippet rune through to the fence node. The fence schema renders
	// them as `data-linenumbers` / `data-highlight-lines`. `linenumbers`
	// arrives as a Boolean from the rune schema; `highlight` as a String.
	const linenumbers = tag.attributes.linenumbers === true;
	const highlight = tag.attributes.highlight !== undefined
		? resolveAttributeValue(tag.attributes.highlight, ctx.variables)
		: undefined;

	if (!pathAttr) {
		const msg = 'snippet `path` attribute is required (and an unresolvable variable reference resolves to empty)';
		ctx.error(msg, page.url);
		return makeErrorFence('', msg);
	}

	let result;
	try {
		result = readSnippetFile({
			files,
			pathAttr,
			lines: lines || undefined,
			referencingPage: page.relativePath,
		});
	} catch (err) {
		if (err instanceof SnippetSandboxError) {
			ctx.error(err.message, page.url);
			return makeErrorFence(pathAttr, err.message);
		}
		// Unexpected error type — still produce an error fence so the build
		// doesn't crash on a single page.
		const msg = (err as Error).message ?? String(err);
		ctx.error(`snippet "${pathAttr}" failed unexpectedly: ${msg}`, page.url);
		return makeErrorFence(pathAttr, msg);
	}

	for (const warning of result.warnings) {
		ctx.warn(warning, page.url);
	}

	const language = (langAttr && langAttr.length > 0) ? langAttr : inferLanguage(result.relativePath);

	// WORK-304 — write unprefixed `source` / `lines` directly. The fence
	// schema renders them as `data-source` / `data-lines`. `linenumbers` /
	// `highlight` are propagated from the rune attributes (file-coordinate
	// semantics — see WORK-304 acceptance criteria).
	const fenceAttrs: Record<string, unknown> = {
		content: result.content,
		language,
		source: result.relativePath,
	};
	if (lines) fenceAttrs.lines = lines;
	if (linenumbers) fenceAttrs.linenumbers = true;
	if (highlight && highlight.length > 0) fenceAttrs.highlight = highlight;

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
		(tag.attributes as Record<string, unknown> | undefined)?.['data-source'] !== undefined &&
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
	const source = String(attrs['data-source'] ?? '');
	const linesAttr = attrs['data-lines'] !== undefined ? String(attrs['data-lines']) : undefined;

	const figureAttrs: Record<string, unknown> = {
		class: 'rf-snippet',
		'data-rune': 'snippet',
		'data-source-path': source,
	};
	if (linesAttr) figureAttrs['data-lines'] = linesAttr;

	return new Tag('figure', figureAttrs, [preTag] as any[]);
}
