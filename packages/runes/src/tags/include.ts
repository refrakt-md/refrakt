import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import type { PreprocessContext, PreprocessPage } from '@refrakt-md/types';
import { createContentModelSchema } from '../lib/index.js';
import { emitErrorNode } from '../data-emit.js';

const { Ast } = Markdoc;

export const MAX_INCLUDE_DEPTH = 16;

function preprocessInclude(tag: Node, page: PreprocessPage, ctx: PreprocessContext): Node[] | void {
	const partials = (ctx as { partials?: Record<string, unknown> }).partials;
	if (!partials) return;
	return resolveInclude(tag, page, ctx, partials, []);
}

function walkAndReplaceIncludes(
	node: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	partials: Record<string, unknown>,
	stack: string[],
): void {
	if (!node.children) return;
	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		if (child.type === 'tag' && child.tag === 'include') {
			const replacement = resolveInclude(child, page, ctx, partials, stack);
			node.children.splice(i, 1, ...replacement);
			i += replacement.length - 1;
			continue;
		}
		walkAndReplaceIncludes(child, page, ctx, partials, stack);
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
		return fail(
			ctx,
			page,
			'the `file` attribute is required (an unresolvable variable reference resolves to empty)',
		);
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
		const available =
			known.length > 0
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

	if (children.length > 0) {
		const container = new Ast.Node('document', {}, children);
		walkAndReplaceIncludes(container, page, ctx, partials, [...stack, file]);
		return container.children;
	}
	return children;
}

function cloneWithBindings(node: Node, bindings: Record<string, unknown>): Node {
	const attributes: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(node.attributes ?? {})) {
		attributes[key] = substitute(value, bindings);
	}
	const children = (node.children ?? []).map((child) => cloneWithBindings(child, bindings));
	const copy = new Ast.Node(node.type, attributes, children, node.tag);
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

export const include = createContentModelSchema({
	attributes: {
		file: {
			type: String,
			required: true,
			description:
				'Partial to paste, by the same key `{% partial %}` uses — a path under the site\'s `_partials/` (e.g. "attrs.md") or a namespaced file root ("shared:attrs.md").',
		},
		variables: {
			type: Object,
			required: false,
			description:
				'Bindings substituted into the pasted AST at paste time, e.g. variables={q: "rune:card"} makes `$q` inside the file that string. Unlike `partial`, this is substitution rather than a transform-time scope, so bound values reach preprocessor attributes such as `{% data where=$q %}`.',
		},
	},
	contentModel: { type: 'sequence', fields: [] },
	preprocess: preprocessInclude,
	transform(_resolved, _attrs) {
		throw new Error(
			'{% include %} reached the transform phase unresolved — its preprocess hook was not ' +
				'wired through. Ensure the content pipeline runs registered `preprocess` hooks before ' +
				"`Markdoc.transform` (include pastes its file's AST).",
		);
	},
});
