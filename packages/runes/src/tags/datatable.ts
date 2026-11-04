import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
} from '../lib/index.js';

export const dataTableSections = { table: 'body' } as const;

export const datatable = createContentModelSchema({
	sections: dataTableSections,
	attributes: {
		sortable: {
			type: String,
			required: false,
			description: 'Column names to enable sorting, or "all"',
		},
		searchable: {
			type: Boolean,
			required: false,
			description: 'Show a search input to filter rows',
		},
		pageSize: {
			type: Number,
			required: false,
			description: 'Rows per page; 0 disables pagination',
		},
		defaultSort: { type: String, required: false, description: 'Column to sort by initially' },
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const children = renderNodes(resolved.body, config);

		const sortableMeta = new Tag('meta', { content: attrs.sortable ?? '' });
		const searchableMeta = new Tag('meta', { content: String(attrs.searchable ?? false) });
		const pageSizeMeta = new Tag('meta', { content: String(attrs.pageSize ?? 0) });
		const defaultSortMeta = new Tag('meta', { content: attrs.defaultSort ?? '' });

		let tableTag: InstanceType<typeof Tag>;
		const directTable = children.tag('table');
		if (directTable.count() > 0) {
			tableTag = directTable.next();
		} else {
			const wrapper = children
				.toArray()
				.find((n) => Tag.isTag(n) && n.name === 'div' && n.attributes.class === 'rf-table-wrapper');
			const inner =
				wrapper && Tag.isTag(wrapper)
					? wrapper.children.find((c: any) => Tag.isTag(c) && c.name === 'table')
					: undefined;
			tableTag = (inner && Tag.isTag(inner) ? inner : new Tag('table', {}, [])) as InstanceType<
				typeof Tag
			>;
		}

		const scrollDiv = new Tag('div', {}, [tableTag]);

		return createComponentRenderable({
			rune: 'data-table',
			tag: 'div',
			properties: {
				sortable: sortableMeta,
				searchable: searchableMeta,
				pageSize: pageSizeMeta,
				defaultSort: defaultSortMeta,
			},
			refs: {
				scroll: scrollDiv,
				table: tableTag,
			},
			children: [scrollDiv],
		});
	},
});
