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
import type { RenderableTreeNode } from '@markdoc/markdoc';
import type { EntityRegistration } from '@refrakt-md/types';
import { resolveEntityField, type MatchableEntity } from './field-match.js';
import { transformDeferredTemplate } from './deferred-body.js';

const { Tag } = Markdoc;
type TagNode = InstanceType<typeof Tag>;

/** Embed config threaded through the pipeline so deferred per-item templates
 *  can be re-transformed with the entity bound. */
export interface CollectionEmbedConfig {
	tags: Record<string, unknown>;
	nodes: Record<string, unknown>;
	projectRoot?: string;
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
 *  Numeric values sort numerically, otherwise lexically. WORK-276 will layer
 *  domain-aware `(type, field)` ordering on top of this fallback. */
export function sortEntities(entities: EntityRegistration[], sortExpr: string): EntityRegistration[] {
	if (!sortExpr) return entities;
	let field = sortExpr.trim();
	let dir = 1;
	if (field.startsWith('-')) { dir = -1; field = field.slice(1); }
	else if (field.endsWith('-desc')) { dir = -1; field = field.slice(0, -5); }
	else if (field.endsWith('-asc')) { field = field.slice(0, -4); }
	return [...entities].sort((a, b) => {
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

/** Group entities by one of their fields (empty → `(none)`). */
export function groupEntities(entities: EntityRegistration[], field: string): Map<string, EntityRegistration[]> {
	return groupBy(entities, (e) => fieldValue(e, field) || '(none)');
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
