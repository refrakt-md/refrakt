/**
 * aggregate postProcess resolver (SPEC-076).
 *
 * Walks the serialized renderable, finds `aggregate` sentinels, queries the
 * registry, and emits either a single integer (no-body inline form) or a
 * body-zoned breakdown (preamble totals / per-group template / fallback). Per
 * group the captured body source is reparsed with `$item` bound to the group
 * projection — same machinery `collection`'s per-item template uses, just at
 * group granularity (no nested item-list splice).
 */
import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
import type { EntityRegistry, EntityRegistration, PipelineContext } from '@refrakt-md/types';
import { parseFieldMatch, matchesFieldMatch, type MatchableEntity, type ParsedFieldMatch } from './field-match.js';
import {
	type CollectionEmbedConfig, type Ordering,
	buildOrdering, splitBodyZones, renderItemTemplate, groupEntities,
} from './collection-helpers.js';
import { AGGREGATE_SENTINEL } from './tags/aggregate.js';
import { humanize } from './functions.js';

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
		(c) => isTag(c) && c.name === 'meta' && c.attributes['data-field'] === AGGREGATE_SENTINEL,
	);
}

interface AggregateQuery {
	types: string[];
	filter: string;
	value: string;
	group: string;
	sort: string;
	limit?: number;
	bodySource: string;
	empty: string;
	layout: string;
	chartType: string;
	chartTitle: string;
}

function readQuery(tag: TagNode): AggregateQuery {
	const limitRaw = metaContent(tag, 'aggregate-limit');
	const limitNum = Number(limitRaw);
	return {
		types: metaContent(tag, 'aggregate-type').split(',').map((s) => s.trim()).filter(Boolean),
		filter: metaContent(tag, 'aggregate-filter'),
		value: metaContent(tag, 'aggregate-value'),
		group: metaContent(tag, 'aggregate-group'),
		sort: metaContent(tag, 'aggregate-sort'),
		limit: limitRaw && Number.isFinite(limitNum) && limitNum > 0 ? Math.floor(limitNum) : undefined,
		bodySource: metaContent(tag, 'aggregate-body'),
		empty: metaContent(tag, 'aggregate-empty'),
		layout: metaContent(tag, 'aggregate-layout'),
		chartType: metaContent(tag, 'aggregate-chart-type') || 'bar',
		chartTitle: metaContent(tag, 'aggregate-chart-title'),
	};
}

/** Build the `chart` rune's final rendered form (an `<rf-chart>` wrapping an
 *  authored data `<table data-name="data">`) from the ordered groups — one row
 *  per group (label = humanized key, value = count, + a value series when a
 *  `value` sub-filter is set). The web component upgrades the table to an SVG;
 *  the table is the no-JS fallback (SPEC-083). */
function buildChart(
	groups: Array<[string, EntityRegistration[]]>,
	q: AggregateQuery,
	valueParsed: ParsedFieldMatch | null,
	sentiments: CollectionEmbedConfig['sentiments'],
): TagNode {
	const td = (v: string) => new Tag('td', {}, [v]);
	const th = (v: string) => new Tag('th', {}, [v]);

	const headers = [humanize(q.group || 'group'), 'Count'];
	if (valueParsed) headers.push('Value');
	const headRow = new Tag('tr', {}, headers.map(th));

	const bodyRows = groups.map(([key, members]) => {
		// Tag the label cell with the group sentiment — the chart behaviour reads
		// it (label-cell fallback) so the bar/point colours by semantic token.
		const sentiment = groupSentiment(sentiments, members, q.group, key);
		const label = sentiment
			? new Tag('td', { 'data-meta-sentiment': sentiment }, [humanize(key)])
			: td(humanize(key));
		const cells = [label, td(String(members.length))];
		if (valueParsed) cells.push(td(String(countValue(members, valueParsed))));
		return new Tag('tr', {}, cells);
	});

	const tableChildren: RenderableTreeNode[] = [];
	if (q.chartTitle) tableChildren.push(new Tag('caption', {}, [q.chartTitle]));
	tableChildren.push(new Tag('thead', {}, [headRow]));
	tableChildren.push(new Tag('tbody', {}, bodyRows));

	const table = new Tag('table', { 'data-name': 'data' }, tableChildren);
	// Emit the `chart` rune's pre-engine shape: `data-rune` + the type/stacked
	// field channel. The identity transform runs over post-processed runes too, so
	// it adds `.rf-chart` and sets `data-type` from the field — this keeps a
	// non-bar `chart-type` (the engine would otherwise reset it to the default)
	// and avoids a doubled class. `data-type` is also set directly so the
	// pre-render tree is already correct.
	return new Tag('rf-chart', {
		'data-rune': 'chart',
		'data-rune-fields': JSON.stringify({ type: q.chartType, stacked: 'false' }),
		'data-type': q.chartType,
		'data-stacked': 'false',
	}, [table]);
}

function percentOf(value: number, count: number): number {
	if (count <= 0) return 0;
	return Math.round((value / count) * 100);
}

function countValue(entities: EntityRegistration[], valueParsed: ParsedFieldMatch | null): number {
	if (!valueParsed) return entities.length;
	return entities.filter((e) => matchesFieldMatch(e as MatchableEntity, valueParsed)).length;
}

/** The sentiment for a group, looked up from the embed config's
 *  `(type → field → value → sentiment)` maps (WORK-357). The group's type is its
 *  first member's; an unmapped `(type, field, value)` yields `''`. */
function groupSentiment(
	sentiments: CollectionEmbedConfig['sentiments'],
	members: EntityRegistration[],
	field: string,
	value: string,
): string {
	const type = members[0]?.type ?? '';
	return sentiments?.[type]?.[field]?.[value] ?? '';
}

/** Sort groups by a projection field (`key` | `count` | `value` | `percent`),
 *  honoring domain-aware ordering on the group field when sorting by `key`. */
function sortGroups(
	groups: Array<[string, EntityRegistration[]]>,
	sortExpr: string,
	groupField: string,
	ordering: Ordering,
	valueParsed: ParsedFieldMatch | null,
): Array<[string, EntityRegistration[]]> {
	if (!sortExpr) return groups;
	let field = sortExpr.trim();
	let dir = 1;
	if (field.startsWith('-')) { dir = -1; field = field.slice(1); }
	else if (field.endsWith('-desc')) { dir = -1; field = field.slice(0, -5); }
	else if (field.endsWith('-asc')) { field = field.slice(0, -4); }

	if (field === 'count') {
		return [...groups].sort(([, a], [, b]) => (a.length - b.length) * dir);
	}
	if (field === 'value') {
		return [...groups].sort(([, a], [, b]) => (countValue(a, valueParsed) - countValue(b, valueParsed)) * dir);
	}
	if (field === 'percent') {
		return [...groups].sort(([, a], [, b]) => {
			const pa = percentOf(countValue(a, valueParsed), a.length);
			const pb = percentOf(countValue(b, valueParsed), b.length);
			return (pa - pb) * dir;
		});
	}
	// 'key' (default explicit case) — domain ordering when groupField has one.
	return [...groups].sort(([ka, ma], [kb, mb]) => {
		const ta = ma[0]?.type ?? '';
		const tb = mb[0]?.type ?? '';
		const ra = ordering.rank(ta, groupField, ka);
		const rb = ordering.rank(tb, groupField, kb);
		const aR = ra >= 0, bR = rb >= 0;
		if (aR && bR) { if (ra !== rb) return (ra - rb) * dir; }
		else if (aR !== bR) return aR ? -1 : 1;
		return ka.localeCompare(kb) * dir;
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

	// Primary set: union of registry.getAll(type) per type, then filter.
	let entities: EntityRegistration[] = [];
	for (const type of q.types) entities.push(...registry.getAll(type));
	if (q.filter) {
		const parsed = parseFieldMatch(q.filter);
		for (const w of parsed.warnings) ctx.warn(`aggregate filter: ${w}`, pageUrl);
		entities = entities.filter((e) => matchesFieldMatch(e as MatchableEntity, parsed));
	}

	const valueParsed = q.value ? parseFieldMatch(q.value) : null;
	if (valueParsed) {
		for (const w of valueParsed.warnings) ctx.warn(`aggregate value: ${w}`, pageUrl);
	}

	const countTotal = entities.length;
	const valueTotal = countValue(entities, valueParsed);
	// Without a `value` attribute, the in-context "achievement" is the count
	// itself — so percent reads as 100 (a full bar, semantically vacuous).
	const percentTotal = q.value ? percentOf(valueTotal, countTotal) : 100;

	// Chart layout (SPEC-076 / WORK-349) — draw the grouped counts as an SVG via
	// the chart pipeline (the table is the no-JS fallback). Empty query → the
	// `empty` fallback, never a broken chart. Axis order honors the same
	// domain-aware grouping/sort the body-zoned form uses.
	if (q.layout === 'chart') {
		if (countTotal === 0) {
			return new Tag('div', { 'data-name': 'empty', class: 'rf-aggregate__empty' }, q.empty ? [q.empty] : []);
		}
		let groups = [...groupEntities(entities, q.group, ordering).entries()];
		groups = sortGroups(groups, q.sort, q.group, ordering, valueParsed);
		if (q.limit !== undefined && groups.length > q.limit) groups = groups.slice(0, q.limit);
		return buildChart(groups, q, valueParsed, embedConfig?.sentiments);
	}

	// No-body form → inline integer. The engine has already added
	// `class="rf-aggregate"` to the wrapper span; we just stamp the count and
	// swap children for the digit.
	if (!q.bodySource) {
		return new Tag(tag.name, {
			...tag.attributes,
			'data-aggregate': 'count',
			'data-count': String(countTotal),
		}, [String(countTotal)]);
	}

	const zones = splitBodyZones(q.bodySource);
	const tmpl = zones.template;
	const attrs = { ...tag.attributes, 'data-aggregate': 'breakdown' };

	// Empty state: fallback zone, else `empty` attribute, else nothing.
	if (countTotal === 0) {
		const out: RenderableTreeNode[] = [];
		if (zones.fallback && embedConfig) {
			const vars = { item: { key: '', count: 0, value: 0, percent: 0, total: 0, shown: 0 } };
			out.push(new Tag('div', { 'data-name': 'empty', class: 'rf-aggregate__empty' }, renderItemTemplate(zones.fallback, embedConfig, vars)));
		} else if (q.empty) {
			out.push(new Tag('div', { 'data-name': 'empty', class: 'rf-aggregate__empty' }, [q.empty]));
		}
		return new Tag(tag.name, attrs, out);
	}

	// Preamble (once, when non-empty) — totals projection on $item.
	const head: RenderableTreeNode[] = [];
	if (zones.preamble && embedConfig) {
		const vars = { item: { count: countTotal, value: valueTotal, percent: percentTotal, total: countTotal } };
		head.push(new Tag('div', { 'data-name': 'preamble', class: 'rf-aggregate__preamble' }, renderItemTemplate(zones.preamble, embedConfig, vars)));
	}

	// Ungrouped: render the template once with the totals projection on $item.
	if (!q.group) {
		const out: RenderableTreeNode[] = [...head];
		if (tmpl && embedConfig) {
			const vars = { item: { key: '', count: countTotal, value: valueTotal, percent: percentTotal, total: countTotal, shown: 1 } };
			out.push(new Tag('div', { 'data-name': 'items', class: 'rf-aggregate__items' }, renderItemTemplate(tmpl, embedConfig, vars)));
		}
		return new Tag(tag.name, attrs, out);
	}

	// Grouped: groupEntities (domain order by default) → sort → limit.
	let groups = [...groupEntities(entities, q.group, ordering).entries()];
	groups = sortGroups(groups, q.sort, q.group, ordering, valueParsed);
	if (q.limit !== undefined && groups.length > q.limit) groups = groups.slice(0, q.limit);
	const shown = groups.length;

	const groupNodes: RenderableTreeNode[] = [];
	if (tmpl && embedConfig) {
		for (const [key, members] of groups) {
			const groupCount = members.length;
			const groupValue = countValue(members, valueParsed);
			const groupPercent = q.value ? percentOf(groupValue, groupCount) : 100;
			const vars = {
				item: {
					key,
					count: groupCount,
					value: groupValue,
					percent: groupPercent,
					total: countTotal,
					shown,
					sentiment: groupSentiment(embedConfig?.sentiments, members, q.group, key),
				},
			};
			const kids = renderItemTemplate(tmpl, embedConfig, vars);
			groupNodes.push(
				new Tag('div', { class: 'rf-aggregate__group', 'data-group': key, 'data-block': '' }, kids),
			);
		}
	}
	const itemsDiv = new Tag('div', { 'data-name': 'items', class: 'rf-aggregate__items' }, groupNodes);
	return new Tag(tag.name, attrs, [...head, itemsDiv]);
}

export function resolveAggregates(
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
		if (tag.attributes?.['data-rune'] === 'aggregate' && hasSentinel(tag)) {
			return resolveOne(tag, registry, embedConfig, ordering, ctx, pageUrl);
		}
		if (!tag.children || tag.children.length === 0) return tag;
		return new Tag(tag.name, tag.attributes, tag.children.map(walk) as never[]);
	};
	return walk(renderable);
}
