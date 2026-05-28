import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, readDeferredBody, COLLECTION_SENTINEL } from '@refrakt-md/runes';

/**
 * `decision-log` (SPEC-072 / WORK-284) — thin sugar for a `collection` query
 * over plan decisions, sorted newest-first. Lowers to a `collection`-shaped
 * renderable so the shared `resolveCollections` resolver handles selection,
 * sorting, and per-item rendering. The body is an optional override; absent →
 * a default heading-template table (Decision / Status / Date) — "log" reads
 * as a scannable chronological reference, which fits a table better than the
 * card layout.
 *
 * Legacy attributes preserved (`filter` / `sort`) so existing
 * `{% decision-log %}` content keeps working. The bare `sort="date"` value
 * means "newest first" here; the lowered version maps it to the shared sort
 * grammar's `-date` so the direction matches the rune's documented contract.
 *
 * Decision-log's `<ol>` items container is not preserved (collection uses a
 * `<div>` container) — accepted per ADR-012.
 */

const DEFAULT_DECISION_LOG_BODY = `# Decision
{% link href=$item.url %}**{% $item.id %}** — {% $item.data.title %}{% /link %}
# Status
{% humanize($item.data.status) %}
# Date
{% date($item.data.date) %}
`;

export const decisionLog = createContentModelSchema({
	attributes: {
		filter: { type: String, required: false, default: '', description: 'Filter: space-separated field:value pairs (e.g., "status:accepted").' },
		sort: { type: String, required: false, default: 'date', description: 'Sort field. Bare `date` is reverse chronological (matches the rune\'s historical contract); use `+date` for ascending or any other field for the natural order.' },
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) => new Tag('meta', { 'data-field': field, content });
		const bodySource = readDeferredBody(attrs) ?? DEFAULT_DECISION_LOG_BODY;

		// Preserve the rune's "date means reverse-chrono" contract: the bare
		// `date` token historically meant newest-first. Other sort expressions
		// (including `+date`) pass through unchanged.
		const sortRaw = String(attrs.sort ?? 'date');
		const sort = sortRaw === 'date' ? '-date' : sortRaw;

		const metas = [
			meta('collection-type', 'decision'),
			meta('collection-filter', String(attrs.filter ?? '')),
			meta('collection-sort', sort),
			meta('collection-group', ''),
			meta('collection-limit', ''),
			meta('collection-fields', ''),
			meta('collection-layout', 'table'),
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
