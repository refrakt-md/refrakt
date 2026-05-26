/**
 * relationships postProcess resolver (SPEC-072).
 *
 * Walks the serialized renderable, finds `relationships` sentinels, queries the
 * registry's relationship graph (`getRelated`), and renders either a per-edge
 * body template (deferBody, with `$item` + `$kind` bound) or a built-in
 * grouped-by-kind list. Shares render helpers with `collection`.
 */
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import type { EntityRegistry, EntityRegistration, ResolvedEdge, PipelineContext } from '@refrakt-md/types';
import { humanize } from './functions.js';
import {
	type CollectionEmbedConfig, type Ordering,
	fieldValue, titleLink as titleLinkFor,
	groupBy, projectItem, renderItemTemplate, buildOrdering,
} from './collection-helpers.js';
import { RELATIONSHIPS_SENTINEL } from './tags/relationships.js';

const { Tag } = Markdoc;
type TagNode = InstanceType<typeof Tag>;

function isTag(node: unknown): node is TagNode {
	return Tag.isTag(node as never);
}

function metaContent(tag: TagNode, field: string): string {
	for (const child of tag.children ?? []) {
		if (isTag(child) && child.name === 'meta' && child.attributes['data-field'] === field) {
			return String(child.attributes.content ?? '');
		}
	}
	return '';
}

function hasSentinel(tag: TagNode): boolean {
	return (tag.children ?? []).some(
		(c) => isTag(c) && c.name === 'meta' && c.attributes['data-field'] === RELATIONSHIPS_SENTINEL,
	);
}

function csv(s: string): string[] {
	return s.split(',').map((x) => x.trim()).filter(Boolean);
}

interface RelQuery {
	of: string;
	kinds: string[];
	types: string[];
	group: string;
	sort: string;
	limit?: number;
	fields: string[];
	bodySource: string;
}

function readQuery(tag: TagNode): RelQuery {
	const limitRaw = metaContent(tag, 'relationships-limit');
	const limitNum = Number(limitRaw);
	return {
		of: metaContent(tag, 'relationships-of'),
		kinds: csv(metaContent(tag, 'relationships-kind')),
		types: csv(metaContent(tag, 'relationships-type')),
		group: metaContent(tag, 'relationships-group') || 'kind',
		sort: metaContent(tag, 'relationships-sort'),
		limit: limitRaw && Number.isFinite(limitNum) && limitNum > 0 ? Math.floor(limitNum) : undefined,
		fields: csv(metaContent(tag, 'relationships-fields')),
		bodySource: metaContent(tag, 'relationships-body'),
	};
}

/** Sort edges by a related-entity field, honoring domain ordering. */
function sortEdges(edges: ResolvedEdge[], sortExpr: string, ordering: Ordering): ResolvedEdge[] {
	if (!sortExpr) return edges;
	let field = sortExpr.trim();
	let dir = 1;
	if (field.startsWith('-')) { dir = -1; field = field.slice(1); }
	else if (field.endsWith('-desc')) { dir = -1; field = field.slice(0, -5); }
	else if (field.endsWith('-asc')) { field = field.slice(0, -4); }
	const ranked = edges.some((e) => ordering.order(e.target.type, field));
	return [...edges].sort((a, b) => {
		if (ranked) {
			const ra = ordering.rank(a.target.type, field, fieldValue(a.target, field));
			const rb = ordering.rank(b.target.type, field, fieldValue(b.target, field));
			const aR = ra >= 0, bR = rb >= 0;
			if (aR && bR) { if (ra !== rb) return (ra - rb) * dir; }
			else if (aR !== bR) return aR ? -1 : 1;
		}
		const av = fieldValue(a.target, field);
		const bv = fieldValue(b.target, field);
		return av.localeCompare(bv) * dir;
	});
}

function titleLink(e: EntityRegistration): TagNode {
	return titleLinkFor(e, 'rf-relationships');
}

function builtInItem(edge: ResolvedEdge, fields: string[]): TagNode {
	const spans = fields.map((f) =>
		new Tag('span', { class: 'rf-relationships__field', 'data-field': f }, [fieldValue(edge.target, f)]),
	);
	return new Tag('div', { class: 'rf-relationships__item', 'data-entity-id': edge.target.id, 'data-kind': edge.kind },
		[titleLink(edge.target), ...spans]);
}

function renderEdges(
	edges: ResolvedEdge[],
	q: RelQuery,
	embedConfig: CollectionEmbedConfig | undefined,
): RenderableTreeNode[] {
	return edges.map((edge) => {
		if (q.bodySource && embedConfig) {
			const kids = renderItemTemplate(q.bodySource, embedConfig, { item: projectItem(edge.target), kind: edge.kind });
			return new Tag('div', { class: 'rf-relationships__item', 'data-entity-id': edge.target.id, 'data-kind': edge.kind }, kids);
		}
		return builtInItem(edge, q.fields);
	});
}

function resolveOne(
	tag: TagNode,
	registry: Readonly<EntityRegistry>,
	embedConfig: CollectionEmbedConfig | undefined,
	ordering: Ordering,
	ctx: PipelineContext,
	pageUrl: string,
): TagNode {
	const q = readQuery(tag);
	if (!q.of) {
		ctx.warn('relationships — no `of` entity given (pass of=$item.id on an entity page)', pageUrl);
	}

	let edges: ResolvedEdge[] = q.of && registry.getRelated
		? registry.getRelated(q.of, {
			kind: q.kinds.length ? q.kinds : undefined,
			type: q.types.length ? q.types : undefined,
		})
		: [];
	edges = sortEdges(edges, q.sort, ordering);
	if (q.limit !== undefined && edges.length > q.limit) edges = edges.slice(0, q.limit);

	let children: RenderableTreeNode[];
	if (q.group === 'none' || !q.group) {
		children = renderEdges(edges, q, embedConfig);
	} else {
		// group by kind (default) or by target type
		const keyOf = q.group === 'type' ? (e: ResolvedEdge) => e.target.type : (e: ResolvedEdge) => e.kind;
		const groups = groupBy(edges, keyOf);
		children = [];
		for (const [key, es] of groups) {
			children.push(new Tag('div', { class: 'rf-relationships__group', 'data-group': key }, [
				new Tag('h3', { class: 'rf-relationships__group-title' }, [humanize(key)]),
				...renderEdges(es, q, embedConfig),
			]));
		}
	}

	const itemsDiv = new Tag('div', { 'data-name': 'items', class: 'rf-relationships__items' }, children);
	const attrs = { ...tag.attributes, 'data-of': q.of };
	return new Tag(tag.name, attrs, [itemsDiv]);
}

export function resolveRelationships(
	renderable: unknown,
	pageUrl: string,
	registry: Readonly<EntityRegistry>,
	embedConfig: CollectionEmbedConfig | undefined,
	ctx: PipelineContext,
): unknown {
	const ordering = buildOrdering(embedConfig);
	const walk = (node: unknown): unknown => {
		if (Array.isArray(node)) return node.map(walk);
		if (!isTag(node)) return node;
		const tag = node;
		if (tag.attributes?.['data-rune'] === 'relationships' && hasSentinel(tag)) {
			return resolveOne(tag, registry, embedConfig, ordering, ctx, pageUrl);
		}
		if (!tag.children || tag.children.length === 0) return tag;
		return new Tag(tag.name, tag.attributes, tag.children.map(walk) as never[]);
	};
	return walk(renderable);
}
