/**
 * collection postProcess resolver (SPEC-070).
 *
 * Walks the serialized renderable, finds `collection` sentinels, queries the
 * registry (filter / sort / group / limit via the shared field-match grammar),
 * and renders either a per-entity body template (deferBody) or a built-in
 * layout (list / cards / grid / table with `fields` projection).
 */
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import type { EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';
import { parseFieldMatch, matchesFieldMatch, resolveEntityField, type MatchableEntity } from './field-match.js';
import { transformDeferredTemplate } from './deferred-body.js';
import { COLLECTION_SENTINEL } from './tags/collection.js';

const { Tag } = Markdoc;
type TagNode = InstanceType<typeof Tag>;

export interface CollectionEmbedConfig {
	tags: Record<string, unknown>;
	nodes: Record<string, unknown>;
	projectRoot?: string;
}

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
		(c) => isTag(c) && c.name === 'meta' && c.attributes['data-field'] === COLLECTION_SENTINEL,
	);
}

function humanize(field: string): string {
	return field
		.replace(/[-_]+/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase())
		.trim();
}

function entityUrl(e: EntityRegistration): string {
	return e.sourceUrl || String((e.data as Record<string, unknown>).url ?? '');
}

function entityTitle(e: EntityRegistration): string {
	const d = e.data as Record<string, unknown>;
	return String(d.title ?? d.name ?? e.id);
}

function fieldValue(e: EntityRegistration, field: string): string {
	const v = resolveEntityField(e as MatchableEntity, field);
	if (Array.isArray(v)) return v.join(', ');
	return String(v ?? '');
}

function titleLink(e: EntityRegistration): TagNode {
	const url = entityUrl(e);
	const label = entityTitle(e);
	return url
		? new Tag('a', { class: 'rf-collection__title', href: url }, [label])
		: new Tag('span', { class: 'rf-collection__title' }, [label]);
}

function sortEntities(entities: EntityRegistration[], sortExpr: string): EntityRegistration[] {
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

function groupEntities(entities: EntityRegistration[], field: string): Map<string, EntityRegistration[]> {
	const groups = new Map<string, EntityRegistration[]>();
	for (const e of entities) {
		const key = fieldValue(e, field) || '(none)';
		const arr = groups.get(key);
		if (arr) arr.push(e);
		else groups.set(key, [e]);
	}
	return groups;
}

interface CollectionQuery {
	types: string[];
	filter: string;
	sort: string;
	group: string;
	limit?: number;
	fields: string[];
	layout: string;
	bodySource: string;
}

function readQuery(tag: TagNode): CollectionQuery {
	const limitRaw = metaContent(tag, 'collection-limit');
	const limitNum = Number(limitRaw);
	return {
		types: metaContent(tag, 'collection-type').split(',').map((s) => s.trim()).filter(Boolean),
		filter: metaContent(tag, 'collection-filter'),
		sort: metaContent(tag, 'collection-sort'),
		group: metaContent(tag, 'collection-group'),
		limit: limitRaw && Number.isFinite(limitNum) && limitNum > 0 ? Math.floor(limitNum) : undefined,
		fields: metaContent(tag, 'collection-fields').split(',').map((s) => s.trim()).filter(Boolean),
		layout: metaContent(tag, 'collection-layout') || 'list',
		bodySource: metaContent(tag, 'collection-body'),
	};
}

function renderBuiltInItem(e: EntityRegistration, q: CollectionQuery): TagNode {
	const fieldSpans = q.fields.map((f) =>
		new Tag('span', { class: 'rf-collection__field', 'data-field': f }, [fieldValue(e, f)]),
	);
	if (q.layout === 'list') {
		return new Tag('div', { class: 'rf-collection__item', 'data-entity-id': e.id }, [titleLink(e)]);
	}
	// cards / grid
	return new Tag('article', { class: 'rf-collection__card', 'data-entity-id': e.id }, [titleLink(e), ...fieldSpans]);
}

function renderTable(entities: EntityRegistration[], q: CollectionQuery): TagNode {
	const headCells = [new Tag('th', {}, ['Title']), ...q.fields.map((f) => new Tag('th', {}, [humanize(f)]))];
	const thead = new Tag('thead', {}, [new Tag('tr', {}, headCells)]);
	const rows = entities.map((e) => {
		const cells = [
			new Tag('td', {}, [titleLink(e)]),
			...q.fields.map((f) => new Tag('td', { 'data-field': f }, [fieldValue(e, f)])),
		];
		return new Tag('tr', { 'data-entity-id': e.id }, cells);
	});
	return new Tag('table', { class: 'rf-collection__table' }, [thead, new Tag('tbody', {}, rows)]);
}

function renderBody(
	entities: EntityRegistration[],
	bodySource: string,
	embedConfig: CollectionEmbedConfig | undefined,
	ctx: PipelineContext,
	pageUrl: string,
): RenderableTreeNode[] {
	if (!embedConfig) {
		ctx.error('collection — body template present but no embedConfig threaded through the pipeline', pageUrl);
		return [];
	}
	return entities.map((e) => {
		const item = { id: e.id, type: e.type, url: entityUrl(e), data: e.data };
		const out = transformDeferredTemplate(bodySource, embedConfig as never, { item });
		const children = Array.isArray(out) ? out : [out];
		return new Tag('div', { class: 'rf-collection__item', 'data-entity-id': e.id }, children as RenderableTreeNode[]);
	});
}

function renderGroupOrFlat(entities: EntityRegistration[], q: CollectionQuery, renderItems: (es: EntityRegistration[]) => RenderableTreeNode[]): RenderableTreeNode[] {
	if (!q.group) return renderItems(entities);
	const groups = groupEntities(entities, q.group);
	const out: RenderableTreeNode[] = [];
	for (const [name, es] of groups) {
		out.push(new Tag('div', { class: 'rf-collection__group', 'data-group': name }, [
			new Tag('h3', { class: 'rf-collection__group-title' }, [name]),
			...renderItems(es),
		]));
	}
	return out;
}

function resolveOne(
	tag: TagNode,
	registry: Readonly<EntityRegistry>,
	embedConfig: CollectionEmbedConfig | undefined,
	ctx: PipelineContext,
	pageUrl: string,
): TagNode {
	const q = readQuery(tag);

	// Query
	let entities: EntityRegistration[] = [];
	for (const type of q.types) entities.push(...registry.getAll(type));
	if (q.filter) {
		const parsed = parseFieldMatch(q.filter);
		for (const w of parsed.warnings) ctx.warn(`collection filter: ${w}`, pageUrl);
		entities = entities.filter((e) => matchesFieldMatch(e as MatchableEntity, parsed));
	}
	entities = sortEntities(entities, q.sort);
	if (q.limit !== undefined && entities.length > q.limit) entities = entities.slice(0, q.limit);

	// Render items
	let children: RenderableTreeNode[];
	if (q.bodySource) {
		children = renderGroupOrFlat(entities, q, (es) => renderBody(es, q.bodySource, embedConfig, ctx, pageUrl));
	} else if (q.layout === 'table') {
		children = renderGroupOrFlat(entities, q, (es) => [renderTable(es, q)]);
	} else {
		children = renderGroupOrFlat(entities, q, (es) => es.map((e) => renderBuiltInItem(e, q)));
	}

	const itemsDiv = new Tag('div', { 'data-name': 'items', class: 'rf-collection__items' }, children);
	const attrs = { ...tag.attributes, 'data-type': q.types.join(','), 'data-layout': q.layout };
	return new Tag(tag.name, attrs, [itemsDiv]);
}

export function resolveCollections(
	renderable: unknown,
	pageUrl: string,
	registry: Readonly<EntityRegistry>,
	embedConfig: CollectionEmbedConfig | undefined,
	ctx: PipelineContext,
): unknown {
	const walk = (node: unknown): unknown => {
		if (Array.isArray(node)) return node.map(walk);
		if (!isTag(node)) return node;
		const tag = node;
		if (tag.attributes?.['data-rune'] === 'collection' && hasSentinel(tag)) {
			return resolveOne(tag, registry, embedConfig, ctx, pageUrl);
		}
		if (!tag.children || tag.children.length === 0) return tag;
		return new Tag(tag.name, tag.attributes, tag.children.map(walk) as never[]);
	};
	return walk(renderable);
}
