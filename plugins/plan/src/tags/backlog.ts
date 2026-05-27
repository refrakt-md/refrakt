import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, readDeferredBody, COLLECTION_SENTINEL } from '@refrakt-md/runes';

/**
 * `backlog` (SPEC-072 / WORK-284) — thin sugar for a `collection` query over
 * plan work + bug items. Lowers to a `collection`-shaped renderable so the
 * shared `resolveCollections` resolver handles selection, sorting, grouping,
 * limit, and per-item rendering. The body is an optional override; absent →
 * a default card template covering id + title + status (the only fields work
 * and bug share — priority lives on work, severity on bug, so the default
 * stays type-agnostic).
 *
 * Legacy attributes preserved verbatim (`show` / `filter` / `sort` / `group`
 * / `limit`) so existing `{% backlog %}` content keeps working. `show=all` is
 * the plan-domain expansion to `work,bug`; the other `show` values pass
 * through as the collection `type`.
 */
const SHOW_TO_TYPE: Record<string, string> = {
	all: 'work,bug',
	work: 'work',
	bug: 'bug',
	spec: 'spec',
	decision: 'decision',
	milestone: 'milestone',
};

const DEFAULT_BACKLOG_BODY = `{% card href=$item.url %}
---
{% $item.id %}

#### {% $item.data.title %}
---
Status: {% $item.data.status %}
{% /card %}
`;

export const backlog = createContentModelSchema({
	attributes: {
		filter: { type: String, required: false, default: '', description: 'Filter: space-separated field:value pairs (e.g., "status:ready priority:high").' },
		sort: { type: String, required: false, default: 'priority', description: 'Sort field (prefix - for descending). Default: priority.' },
		group: { type: String, required: false, default: 'status', description: 'Group by field: status, priority, assignee, milestone, type, tags. Default: status.' },
		show: { type: String, required: false, default: 'all', description: 'Entity types: all (work + bug), work, bug, spec, decision, milestone.' },
		limit: { type: Number, required: false, description: 'Cap the number of entities rendered (applied after sort, before group).' },
		'group-display': { type: String, required: false, default: 'headings', matches: ['headings', 'accordion'], description: 'How groups are presented when `group` is set: headings (default) or accordion.' },
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) => new Tag('meta', { 'data-field': field, content });
		const bodySource = readDeferredBody(attrs) ?? DEFAULT_BACKLOG_BODY;

		const showVal = String(attrs.show ?? 'all');
		const type = SHOW_TO_TYPE[showVal] ?? showVal;

		const metas = [
			meta('collection-type', type),
			meta('collection-filter', String(attrs.filter ?? '')),
			meta('collection-sort', String(attrs.sort ?? 'priority')),
			meta('collection-group', String(attrs.group ?? 'status')),
			meta('collection-limit', attrs.limit !== undefined ? String(attrs.limit) : ''),
			meta('collection-fields', ''),
			meta('collection-layout', 'list'),
			meta('collection-group-display', String(attrs['group-display'] ?? 'headings')),
			meta('collection-empty', ''),
			meta(COLLECTION_SENTINEL, 'true'),
			meta('collection-body', bodySource),
		];

		const placeholder = new Tag('div', { 'data-name': 'items' }, []);

		return createComponentRenderable({
			rune: 'collection',
			tag: 'section',
			properties: {},
			refs: { items: placeholder },
			children: [...metas, placeholder],
		});
	},
});
