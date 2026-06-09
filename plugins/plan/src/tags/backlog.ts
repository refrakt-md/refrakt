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

// The single type-specific field each homogeneous backlog may surface beyond the
// universal projection (a mixed set can't show these uniformly). (WORK-342)
const TYPE_FIELD: Record<string, string> = { work: 'priority', bug: 'severity' };

// Cards/list default body — a `card` whose top strip is a `bar`: identifier on
// the left (plus a type chip for a mixed set, or — for a single-type backlog —
// that type's key field), a sentiment-coloured status badge on the right; the
// body keeps the title. Universal across every plan type by construction
// (identifier/status/type are the only shared fields). (WORK-342)
function cardBody(extraField?: string): string {
	const extra = extraField
		? ` {% if $item.data.${extraField} %}{% badge %}{% $item.data.${extraField} %}{% /badge %}{% /if %}`
		: '';
	return `{% card href=$item.url %}
{% bar %}
{% $item.identifier %}{% if $item.mixed %} {% badge type="category" %}{% humanize($item.type) %}{% /badge %}{% /if %}${extra}
---
{% badge type="status" sentiment=$item.sentiment %}{% $item.data.status %}{% /badge %}
{% /bar %}

#### {% $item.data.title %}
{% /card %}
`;
}

// Table default body — heading-as-columns over the universal projection
// (Identifier · Type · Status · Title). The Type column is always present in the
// table detail view (the "only when mixed" rule governs the card type chip).
const DEFAULT_TABLE_BODY = `# Identifier
{% link href=$item.url %}{% $item.identifier %}{% /link %}
# Type
{% humanize($item.type) %}
# Status
{% badge type="status" sentiment=$item.sentiment %}{% $item.data.status %}{% /badge %}
# Title
{% $item.data.title %}
`;

export const backlog = createContentModelSchema({
	attributes: {
		filter: { type: String, required: false, default: '', description: 'Filter: space-separated field:value pairs (e.g., "status:ready priority:high").' },
		sort: { type: String, required: false, default: 'priority', description: 'Sort field (prefix - for descending). Default: priority.' },
		group: { type: String, required: false, default: 'status', description: 'Group by field: status, priority, assignee, milestone, type, tags. Default: status.' },
		show: { type: String, required: false, default: 'all', description: 'Entity types: all (work + bug), work, bug, spec, decision, milestone.' },
		layout: { type: String, required: false, default: 'cards', matches: ['cards', 'list', 'table'], description: 'How items are laid out: cards (default), list, or table. Forwarded to the underlying collection.' },
		limit: { type: Number, required: false, description: 'Cap the number of entities rendered (applied after sort, before group).' },
		'group-display': { type: String, required: false, default: 'headings', matches: ['headings', 'accordion'], description: 'How groups are presented when `group` is set: headings (default) or accordion.' },
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) => new Tag('meta', { 'data-field': field, content });
		const layout = String(attrs.layout ?? 'cards');
		const showVal = String(attrs.show ?? 'all');
		const type = SHOW_TO_TYPE[showVal] ?? showVal;

		// A single-type backlog may surface that type's key field (work→priority,
		// bug→severity); a mixed set stays universal (identifier/status/type).
		const singleType = type.includes(',') ? '' : type;
		const bodySource = readDeferredBody(attrs)
			?? (layout === 'table' ? DEFAULT_TABLE_BODY : cardBody(TYPE_FIELD[singleType]));

		const metas = [
			meta('collection-type', type),
			meta('collection-filter', String(attrs.filter ?? '')),
			meta('collection-sort', String(attrs.sort ?? 'priority')),
			meta('collection-group', String(attrs.group ?? 'status')),
			meta('collection-limit', attrs.limit !== undefined ? String(attrs.limit) : ''),
			meta('collection-fields', ''),
			meta('collection-layout', layout),
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
