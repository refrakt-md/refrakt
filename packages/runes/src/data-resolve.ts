/**
 * Data-bound sandbox resolver (SPEC-093 / WORK-388).
 *
 * Runs in the postProcess phase. Finds sandboxes that carry a `data-rf-query`
 * (set by the sandbox schema from the `data` attribute), evaluates the query
 * against the entity registry using the shared field-match grammar, projects +
 * shapes the result (`flat` | `tree` | `graph`), caps the payload, and injects it as an
 * inline `<script type="application/json" data-rf-records>` child. The behaviours
 * layer reads that and exposes it to the iframe as `window.RF_DATA`.
 */
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import type { EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';
import { parseFieldMatch, matchesFieldMatch, type MatchableEntity, type ParsedFieldMatch } from './field-match.js';

const { Tag } = Markdoc;
type TagNode = InstanceType<typeof Tag>;

/** Default cap on the number of records serialised into a binding's payload. */
const DEFAULT_MAX_RECORDS = 500;

function isTag(node: unknown): node is TagNode {
	return Tag.isTag(node as never);
}

interface ProjectedRecord {
	id: string;
	type: string;
	url: string;
	data: Record<string, unknown>;
}

interface TreeNode extends ProjectedRecord {
	children: TreeNode[];
}

/** A directed edge in the `graph` shape: source/target are record ids, `kind`
 *  is the SPEC-072 relationship kind. */
interface GraphEdge {
	from: string;
	to: string;
	kind: string;
}

interface DataQuery {
	expr: string;
	fields: string[];
	shape: string;
	limit?: number;
}

function readDataQuery(tag: TagNode): DataQuery | null {
	const expr = String(tag.attributes['data-rf-query'] ?? '').trim();
	if (!expr) return null;
	const limitRaw = Number(tag.attributes['data-rf-limit']);
	return {
		expr,
		fields: String(tag.attributes['data-rf-fields'] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
		shape: String(tag.attributes['data-rf-shape'] ?? 'flat') || 'flat',
		limit: Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : undefined,
	};
}

function projectEntity(e: EntityRegistration, fields: string[]): ProjectedRecord {
	const data = e.data as Record<string, unknown>;
	const url = String((e.sourceUrl ?? data.url ?? '') as string);
	let projected: Record<string, unknown>;
	if (fields.length > 0) {
		projected = {};
		for (const f of fields) projected[f] = data[f];
	} else {
		projected = { ...data };
	}
	return { id: e.id, type: e.type, url, data: projected };
}

/** Strip a trailing slash (except the root "/") so the no-trailing-slash `url`
 *  and the trailing-slash `parentUrl` conventions match when building the tree. */
function stripSlash(u: string): string {
	return u.length > 1 && u.endsWith('/') ? u.slice(0, -1) : u;
}

/** Nest flat records into a forest keyed by each record's `data.parentUrl`. */
function toTree(records: ProjectedRecord[]): TreeNode[] {
	const byUrl = new Map<string, TreeNode>();
	for (const r of records) byUrl.set(stripSlash(r.url), { ...r, children: [] });
	const roots: TreeNode[] = [];
	for (const node of byUrl.values()) {
		const parentUrl = stripSlash(String((node.data.parentUrl ?? '') as string));
		const parent = parentUrl ? byUrl.get(parentUrl) : undefined;
		if (parent && parent !== node) parent.children.push(node);
		else roots.push(node);
	}
	return roots;
}

/** Collect the SPEC-072 edges among a set of records into a node-link graph.
 *  Nodes are the projected records; edges come from `registry.getRelated` and
 *  are kept only when **both** endpoints are in the record set, so the graph is
 *  closed (no dangling edges to entities the query didn't select). Edges to the
 *  same `(from, to, kind)` are already deduped by the registry. */
function toGraph(records: ProjectedRecord[], registry: Readonly<EntityRegistry>): GraphEdge[] {
	if (!registry.getRelated) return [];
	const nodeIds = new Set(records.map((r) => r.id));
	const edges: GraphEdge[] = [];
	for (const r of records) {
		for (const e of registry.getRelated(r.id)) {
			if (nodeIds.has(e.toId)) edges.push({ from: e.fromId, to: e.toId, kind: e.kind });
		}
	}
	return edges;
}

/** True when the sandbox ships a static SSR fallback (`<template data-content="fallback">`). */
function hasStaticFallback(tag: TagNode): boolean {
	return (tag.children ?? []).some(
		(c) => isTag(c) && c.name === 'template' && c.attributes['data-content'] === 'fallback',
	);
}

function resolveOne(
	tag: TagNode,
	q: DataQuery,
	registry: Readonly<EntityRegistry>,
	ctx: PipelineContext,
	pageUrl: string,
): TagNode {
	const parsed = parseFieldMatch(q.expr);
	for (const w of parsed.warnings) ctx.warn(`sandbox data: ${w}`, pageUrl);

	const typeClause = parsed.clauses.find((c) => c.field === 'type');
	const types = typeClause ? typeClause.values : [];
	if (types.length === 0) {
		ctx.warn(`sandbox data="${q.expr}": no entity type — include a "type:<name>" clause`, pageUrl);
		return tag;
	}

	let entities: EntityRegistration[] = [];
	for (const t of types) entities.push(...registry.getAll(t));

	// Filter by the non-type clauses (the type clause already selected the sets).
	const filterMatch: ParsedFieldMatch = {
		clauses: parsed.clauses.filter((c) => c.field !== 'type'),
		warnings: [],
	};
	if (filterMatch.clauses.length > 0) {
		entities = entities.filter((e) => matchesFieldMatch(e as MatchableEntity, filterMatch));
	}

	let records = entities.map((e) => projectEntity(e, q.fields));

	const cap = q.limit ?? DEFAULT_MAX_RECORDS;
	if (records.length > cap) {
		ctx.warn(`data-bound sandbox query "${q.expr}" yielded ${records.length} records, over the ${cap} cap — truncated`, pageUrl);
		records = records.slice(0, cap);
	}

	if (!hasStaticFallback(tag)) {
		ctx.warn(`data-bound sandbox has no fallback — provide a no-WebGL fallback (e.g. a {% collection %} with the same query) for accessibility`, pageUrl);
	}

	const payload = q.shape === 'tree'
		? { shape: 'tree', tree: toTree(records) }
		: q.shape === 'graph'
			? { shape: 'graph', nodes: records, edges: toGraph(records, registry) }
			: { shape: 'flat', records };

	// Carry the JSON on a data attribute — the same proven rail the design-token
	// injection uses (cross-adapter safe). The behaviour reads `data-rf-records`
	// and exposes it as `window.RF_DATA` inside the iframe.
	return new Tag(
		tag.name,
		{ ...tag.attributes, 'data-rf-records': JSON.stringify(payload) },
		(tag.children ?? []) as RenderableTreeNode[],
	);
}

export function resolveDataBindings(
	node: unknown,
	registry: Readonly<EntityRegistry>,
	ctx: PipelineContext,
	pageUrl: string,
): unknown {
	if (Array.isArray(node)) return node.map((n) => resolveDataBindings(n, registry, ctx, pageUrl));
	if (!isTag(node)) return node;

	const children = (node.children ?? []).map((c) => resolveDataBindings(c, registry, ctx, pageUrl)) as RenderableTreeNode[];
	let tag = new Tag(node.name, node.attributes, children);

	if (tag.name === 'rf-sandbox' && tag.attributes['data-rf-query']) {
		const q = readDataQuery(tag);
		if (q) tag = resolveOne(tag, q, registry, ctx, pageUrl);
	}
	return tag;
}
