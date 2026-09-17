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

	// The child keys this row retypes. A parent source must not be judged
	// resolved by a stamp that a *child* row produced: `playlist` maps `headline`
	// and its items map `track-name`, both to `name`, and looking at the whole
	// tree would let either cover for the other's typo.
	const childNames = new Set(row.children.map((c) => c.rune));

	const unresolved: UnresolvedSource[] = [];
	for (const entry of row.properties) {
		// A generated value has no source to resolve — that is what makes it
		// generated.
		if (entry.kind === 'generated') continue;

		// A `children:` mapping names sources on nodes *another rune* emitted, with
		// their own attributes and their own bag. Auditing those against this
		// rune's tree and this rune's declared attributes reports every one of them
		// as broken — which is how a check stops being read. Resolve them against
		// the children themselves, and say nothing when the input contains none:
		// that is "this fixture did not exercise it", not "this row is wrong".
		if (entry.scope === 'child' && entry.entity) {
			const children = findChildren(tree, entry.entity);
			if (children.length === 0) continue;
			// The most direct evidence there is: the property this row maps to is
			// stamped on the child, so the source resolved to *something*. The
			// applier clears a retyped child's stamps before re-applying, so
			// anything present came from this row.
			if (children.some((c) => hasProperty(c, entry.property, childNames))) continue;
			if (children.some((c) => findByName(c as never, entry.source))) continue;
			if (children.some((c) => Object.hasOwn(collectBags(c), entry.source))) continue;
			unresolved.push({ source: entry.source, property: entry.property, entity: entry.entity });
			continue;
		}

		// The same evidence for the rune's own sources, and for a rebuilt one it is
		// the only evidence left: the identity transform consumes
		// `data-rune-fields`, and this audit reads the rendered tree, so a source
		// the applier recovered from the bag leaves no trace of the bag behind —
		// only the carrier it built. Children are excluded, per `childNames`.
		if (hasProperty(tree, entry.property, childNames)) continue;
		if (findByName(tree as never, entry.source)) continue;
		if (Object.hasOwn(bag, entry.source)) continue;
		if (declared.has(entry.source) || declared.has(kebab(entry.source))) continue;
		unresolved.push({ source: entry.source, property: entry.property, entity: entry.entity });
	}
	return unresolved;
}

/**
 * Does any node in this subtree carry `property="<name>"`?
 *
 * `skip` names child keys whose subtrees are somebody else's row to answer for;
 * a node matching one is not descended into, and is itself skipped unless it is
 * the subtree being asked about.
 */
function hasProperty(
	node: unknown,
	property: string,
	skip = new Set<string>(),
	top = true,
): boolean {
	if (Array.isArray(node)) return node.some((c) => hasProperty(c, property, skip, top));
	if (!node || typeof node !== 'object') return false;
	const attrs = (node as { attributes?: Record<string, unknown> }).attributes ?? {};
	if (!top && skip.size > 0 && isChildOf(attrs, skip)) return false;
	if (attrs.property === property) return true;
	return ((node as { children?: unknown[] }).children ?? []).some((c) =>
		hasProperty(c, property, skip, false),
	);
}

const isChildOf = (attrs: Record<string, unknown>, names: Set<string>) =>
	names.has(attrs['data-rune'] as string) ||
	names.has(attrs['data-name'] as string) ||
	names.has(attrs['data-field'] as string);

/**
 * The nodes a `children:` row applies to — the same match the applier makes.
 *
 * Kept in step with `findChildren` in the applier deliberately: an audit that
 * looked in different nodes than the mechanism does would report on a population
 * nobody maps.
 */
function findChildren(node: unknown, name: string, out: unknown[] = []): unknown[] {
	if (Array.isArray(node)) {
		for (const c of node) findChildren(c, name, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	const attrs = (node as { attributes?: Record<string, unknown> }).attributes ?? {};
	if (attrs['data-rune'] === name || attrs['data-name'] === name || attrs['data-field'] === name) {
		out.push(node);
	}
	for (const c of (node as { children?: unknown[] }).children ?? []) findChildren(c, name, out);
	return out;
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
