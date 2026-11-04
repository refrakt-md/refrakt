import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	readDeferredBody,
	COLLECTION_SENTINEL,
} from '@refrakt-md/runes';

const DEFAULT_DECISION_LOG_BODY = `# Decision
{% link href=$item.url %}**{% $item.id %}** — {% $item.data.title %}{% /link %}
# Status
{% humanize($item.data.status) %}
# Date
{% date($item.data.date) %}
`;

export const decisionLog = createContentModelSchema({
	attributes: {
		filter: {
			type: String,
			required: false,
			default: '',
			description: 'Filter: space-separated field:value pairs (e.g., "status:accepted").',
		},
		sort: {
			type: String,
			required: false,
			default: 'date',
			description:
				"Sort field. Bare `date` is reverse chronological (matches the rune's historical contract); use `+date` for ascending or any other field for the natural order.",
		},
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) =>
			new Tag('meta', { 'data-field': field, content });
		const bodySource = readDeferredBody(attrs) ?? DEFAULT_DECISION_LOG_BODY;

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
