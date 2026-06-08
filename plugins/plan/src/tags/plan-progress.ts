import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, AGGREGATE_SENTINEL } from '@refrakt-md/runes';

/**
 * `plan-progress` (SPEC-076 / WORK-296) — thin sugar that composes one
 * `aggregate` per entity type, so each type gets its OWN progress bar + status
 * badges (mixing types under a single ratio is misleading — work `done` and bug
 * `fixed` measure different things). The counting still lives entirely in
 * `aggregate`; plan-progress only supplies the per-type defaults and the
 * heading/layout chrome.
 *
 * Per type it emits a heading ("Work", "Specs", …) above an `aggregate` block:
 *   - `group="status"` → one `type="status"` badge per status (count + label).
 *   - `value="status:<achieved>"` → the progress bar measures that type's
 *     terminal-positive status (work→done, bug→fixed, spec/decision→accepted,
 *     milestone→complete); the bar's label is just that word ("Done"), since the
 *     progress rune already renders the count/percent on the right.
 *
 * Type set defaults to `work,bug` (widen via `type=` or the legacy `show=`;
 * `show="all"` is the full plan set). `milestone=` lowers to `filter="milestone:…"`.
 * Per-status badge *colour* is deferred (WORK-357) — badges render neutral.
 */

interface TypeProgress { label: string; achieved: string; achievedLabel: string }
const TYPE_PROGRESS: Record<string, TypeProgress> = {
	work: { label: 'Work', achieved: 'done', achievedLabel: 'Done' },
	bug: { label: 'Bugs', achieved: 'fixed', achievedLabel: 'Fixed' },
	spec: { label: 'Specs', achieved: 'accepted', achievedLabel: 'Accepted' },
	decision: { label: 'Decisions', achieved: 'accepted', achievedLabel: 'Accepted' },
	milestone: { label: 'Milestones', achieved: 'complete', achievedLabel: 'Complete' },
};

/** Per-type aggregate body: a progress bar labelled with the achieved status
 *  (numbers shown by the progress rune itself) + one badge per status. */
const bodyFor = (achievedLabel: string) =>
	`{% progress value=$item.value max=$item.count %}${achievedLabel}{% /progress %}
---
{% badge type="status" %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No items yet.
`;

export const planProgress = createContentModelSchema({
	attributes: {
		type: { type: String, required: false, default: '', description: 'Entity type(s) to chart, comma-separated. Default: work,bug.' },
		show: { type: String, required: false, default: '', description: 'Legacy alias for `type`; `all` expands to the full plan set.' },
		milestone: { type: String, required: false, default: '', description: 'Scope every bar to a milestone — lowers to filter="milestone:…".' },
		filter: { type: String, required: false, default: '', description: 'Raw field:value filter clauses (SPEC-070 grammar); overrides `milestone`.' },
		value: { type: String, required: false, default: '', description: 'Override the achieved-subset clause for every bar (default: each type\'s terminal-positive status).' },
		sort: { type: String, required: false, default: '', description: 'Sort the status groups (passes through to each aggregate).' },
		limit: { type: String, required: false, default: '', description: 'Cap the number of status groups (passes through to each aggregate).' },
	},
	selfClosing: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) => new Tag('meta', { 'data-field': field, content });

		const show = String(attrs.show ?? '');
		const typeList = (String(attrs.type ?? '')
			|| (show ? (show === 'all' ? 'work,bug,spec,decision,milestone' : show) : 'work,bug'))
			.split(',').map(s => s.trim()).filter(Boolean);

		const filter = String(attrs.filter ?? '') || (attrs.milestone ? `milestone:${attrs.milestone}` : '');
		const valueOverride = String(attrs.value ?? '');

		const groups: RenderableTreeNode[] = [];
		for (const type of typeList) {
			const tp = TYPE_PROGRESS[type];
			if (!tp) continue;

			const aggMetas = [
				meta('aggregate-type', type),
				meta('aggregate-filter', filter),
				meta('aggregate-value', valueOverride || `status:${tp.achieved}`),
				meta('aggregate-group', 'status'),
				meta('aggregate-sort', String(attrs.sort ?? '')),
				meta('aggregate-limit', String(attrs.limit ?? '')),
				meta('aggregate-empty', ''),
				meta(AGGREGATE_SENTINEL, 'true'),
				meta('aggregate-body', bodyFor(tp.achievedLabel)),
			];
			const agg = createComponentRenderable({ rune: 'aggregate', tag: 'section', properties: {}, children: aggMetas });
			const heading = new Tag('h3', { 'data-name': 'heading', 'data-type': type }, [tp.label]);
			groups.push(new Tag('div', { 'data-name': 'group', 'data-type': type }, [heading, agg as RenderableTreeNode]));
		}

		return createComponentRenderable({
			rune: 'plan-progress',
			tag: 'section',
			properties: {},
			children: groups,
		});
	},
});
