import type { Node, Schema } from '@markdoc/markdoc';
import type { PreprocessContext, PreprocessPage } from '@refrakt-md/types';

/**
 * Per-rune preprocessing (SPEC-141).
 *
 * A rune that resolves itself before the transform — `include`, `snippet`,
 * `data` — declares a `preprocess` hook on its schema, beside `transform`.
 * One walk ({@link preprocessTree}) visits the page AST and dispatches to the
 * hook of whichever tag it meets. The ordering between preprocessors is not
 * stated anywhere: it is tree order.
 *
 * That is a valid order because the producer/consumer graph is acyclic by
 * construction. `include` pastes a file's AST and `data` clones its row
 * template **at their own node**, so anything they produce is below that point
 * and the walk meets it next. Nothing runs the other way: `snippet` resolves to
 * a `fence`, whose content is raw text that is never re-parsed as Markdoc.
 */

/** The context a rune's `preprocess` hook receives. */
export interface RunePreprocessContext extends PreprocessContext {
	/**
	 * The nodes enclosing the one being preprocessed, outermost first — the
	 * page's `document` node is always the first entry, and the direct parent
	 * is the last (SPEC-141 D4). A replacement is not an ancestor of what it
	 * contains: by the time the walk descends into it, the tag is gone.
	 */
	readonly ancestors: readonly Node[];
}

/**
 * A rune's preprocess hook (SPEC-141 D1).
 *
 * Receives the rune's own tag node — not the tree. Returning a node replaces
 * the tag with it; returning an array splices those nodes in its place (an
 * empty array removes the tag); returning nothing leaves it alone. The walk
 * then continues into whatever is now at that position, so the hook never has
 * to resolve the tags its own output contains.
 */
export type RunePreprocess = (
	node: Node,
	page: PreprocessPage,
	ctx: RunePreprocessContext,
) => Node | Node[] | void;

/**
 * Schema → its rune's preprocess hook. Recorded by `createContentModelSchema`
 * and kept off the Markdoc schema object, the same shape as
 * `schemaRuneStructures`: Markdoc never reads it, and only {@link preprocessTree}
 * does.
 */
export const schemaPreprocessors = new WeakMap<Schema, RunePreprocess>();

/**
 * Resolve every preprocessing rune in a page AST, in tree order.
 *
 * `schemas` is the page's tag table — the same `tags` the transform will use,
 * core and plugin runes merged — and any of them that declares a `preprocess`
 * hook takes part. Mutates `ast` in place; returns it when anything changed,
 * and nothing otherwise, matching the `PluginPipelineHooks.preprocess` contract.
 *
 * **The walk descends into a replacement** (SPEC-141 D3). After a hook
 * replaces its tag, the walk revisits the same position, so a producer's
 * output is resolved where it lands: a `{% snippet %}` in a `{% data %}` row
 * template is reached after the row is bound (BUG-027), and a subquery `data`
 * per outer row. Termination needs no depth limit: `include` leaves no
 * `include` tags behind (it expands nested ones itself, under its cycle
 * stack), `data`'s output consumes one level of the authored body per pass,
 * and `snippet`'s fence contains no tags at all.
 */
export function preprocessTree(
	ast: Node,
	page: PreprocessPage,
	ctx: PreprocessContext,
	schemas: Record<string, unknown>,
): Node | void {
	const hooks = new Map<string, RunePreprocess>();
	for (const [name, schema] of Object.entries(schemas)) {
		if (!schema || typeof schema !== 'object') continue;
		const hook = schemaPreprocessors.get(schema as Schema);
		if (hook) hooks.set(name, hook);
	}
	if (hooks.size === 0) return;

	let mutated = false;
	const ancestors: Node[] = [];

	const walk = (parent: Node): void => {
		const children = parent.children;
		if (!children || children.length === 0) return;
		ancestors.push(parent);
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			const hook = child.type === 'tag' && child.tag ? hooks.get(child.tag) : undefined;
			if (hook) {
				// A prototype link rather than a spread, so a context whose
				// diagnostics are methods on a class keeps them.
				const hookCtx = Object.create(ctx, {
					ancestors: { value: [...ancestors], enumerable: true },
				}) as RunePreprocessContext;
				const result = hook(child, page, hookCtx);
				// Returning the node itself is "leave it alone" too — treating it as
				// a replacement would revisit it forever.
				if (result !== undefined && result !== child) {
					const replacement = Array.isArray(result) ? result : [result];
					children.splice(i, 1, ...replacement);
					mutated = true;
					// Revisit this position: the walk descends into the replacement.
					i--;
					continue;
				}
			}
			walk(child);
		}
		ancestors.pop();
	};

	walk(ast);
	return mutated ? ast : undefined;
}
