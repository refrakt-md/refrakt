import { findByName } from '@refrakt-md/runes';
import type { ResolvedSchemaRow } from '@refrakt-md/runes';

/**
 * Audit a resolved schema row against what a rune actually renders — WORK-566.
 *
 * The describing half lives in `@refrakt-md/runes`, beside the tables, so the
 * contract artifact and its drift test share one implementation. This half stays
 * here because it needs a *rendered tree*, which only the CLI has.
 */

/** A table row naming a source the rune does not emit. */
export interface UnresolvedSource {
	source: string;
	property: string;
	entity?: string;
}

/**
 * Find sources the rune's rendered output does not provide.
 *
 * Mechanically checkable, unlike a wrong schema.org type — which is exactly why
 * it is worth a tool. A table naming a `data-name` the rune never emits is the
 * failure mode WORK-561 exists to prevent and that every later migration can
 * reintroduce, and it fails *silently*: the property is simply absent from the
 * published graph.
 *
 * A source resolves if a node carries the name, or if the field bag has it —
 * the same two routes the applier has, checked the same way.
 */
export function auditSchemaSources(
	row: ResolvedSchemaRow,
	tree: unknown,
	declaredAttributes: string[] = [],
): UnresolvedSource[] {
	const bag = collectBags(tree);
	// A source is resolvable if the rune *can* emit it, not merely if this one
	// fixture did. An optional attribute the fixture leaves unset — `rating` on
	// `testimonial` — produces no node and no bag entry, and flagging that would
	// report the table as broken when it is correct and the input is simply
	// minimal. Matching the rune's declared attributes is what separates "this
	// input did not exercise it" from the failure mode actually worth catching:
	// a source name that is a typo or a rename, which resolves to nothing ever.
	const declared = new Set<string>();
	for (const name of declaredAttributes) {
		declared.add(name);
		declared.add(kebab(name));
	}

	const unresolved: UnresolvedSource[] = [];
	for (const entry of row.properties) {
		// A generated value has no source to resolve — that is what makes it
		// generated.
		if (entry.kind === 'generated') continue;
		if (findByName(tree as never, entry.source)) continue;
		if (Object.hasOwn(bag, entry.source)) continue;
		if (declared.has(entry.source) || declared.has(kebab(entry.source))) continue;
		unresolved.push({ source: entry.source, property: entry.property, entity: entry.entity });
	}
	return unresolved;
}

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Every `data-rune-fields` bag in the tree, merged. */
function collectBags(node: unknown, into: Record<string, unknown> = {}): Record<string, unknown> {
	if (Array.isArray(node)) {
		for (const child of node) collectBags(child, into);
		return into;
	}
	if (!node || typeof node !== 'object') return into;
	const attrs = (node as { attributes?: Record<string, unknown> }).attributes;
	const raw = attrs?.['data-rune-fields'];
	if (typeof raw === 'string') {
		try {
			Object.assign(into, JSON.parse(raw));
		} catch {
			// A malformed bag is a defect elsewhere; the audit reports the sources
			// it could not resolve either way.
		}
	}
	for (const child of (node as { children?: unknown[] }).children ?? []) collectBags(child, into);
	return into;
}
