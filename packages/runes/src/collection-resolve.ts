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
import { parseFieldMatch, matchesFieldMatch, type MatchableEntity } from './field-match.js';
import { transformDeferredTemplate } from './deferred-body.js';
import { humanize } from './functions.js';
import {
	type CollectionEmbedConfig, type Ordering,
	fieldValue, titleLink as titleLinkFor,
	sortEntities, groupEntities, projectItem, buildOrdering,
	splitBodyZones, renderItemTemplate,
} from './collection-helpers.js';
import { COLLECTION_SENTINEL } from './tags/collection.js';

const { Tag, Ast } = Markdoc;
type TagNode = InstanceType<typeof Tag>;

export type { CollectionEmbedConfig };

function titleLink(e: EntityRegistration): TagNode {
	return titleLinkFor(e, 'rf-collection');
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

interface CollectionQuery {
	types: string[];
	filter: string;
	sort: string;
	group: string;
	limit?: number;
	fields: string[];
	layout: string;
	bodySource: string;
	empty: string;
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
		empty: metaContent(tag, 'collection-empty'),
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

interface ColumnDef {
	label: string;
	cellSource: string;
}

/** Split a captured body source into table columns by heading (SPEC-070 / WORK-264). */
function splitColumns(bodySource: string, ctx: PipelineContext, pageUrl: string): ColumnDef[] {
	const ast = Markdoc.parse(bodySource);
	const columns: ColumnDef[] = [];
	let current: { label: string; cellNodes: unknown[] } | null = null;
	for (const node of ast.children) {
		if (node.type === 'heading') {
			const label = Markdoc.format(node).replace(/^#+\s*/, '').trim();
			if (label.includes('$item')) {
				ctx.warn(`collection: $item in a table column heading ("${label}") is not per-row; use a static label`, pageUrl);
			}
			current = { label, cellNodes: [] };
			columns.push({ label, cellSource: '' });
		} else if (current) {
			current.cellNodes.push(node);
			columns[columns.length - 1].cellSource = Markdoc.format(
				new Ast.Node('document', {}, current.cellNodes as never[]),
			);
		}
	}
	return columns;
}

function renderHeadingTable(
	entities: EntityRegistration[],
	bodySource: string,
	embedConfig: CollectionEmbedConfig | undefined,
	ctx: PipelineContext,
	pageUrl: string,
): TagNode {
	const columns = splitColumns(bodySource, ctx, pageUrl);
	if (!embedConfig) {
		ctx.error('collection — table column templates present but no embedConfig threaded through the pipeline', pageUrl);
		return new Tag('table', { class: 'rf-collection__table' }, []);
	}
	const thead = new Tag('thead', {}, [new Tag('tr', {}, columns.map((c) => new Tag('th', {}, [c.label])))]);
	const rows = entities.map((e) => {
		const item = projectItem(e);
		const cells = columns.map((c) => {
			const out = transformDeferredTemplate(c.cellSource, embedConfig as never, { item });
			const kids = Array.isArray(out) ? out : [out];
			return new Tag('td', {}, kids as RenderableTreeNode[]);
		});
		return new Tag('tr', { 'data-entity-id': e.id }, cells);
	});
	return new Tag('table', { class: 'rf-collection__table' }, [thead, new Tag('tbody', {}, rows)]);
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
		const item = projectItem(e);
		const out = transformDeferredTemplate(bodySource, embedConfig as never, { item });
		const children = Array.isArray(out) ? out : [out];
		return new Tag('div', { class: 'rf-collection__item', 'data-entity-id': e.id }, children as RenderableTreeNode[]);
	});
}

function renderGroupOrFlat(entities: EntityRegistration[], q: CollectionQuery, ordering: Ordering, renderItems: (es: EntityRegistration[]) => RenderableTreeNode[]): RenderableTreeNode[] {
	if (!q.group) return renderItems(entities);
	const groups = groupEntities(entities, q.group, ordering);
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
	ordering: Ordering,
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
	entities = sortEntities(entities, q.sort, ordering);
	if (q.limit !== undefined && entities.length > q.limit) entities = entities.slice(0, q.limit);

	const zones = splitBodyZones(q.bodySource);
	const tmpl = zones.template;
	const attrs = { ...tag.attributes, 'data-type': q.types.join(','), 'data-layout': q.layout };

	// Empty state (SPEC-072 Cap 5): fallback zone, else the `empty` attribute,
	// else nothing. No preamble when empty.
	if (entities.length === 0) {
		const out: RenderableTreeNode[] = [];
		if (zones.fallback && embedConfig) {
			out.push(new Tag('div', { 'data-name': 'empty', class: 'rf-collection__empty' }, renderItemTemplate(zones.fallback, embedConfig, {})));
		} else if (q.empty) {
			out.push(new Tag('div', { 'data-name': 'empty', class: 'rf-collection__empty' }, [q.empty]));
		}
		return new Tag(tag.name, attrs, out);
	}

	// Render items from the template zone (or the built-in when it's empty).
	let children: RenderableTreeNode[];
	if (q.layout === 'table' && tmpl) {
		// Heading-delimited column templates (WORK-264).
		children = renderGroupOrFlat(entities, q, ordering, (es) => [renderHeadingTable(es, tmpl, embedConfig, ctx, pageUrl)]);
	} else if (tmpl) {
		children = renderGroupOrFlat(entities, q, ordering, (es) => renderBody(es, tmpl, embedConfig, ctx, pageUrl));
	} else if (q.layout === 'table') {
		children = renderGroupOrFlat(entities, q, ordering, (es) => [renderTable(es, q)]);
	} else {
		children = renderGroupOrFlat(entities, q, ordering, (es) => es.map((e) => renderBuiltInItem(e, q)));
	}

	const itemsDiv = new Tag('div', { 'data-name': 'items', class: 'rf-collection__items' }, children);
	// Preamble renders once, above items, only when non-empty.
	const head: RenderableTreeNode[] = [];
	if (zones.preamble && embedConfig) {
		head.push(new Tag('div', { 'data-name': 'preamble', class: 'rf-collection__preamble' }, renderItemTemplate(zones.preamble, embedConfig, {})));
	}
	return new Tag(tag.name, attrs, [...head, itemsDiv]);
}

export function resolveCollections(
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
		if (tag.attributes?.['data-rune'] === 'collection' && hasSentinel(tag)) {
			return resolveOne(tag, registry, embedConfig, ordering, ctx, pageUrl);
		}
		if (!tag.children || tag.children.length === 0) return tag;
		return new Tag(tag.name, tag.attributes, tag.children.map(walk) as never[]);
	};
	return walk(renderable);
}
