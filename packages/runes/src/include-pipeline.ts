/**
 * Include pipeline hook (SPEC-129).
 *
 * The first preprocess step: walk the parsed AST and replace every
 * `{% include %}` tag with the referenced partial's AST, cloned and with the
 * tag's `variables` substituted. It runs **before** `preprocessSnippets` and
 * `preprocessData` so a `data` or `snippet` inside the pasted file is in the
 * tree when those hooks walk it — the case `{% partial %}` cannot serve,
 * because Markdoc expands partials during the transform.
 *
 * Three properties are load-bearing:
 *
 * - **Splice, never wrap.** One include produces N nodes and they land as
 *   direct siblings. A container to keep the replacement 1:1 breaks
 *   composition invisibly: measured in SPEC-127, `{% section %}` and
 *   `{% grid %}` consume their children, so wrapped content vanishes with no
 *   error. Same constraint, same reason, as the `data` per-row body.
 *
 * - **Always clone.** The partial ASTs are parsed once per build and shared by
 *   every page that references them. The later preprocessors mutate the tree in
 *   place, so pasting the shared nodes would let one page's `data` resolution
 *   leak into the next page's copy.
 *
 * - **Substitute, don't scope.** `partial` binds variables into a
 *   transform-time scope, which is precisely what a preprocessor attribute
 *   cannot read. `include` rewrites `Variable` nodes in the cloned AST at paste
 *   time — the same thing `bindRow` does for `$row` — so a binding reaches
 *   `{% data where=$q %}`. Variables the include does not bind are left alone
 *   and resolve at transform against the page's own variables.
 *
 * Failures render a visible error callout and record a build error rather than
 * throwing, matching `data`: one bad include does not take out the build, and
 * the failure is on the page where the author will see it.
 */

import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import type { PreprocessContext, PreprocessPage } from '@refrakt-md/types';
import { emitErrorNode } from './data-emit.js';

const { Ast } = Markdoc;

/**
 * How deep includes may nest.
 *
 * A cycle is caught by name before this ever fires — the stack check below is
 * the real guard. This bounds the other shape: a chain of distinct files deep
 * enough that it is a mistake rather than a structure anyone meant to author.
 */
export const MAX_INCLUDE_DEPTH = 16;

/**
 * Preprocess: splice every `{% include %}` tag away. No-op when no partials are
 * available (a tree-mode build with none wired), matching how snippet and data
 * no-op without a sandbox — the tag then falls through to its schema transform,
 * which names the wiring.
 */
export function preprocessIncludes(
	ast: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
): Node | void {
	const partials = (ctx as { partials?: Record<string, unknown> }).partials;
	if (!partials) return;
	let mutated = false;
	walkAndReplaceIncludes(ast, page, ctx, partials, () => { mutated = true; }, []);
	return mutated ? ast : undefined;
}

function walkAndReplaceIncludes(
	node: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	partials: Record<string, unknown>,
	onReplaced: () => void,
	stack: string[],
): void {
	if (!node.children) return;
	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		if (child.type === 'tag' && child.tag === 'include') {
			const replacement = resolveInclude(child, page, ctx, partials, stack);
			node.children.splice(i, 1, ...replacement);
			// Skip the pasted nodes: nested includes inside them were already
			// expanded by `resolveInclude`, under the cycle stack that names the
			// chain. Re-walking here would expand them a second time with an empty
			// stack, which is exactly how a cycle becomes an infinite paste.
			i += replacement.length - 1;
			onReplaced();
			continue;
		}
		walkAndReplaceIncludes(child, page, ctx, partials, onReplaced, stack);
	}
}

function fail(ctx: PreprocessContext, page: PreprocessPage, message: string): Node[] {
	ctx.error(`include: ${message}`, page.url);
	return [emitErrorNode(`include error: ${message}`)];
}

function resolveInclude(
	tag: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	partials: Record<string, unknown>,
	stack: string[],
): Node[] {
	const file = resolveValue(tag.attributes?.file, ctx.variables);
	if (typeof file !== 'string' || file.length === 0) {
		return fail(ctx, page, 'the `file` attribute is required (an unresolvable variable reference resolves to empty)');
	}

	if (stack.includes(file)) {
		return fail(ctx, page, `cycle — ${[...stack, file].join(' → ')}`);
	}
	if (stack.length >= MAX_INCLUDE_DEPTH) {
		return fail(
			ctx,
			page,
			`nested more than ${MAX_INCLUDE_DEPTH} deep — ${[...stack, file].join(' → ')}`,
		);
	}

	const source = partials[file];
	if (!source || typeof source !== 'object') {
		const known = Object.keys(partials).sort();
		const available = known.length > 0
			? ` Available: ${known.join(', ')}.`
			: ' No partials are registered for this site.';
		return fail(
			ctx,
			page,
			`"${file}" was not found in \`_partials/\` or any registered file root.${available}`,
		);
	}

	const bindings = resolveVariables(tag.attributes?.variables, ctx.variables);
	const pasted = (source as Node).children ?? [];
	const children = pasted.map((child) => cloneWithBindings(child, bindings));

	// Expand nested includes inside what was just pasted, under a stack carrying
	// this file — so a cycle is reported by name instead of overflowing.
	if (children.length > 0) {
		const container = new Ast.Node('document', {}, children);
		walkAndReplaceIncludes(container, page, ctx, partials, () => {}, [...stack, file]);
		return container.children;
	}
	return children;
}

/**
 * Clone a node, substituting bound variables.
 *
 * `$q` reaches the AST as a `Variable` in a node's *attributes* — on a tag
 * (`where=$q`) and equally on a `text` node, where `{% $q %}` becomes
 * `content: Variable(['q'])`. One rule covers both, exactly as `bindRow` does.
 */
function cloneWithBindings(node: Node, bindings: Record<string, unknown>): Node {
	const attributes: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(node.attributes ?? {})) {
		attributes[key] = substitute(value, bindings);
	}
	const children = (node.children ?? []).map((child) => cloneWithBindings(child, bindings));
	const copy = new Ast.Node(node.type, attributes, children, node.tag);
	// The constructor takes four fields; everything else Markdoc's parser sets
	// has to be carried across by hand. `inline` decides whether a node renders
	// inline, and `annotations` carries `{% .class #id %}` shorthand — dropping
	// either changes the output silently.
	if (node.lines) copy.lines = node.lines;
	if (node.location) copy.location = node.location;
	copy.inline = node.inline;
	if (node.annotations?.length) copy.annotations = node.annotations;
	if (node.slots && Object.keys(node.slots).length > 0) {
		copy.slots = Object.fromEntries(
			Object.entries(node.slots).map(([k, v]) => [k, cloneWithBindings(v, bindings)]),
		);
	}
	return copy;
}

/**
 * Replace a `Variable` node whose root segment the include binds.
 *
 * Unbound variables pass through untouched rather than resolving to empty: the
 * pasted AST is page content now, so `$page.slug` and friends still resolve at
 * transform against the page's own variables. That is a capability `partial`
 * does not have — its scope *replaces* the variable surface.
 */
function substitute(value: unknown, bindings: Record<string, unknown>): unknown {
	if (!value || typeof value !== 'object') return value;
	const node = value as { $$mdtype?: string; path?: unknown };
	if (node.$$mdtype === 'Variable' && Array.isArray(node.path) && node.path.length > 0) {
		const [root, ...rest] = node.path as string[];
		if (!(root in bindings)) return value;
		let current: unknown = bindings[root];
		for (const segment of rest) {
			if (current === null || current === undefined) return '';
			current = (current as Record<string, unknown>)[segment];
		}
		return current === null || current === undefined ? '' : current;
	}
	return value;
}

/** The include's own `variables={...}`, with any page-variable references in
 *  its values resolved before they are substituted into the pasted AST. */
function resolveVariables(
	raw: unknown,
	pageVariables: Record<string, unknown> | undefined,
): Record<string, unknown> {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		out[key] = resolveValue(value, pageVariables);
	}
	return out;
}

/** Resolve an attribute value against the page's variables — literals pass
 *  through, `Variable` nodes are looked up. Mirrors snippet's and data's
 *  resolvers; anything else (a `Function` node) resolves to empty — the same
 *  silent-empty behaviour BUG-010 tracks for `data`'s `where`. */
function resolveValue(value: unknown, variables: Record<string, unknown> | undefined): unknown {
	if (value === undefined || value === null) return '';
	if (typeof value !== 'object') return value;
	const node = value as { $$mdtype?: string; path?: unknown };
	if (node.$$mdtype === 'Variable' && Array.isArray(node.path)) {
		let current: unknown = variables;
		for (const segment of node.path as string[]) {
			if (current === null || current === undefined) return '';
			current = (current as Record<string, unknown>)[segment];
		}
		return current === null || current === undefined ? '' : current;
	}
	if (node.$$mdtype === undefined) return value;
	return '';
}
