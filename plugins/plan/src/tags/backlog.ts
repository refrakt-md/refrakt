import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	createComponentRenderable,
	readDeferredBody,
	COLLECTION_SENTINEL,
} from '@refrakt-md/runes';

const SHOW_TO_TYPE: Record<string, string> = {
	all: 'work,bug',
	work: 'work',
	bug: 'bug',
	spec: 'spec',
	decision: 'decision',
	milestone: 'milestone',
};

const TYPE_FIELD: Record<string, string> = { work: 'priority', bug: 'severity' };

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
		filter: {
			type: String,
			required: false,
			default: '',
			description:
				'Filter: space-separated field:value pairs (e.g., "status:ready priority:high").',
		},
		sort: {
			type: String,
			required: false,
			default: 'priority',
			description: 'Sort field (prefix - for descending). Default: priority.',
		},
		group: {
			type: String,
			required: false,
			default: 'status',
			description:
				'Group by field: status, priority, assignee, milestone, type, tags. A multi-value field such as tags puts an item in one group per value. Default: status.',
		},
		show: {
			type: String,
			required: false,
			default: 'all',
			description: 'Entity types: all (work + bug), work, bug, spec, decision, milestone.',
		},
		layout: {
			type: String,
			required: false,
			default: 'cards',
			matches: ['cards', 'list', 'table'],
			description:
				'How items are laid out: cards (default), list, or table. Forwarded to the underlying collection.',
		},
		limit: {
			type: Number,
			required: false,
			description: 'Cap the number of entities rendered (applied after sort, before group).',
		},
		'group-display': {
			type: String,
			required: false,
			default: 'headings',
			matches: ['headings', 'accordion'],
			description: 'How groups are presented when `group` is set: headings (default) or accordion.',
		},
	},
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const meta = (field: string, content: string) =>
			new Tag('meta', { 'data-field': field, content });
		const layout = String(attrs.layout ?? 'cards');
		const showVal = String(attrs.show ?? 'all');
		const type = SHOW_TO_TYPE[showVal] ?? showVal;

		const singleType = type.includes(',') ? '' : type;
		const bodySource =
			readDeferredBody(attrs) ??
			(layout === 'table' ? DEFAULT_TABLE_BODY : cardBody(TYPE_FIELD[singleType]));

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
