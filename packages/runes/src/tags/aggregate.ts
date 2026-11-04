import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '../lib/index.js';
import { readDeferredBody } from '../deferred-body.js';

export const AGGREGATE_SENTINEL = '__aggregate-sentinel';

export const aggregate = createContentModelSchema({
	attributes: {
		type: {
			type: String,
			required: false,
			default: '',
			description: 'Entity type(s), comma-separated.',
		},
		filter: {
			type: String,
			required: false,
			default: '',
			description: '`field:value` clauses defining the primary set being measured.',
		},
		value: {
			type: String,
			required: false,
			default: '',
			description:
				'Optional secondary field:value clause defining the achieved subset within `filter` (e.g. value="status:done"). When set, $item.value is the count matching both; $item.percent is the ratio. Without it, the rune is a pure count + breakdown — no progress-bar semantics.',
		},
		group: {
			type: String,
			required: false,
			default: '',
			description: 'Group-by field; omit to render the body once with totals.',
		},
		sort: {
			type: String,
			required: false,
			default: '',
			description:
				"Sort groups by `key`, `count`, `value`, or `percent` (prefix `-` for descending). Follows the group field's own order when it has one.",
		},
		limit: {
			type: Number,
			required: false,
			description: 'Cap the number of groups (after sort).',
		},
		empty: {
			type: String,
			required: false,
			default: '',
			description:
				'Fallback text shown when the query matches no entities (self-closing form; body form uses a fallback zone). Absent → render nothing.',
		},
		layout: {
			type: String,
			required: false,
			default: '',
			matches: ['chart'],
			description:
				"Render mode. Default: inline integer (no body) or body-zoned template. `chart` draws the grouped counts as an SVG via the `chart` rune's pipeline instead of a body.",
		},
		'chart-type': {
			type: String,
			required: false,
			default: 'bar',
			matches: ['bar', 'line', 'area', 'pie'],
			description: 'Chart visualization type when layout="chart" (default bar).',
		},
		'chart-title': {
			type: String,
			required: false,
			default: '',
			description: 'Title for the chart (rendered as the data table caption) when layout="chart".',
		},
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) =>
			new Tag('meta', { 'data-field': field, content });
		const bodySource = readDeferredBody(attrs) ?? '';
		const hasBody = bodySource.length > 0;
		const layout = String(attrs.layout ?? '');

		const metas = [
			meta('aggregate-type', String(attrs.type ?? '')),
			meta('aggregate-filter', String(attrs.filter ?? '')),
			meta('aggregate-value', String(attrs.value ?? '')),
			meta('aggregate-group', String(attrs.group ?? '')),
			meta('aggregate-sort', String(attrs.sort ?? '')),
			meta('aggregate-limit', String(attrs.limit ?? '')),
			meta('aggregate-empty', String(attrs.empty ?? '')),
			meta('aggregate-layout', layout),
			meta('aggregate-chart-type', String(attrs['chart-type'] ?? 'bar')),
			meta('aggregate-chart-title', String(attrs['chart-title'] ?? '')),
			meta(AGGREGATE_SENTINEL, 'true'),
		];
		if (bodySource) metas.push(meta('aggregate-body', bodySource));

		return createComponentRenderable({
			rune: 'aggregate',
			tag: hasBody || layout === 'chart' ? 'section' : 'span',
			properties: {},
			children: metas,
		});
	},
});
