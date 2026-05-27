/**
 * Shared helpers for entity-listing runes (SPEC-070 / SPEC-072).
 *
 * Extracted from `collection-resolve.ts` so both `collection` and
 * `relationships` render from one implementation: entity field access, the
 * title link, sorting, grouping, and the per-item deferred-body reparse. The
 * pieces are source-agnostic — the caller supplies the item set and the
 * per-item template variables (so `relationships` can bind `$kind` alongside
 * `$item`).
 */
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, Node } from '@markdoc/markdoc';
import type { EntityRegistration } from '@refrakt-md/types';
import { resolveEntityField, type MatchableEntity } from './field-match.js';
import { transformDeferredTemplate } from './deferred-body.js';

const { Tag, Ast } = Markdoc;
type TagNode = InstanceType<typeof Tag>;

/** The three optional body zones (SPEC-072 Cap 5), split on top-level `hr`. */
export interface BodyZones {
	preamble?: string;
	template: string;
	fallback?: string;
}

/**
 * Split a captured body source on **top-level** `hr` (`---`) into zones,
 * card-style: 1 → template; 2 → preamble + template; 3 → preamble + template +
 * fallback. A leading empty zone skips the preamble. A `---` inside a nested
 * tag (e.g. `{% card %}`) is a child of that tag, not a top-level sibling, so
 * it is never a delimiter.
 */
export function splitBodyZones(bodySource: string): BodyZones {
	if (!bodySource) return { template: '' };
	const ast = Markdoc.parse(bodySource);
	const segments: Node[][] = [[]];
	for (const node of ast.children) {
		if (node.type === 'hr') segments.push([]);
		else segments[segments.length - 1].push(node);
	}
	if (segments.length === 1) return { template: bodySource };
	const src = (nodes: Node[]) => (nodes.length ? Markdoc.format(new Ast.Node('document', {}, nodes)) : '');
	const s = segments.map(src);
	if (s.length === 2) return { preamble: s[0] || undefined, template: s[1] };
	return { preamble: s[0] || undefined, template: s[1], fallback: s[2] || undefined };
}

/** Embed config threaded through the pipeline so deferred per-item templates
 *  can be re-transformed with the entity bound. */
export interface CollectionEmbedConfig {
	tags: Record<string, unknown>;
	nodes: Record<string, unknown>;
	projectRoot?: string;
	/** Explicit `(type → field → ordered values)` overrides (SPEC-072 / WORK-276),
	 *  used when presentation order differs from a rune's declaration order.
	 *  Defaults are otherwise derived from each rune's attribute `matches`. */
	orderings?: Record<string, Record<string, string[]>>;
}

/** Resolves a domain-aware order for an enum field, keyed by `(type, field)`
 *  (SPEC-072). Defaults come from each rune's attribute `matches`; explicit
 *  overrides win. Unknown `(type, field)` → no ordering (lexical fallback). */
export class Ordering {
	constructor(
		private readonly matches: Record<string, Record<string, string[]>>,
		private readonly overrides: Record<string, Record<string, string[]>> = {},
	) {}

	order(type: string, field: string): string[] | undefined {
		return this.overrides[type]?.[field] ?? this.matches[type]?.[field];
	}

	/** Index of `value` within the `(type, field)` ordering, or -1 when there is
	 *  no ordering or the value isn't in it. */
	rank(type: string, field: string, value: string): number {
		const ord = this.order(type, field);
		if (!ord) return -1;
		return ord.indexOf(value);
	}
}

/** Build an {@link Ordering} from an embed config: derive defaults from each
 *  tag schema's attribute `matches`, then layer the explicit `orderings`. */
export function buildOrdering(embedConfig: CollectionEmbedConfig | undefined): Ordering {
	const matches: Record<string, Record<string, string[]>> = {};
	const tags = embedConfig?.tags ?? {};
	for (const [type, schema] of Object.entries(tags)) {
		const attrs = (schema as { attributes?: Record<string, { matches?: unknown }> })?.attributes;
		if (!attrs) continue;
		for (const [field, def] of Object.entries(attrs)) {
			const m = def?.matches;
			if (Array.isArray(m) && m.every((x) => typeof x === 'string')) {
				(matches[type] ??= {})[field] = m as string[];
			}
		}
	}
	return new Ordering(matches, embedConfig?.orderings ?? {});
}

export function entityUrl(e: EntityRegistration): string {
	return e.sourceUrl || String((e.data as Record<string, unknown>).url ?? '');
}

export function entityTitle(e: EntityRegistration): string {
	const d = e.data as Record<string, unknown>;
	return String(d.title ?? d.name ?? e.id);
}

export function fieldValue(e: EntityRegistration, field: string): string {
	const v = resolveEntityField(e as MatchableEntity, field);
	if (Array.isArray(v)) return v.join(', ');
	return String(v ?? '');
}

/** A title link to an entity, or a plain span when it has no URL. The BEM
 *  block is the caller's (collection / relationships). */
export function titleLink(e: EntityRegistration, block: string): TagNode {
	const url = entityUrl(e);
	const label = entityTitle(e);
	const cls = `${block}__title`;
	return url
		? new Tag('a', { class: cls, href: url }, [label])
		: new Tag('span', { class: cls }, [label]);
}

/** The `$item` projection bound inside a per-item template. */
export function projectItem(e: EntityRegistration) {
	return { id: e.id, type: e.type, url: entityUrl(e), data: e.data };
}

/** Sort entities by a `sort` expression (`field`, `-field`, `field-desc`).
 *  With an {@link Ordering}, enum fields sort by domain rank (each entity ranked
 *  within its *own* `(type, field)` order — so mixed-type sets compose); ranked
 *  items come before unranked, which then fall back to numeric/lexical. */
export function sortEntities(entities: EntityRegistration[], sortExpr: string, ordering?: Ordering): EntityRegistration[] {
	if (!sortExpr) return entities;
	let field = sortExpr.trim();
	let dir = 1;
	if (field.startsWith('-')) { dir = -1; field = field.slice(1); }
	else if (field.endsWith('-desc')) { dir = -1; field = field.slice(0, -5); }
	else if (field.endsWith('-asc')) { field = field.slice(0, -4); }
	const ranked = ordering && entities.some((e) => ordering.order(e.type, field));
	return [...entities].sort((a, b) => {
		if (ranked) {
			const ra = ordering!.rank(a.type, field, fieldValue(a, field));
			const rb = ordering!.rank(b.type, field, fieldValue(b, field));
			const aR = ra >= 0, bR = rb >= 0;
			if (aR && bR) { if (ra !== rb) return (ra - rb) * dir; }
			else if (aR !== bR) return aR ? -1 : 1; // ranked before unranked, dir-independent
		}
		const av = fieldValue(a, field);
		const bv = fieldValue(b, field);
		const an = Number(av);
		const bn = Number(bv);
		if (av !== '' && bv !== '' && Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir;
		return av.localeCompare(bv) * dir;
	});
}

/** Group items into an insertion-ordered map keyed by a derived string. */
export function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const key = keyOf(item);
		const arr = groups.get(key);
		if (arr) arr.push(item);
		else groups.set(key, [item]);
	}
	return groups;
}

/** Group entities by one of their fields (empty → `(none)`). With an
 *  {@link Ordering}, groups are emitted in domain order — each group's
 *  representative (minimum) rank across its members, ranked groups first. */
export function groupEntities(entities: EntityRegistration[], field: string, ordering?: Ordering): Map<string, EntityRegistration[]> {
	const groups = groupBy(entities, (e) => fieldValue(e, field) || '(none)');
	if (!ordering || ![...entities].some((e) => ordering.order(e.type, field))) return groups;
	const repRank = (members: EntityRegistration[]): number => {
		let min = Infinity;
		for (const m of members) {
			const r = ordering.rank(m.type, field, fieldValue(m, field));
			if (r >= 0 && r < min) min = r;
		}
		return min;
	};
	const sorted = [...groups.entries()].sort((a, b) => repRank(a[1]) - repRank(b[1]));
	return new Map(sorted);
}

/** One collapsible group in a `group-display="accordion"` rendering. */
export interface AccordionPanel {
	/** Raw group key, surfaced as `data-group`. */
	key: string;
	/** Display label shown in the summary. */
	label: string;
	/** Member count, shown beside the label. */
	count: number;
	/** Already-rendered group contents. */
	nodes: RenderableTreeNode[];
}

/** Render grouped items as an accordion of native `<details>` panels, styled to
 *  match the accordion rune (`.rf-accordion` / `.rf-accordion-item`). Collapsed
 *  by default and independent (multiple open) — the collapse is what makes the
 *  per-group count worth showing. The classes are emitted directly because
 *  collection/relationships resolve in postProcess, after the engine. */
export function renderGroupAccordion(panels: AccordionPanel[]): RenderableTreeNode[] {
	const items = panels.map((p) =>
		new Tag('details', { class: 'rf-accordion-item', 'data-group': p.key }, [
			new Tag('summary', { class: 'rf-accordion-item__header' }, [
				new Tag('span', { class: 'rf-accordion-item__title' }, [p.label]),
				new Tag('span', { class: 'rf-accordion-item__count' }, [String(p.count)]),
			]),
			new Tag('div', { class: 'rf-accordion-item__body' }, p.nodes),
		]),
	);
	return [new Tag('div', { class: 'rf-accordion' }, items)];
}

/** Re-transform a captured per-item template with the given variables bound
 *  (e.g. `{ item }` for collection, `{ item, kind }` for relationships). */
export function renderItemTemplate(
	bodySource: string,
	embedConfig: CollectionEmbedConfig,
	variables: Record<string, unknown>,
): RenderableTreeNode[] {
	const out = transformDeferredTemplate(bodySource, embedConfig as never, variables);
	return (Array.isArray(out) ? out : [out]) as RenderableTreeNode[];
}
