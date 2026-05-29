import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '../lib/index.js';
import { readDeferredBody } from '../deferred-body.js';

export const AGGREGATE_SENTINEL = '__aggregate-sentinel';

/**
 * `aggregate` (SPEC-076) — the third post-process-resolved query rune, beside
 * `collection` and `relationships`. Where they project entities and edges, this
 * one projects **numbers** — counts over the same field-match query, optionally
 * broken down by group. Two modes from the same rune:
 *
 *   - **No-body**: emits a single inline integer (the count). Replaces the
 *     standalone `count` rune proposal.
 *   - **Body-zoned**: source splits on top-level `hr` into preamble / template /
 *     fallback. `$item` is bound differently per zone — preamble gets totals,
 *     template gets the per-group projection, fallback gets zeros.
 *
 * The body is captured via `deferBody` and reparsed per group in the resolver
 * (the same path collection's per-item template uses).
 */
export const aggregate = createContentModelSchema({
	attributes: {
		type: { type: String, required: false, default: '', description: 'Entity type(s), comma-separated.' },
		filter: { type: String, required: false, default: '', description: 'field:value clauses defining the primary set being measured (SPEC-070 grammar).' },
		value: { type: String, required: false, default: '', description: 'Optional secondary field:value clause defining the achieved subset within `filter` (e.g. value="status:done"). When set, $item.value is the count matching both; $item.percent is the ratio. Without it, the rune is a pure count + breakdown — no progress-bar semantics.' },
		group: { type: String, required: false, default: '', description: 'Group-by field; omit to render the body once with totals.' },
		sort: { type: String, required: false, default: '', description: 'Sort groups by `key`, `count`, `value`, or `percent` (prefix `-` for descending). Honors SPEC-072 domain-aware ordering when the group field has one.' },
		limit: { type: String, required: false, default: '', description: 'Cap the number of groups (after sort).' },
		empty: { type: String, required: false, default: '', description: 'Fallback text shown when the query matches no entities (self-closing form; body form uses a fallback zone). Absent → render nothing.' },
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) => new Tag('meta', { 'data-field': field, content });
		const bodySource = readDeferredBody(attrs) ?? '';
		const hasBody = bodySource.length > 0;

		const metas = [
			meta('aggregate-type', String(attrs.type ?? '')),
			meta('aggregate-filter', String(attrs.filter ?? '')),
			meta('aggregate-value', String(attrs.value ?? '')),
			meta('aggregate-group', String(attrs.group ?? '')),
			meta('aggregate-sort', String(attrs.sort ?? '')),
			meta('aggregate-limit', String(attrs.limit ?? '')),
			meta('aggregate-empty', String(attrs.empty ?? '')),
			meta(AGGREGATE_SENTINEL, 'true'),
		];
		if (bodySource) metas.push(meta('aggregate-body', bodySource));

		// Self-closing form must be inline-safe (no <section> mid-prose), so the
		// outer tag is a span when there's no body. Body form is a <section>.
		return createComponentRenderable({
			rune: 'aggregate',
			tag: hasBody ? 'section' : 'span',
			properties: {},
			children: metas,
		});
	},
});
