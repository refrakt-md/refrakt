import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	readDeferredBody,
	COLLECTION_SENTINEL,
} from '@refrakt-md/runes';

const DEFAULT_PLAN_ACTIVITY_BODY = `# Item
{% link href=$item.url %}**{% $item.id %}** — {% $item.data.title %}{% /link %}
# Type
{% humanize($item.type) %}
# Status
{% humanize($item.data.status) %}
# Modified
{% date($item.data.modified) %}
`;

export const planActivity = createContentModelSchema({
	attributes: {
		limit: {
			type: Number,
			required: false,
			default: 10,
			description: 'Maximum number of recent items to show.',
		},
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) =>
			new Tag('meta', { 'data-field': field, content });
		const bodySource = readDeferredBody(attrs) ?? DEFAULT_PLAN_ACTIVITY_BODY;
		const limit = attrs.limit ?? 10;

		const metas = [
			meta('collection-type', 'work,bug,spec,decision,milestone'),
			meta('collection-filter', ''),
			meta('collection-sort', '-modified'),
			meta('collection-group', ''),
			meta('collection-limit', String(limit)),
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
