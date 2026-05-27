import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, readDeferredBody, COLLECTION_SENTINEL } from '@refrakt-md/runes';

/**
 * `plan-activity` (SPEC-072 / WORK-284) — thin sugar for a `collection` query
 * over all plan entity types, sorted by recent modification. Lowers to a
 * `collection`-shaped renderable so the shared `resolveCollections` resolver
 * handles selection, sorting, limit, and per-item rendering. The body is an
 * optional override; absent → a compact default card.
 *
 * Legacy attribute preserved (`limit`, default 10) so existing
 * `{% plan-activity %}` content keeps working. Entities without a `modified`
 * date sort last under the shared sort (instead of being dropped entirely as
 * the previous bespoke resolver did) — accepted per ADR-012.
 */

const DEFAULT_PLAN_ACTIVITY_BODY = `{% card href=$item.url %}
---
{% $item.id %}

#### {% $item.data.title %}
---
{% $item.data.modified %} · {% $item.type %} · Status: {% $item.data.status %}
{% /card %}
`;

export const planActivity = createContentModelSchema({
	attributes: {
		limit: { type: Number, required: false, default: 10, description: 'Maximum number of recent items to show.' },
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) => new Tag('meta', { 'data-field': field, content });
		const bodySource = readDeferredBody(attrs) ?? DEFAULT_PLAN_ACTIVITY_BODY;
		const limit = attrs.limit ?? 10;

		const metas = [
			meta('collection-type', 'work,bug,spec,decision,milestone'),
			meta('collection-filter', ''),
			meta('collection-sort', '-modified'),
			meta('collection-group', ''),
			meta('collection-limit', String(limit)),
			meta('collection-fields', ''),
			meta('collection-layout', 'list'),
			meta('collection-group-display', 'headings'),
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
