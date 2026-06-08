import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, readDeferredBody, AGGREGATE_SENTINEL } from '@refrakt-md/runes';

/**
 * `plan-progress` (SPEC-076 / WORK-296) — thin sugar over `aggregate`, the same
 * pattern decision-log / plan-activity use over `collection`. It lowers to an
 * `aggregate` composition — a `progress` bar in the preamble + a per-status
 * `badge` row in the template + an empty fallback — so the shared
 * `resolveAggregates` resolver computes the counts and bindings. There is no
 * plan-side render path.
 *
 * Plan-specific defaults are baked in:
 *  - `type` defaults to the actionable set `work,bug` (widen via `type=` or the
 *    legacy `show=`; `show="all"` is the full plan set).
 *  - `group="status"` so the template renders one `type="status"` badge per
 *    status. Per-status sentiment *colouring* is deferred: the `badge` rune keys
 *    colour off `data-meta-sentiment`, and projecting a per-group sentiment onto
 *    `$item` is SPEC-076's future extension (follow-up work item) — badges render
 *    neutral until then.
 *  - `value` defaults to the achieved-status union (decision: option C) — a
 *    single regex clause unioning each type's terminal-positive status. Correct
 *    over a mixed set because the names don't cross-contaminate (work→`done`,
 *    bug→`fixed`, decision→`accepted`, milestone→`complete`). Author-overridable;
 *    schema-declared `achievedStatus` auto-derivation is the WORK-343 follow-up.
 *  - `milestone=` is friendly sugar that lowers to `filter="milestone:…"`.
 */

const ACHIEVED_STATUS_UNION = 'status:/^(done|fixed|accepted|complete)$/';

const DEFAULT_PLAN_PROGRESS_BODY = `{% progress value=$item.value max=$item.count %}{% $item.value %} of {% $item.count %} done{% /progress %}
---
{% badge type="status" %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No plan items yet.
`;

export const planProgress = createContentModelSchema({
	attributes: {
		type: { type: String, required: false, default: '', description: 'Entity type(s) to measure, comma-separated. Default: work,bug.' },
		show: { type: String, required: false, default: '', description: 'Legacy alias for `type`; `all` expands to the full plan set.' },
		milestone: { type: String, required: false, default: '', description: 'Scope to a milestone — lowers to filter="milestone:…".' },
		filter: { type: String, required: false, default: '', description: 'Raw field:value filter clauses (SPEC-070 grammar); overrides `milestone`.' },
		value: { type: String, required: false, default: '', description: 'Achieved-subset clause for the progress ratio. Default: the terminal-positive status union.' },
		sort: { type: String, required: false, default: '', description: 'Sort the status groups (passes through to aggregate).' },
		limit: { type: String, required: false, default: '', description: 'Cap the number of status groups (passes through to aggregate).' },
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) => new Tag('meta', { 'data-field': field, content });

		const show = String(attrs.show ?? '');
		const type = String(attrs.type ?? '')
			|| (show ? (show === 'all' ? 'work,bug,spec,decision,milestone' : show) : 'work,bug');

		const filter = String(attrs.filter ?? '')
			|| (attrs.milestone ? `milestone:${attrs.milestone}` : '');

		const bodySource = readDeferredBody(attrs) ?? DEFAULT_PLAN_PROGRESS_BODY;

		const metas = [
			meta('aggregate-type', type),
			meta('aggregate-filter', filter),
			meta('aggregate-value', String(attrs.value ?? '') || ACHIEVED_STATUS_UNION),
			meta('aggregate-group', 'status'),
			meta('aggregate-sort', String(attrs.sort ?? '')),
			meta('aggregate-limit', String(attrs.limit ?? '')),
			meta('aggregate-empty', ''),
			meta(AGGREGATE_SENTINEL, 'true'),
			meta('aggregate-body', bodySource),
		];

		return createComponentRenderable({
			rune: 'aggregate',
			tag: 'section',
			properties: {},
			children: metas,
		});
	},
});
