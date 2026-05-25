/**
 * Deferred-body capture (SPEC-070).
 *
 * Some runes (collection, …) use their body as a *per-entity template*: the
 * body contains `$item` references that must stay unresolved until postProcess
 * binds a real entity. But by the time a rune's `transform` runs, Markdoc has
 * already resolved the body's inline variables to `undefined` — so the source
 * is unrecoverable there (confirmed by the SPEC-070 prototype).
 *
 * The fix: a pre-transform pass on the *pristine* parsed AST captures a
 * deferBody rune's children as a source string, stashes it on an attribute,
 * and empties the body so the page transform never touches `$item`. postProcess
 * then re-parses that source and transforms it once per entity with the
 * variable bound. The reparse is mandatory — reusing the captured AST resolves
 * every variable to `null`.
 */
import Markdoc from '@markdoc/markdoc';
import type { Node, Config, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast } = Markdoc;

/** Attribute the captured body source is stashed on. */
export const DEFERRED_BODY_ATTR = '__deferred-body';

/**
 * Walk a freshly-parsed AST and, for every tag whose name `isDeferBody`,
 * format its children to a markdoc source string, stash it on
 * `DEFERRED_BODY_ATTR`, and empty the body. Mutates the AST in place.
 */
export function captureDeferredBodies(ast: Node, isDeferBody: (tagName: string) => boolean): void {
	const targets: Node[] = [];
	for (const node of ast.walk()) {
		if (node.type === 'tag' && node.tag && isDeferBody(node.tag) && node.children.length > 0) {
			targets.push(node);
		}
	}
	for (const node of targets) {
		const doc = new Ast.Node('document', {}, node.children);
		node.attributes[DEFERRED_BODY_ATTR] = Markdoc.format(doc);
		node.children = [];
	}
}

/** Read the stashed body source off a resolved attribute set, if present. */
export function readDeferredBody(attrs: Record<string, unknown>): string | undefined {
	const v = attrs[DEFERRED_BODY_ATTR];
	return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/**
 * Re-parse a stashed template source and transform it with extra variables
 * bound (e.g. `{ item }`). Uses the build's full tags+nodes config so any rune
 * the template invokes transforms normally. A fresh parse per call keeps each
 * render independent.
 */
export function transformDeferredTemplate(
	source: string,
	config: Partial<Config> | undefined,
	variables: Record<string, unknown>,
): RenderableTreeNodes {
	const ast = Markdoc.parse(source);
	const merged = {
		...(config ?? {}),
		variables: { ...((config?.variables as Record<string, unknown>) ?? {}), ...variables },
	} as Config;
	return Markdoc.transform(ast, merged);
}
