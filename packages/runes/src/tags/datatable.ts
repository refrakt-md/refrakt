import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

export const datatable = createContentModelSchema({
	attributes: {
		sortable: { type: String, required: false, description: 'Column names to enable sorting, or "all"' },
		searchable: { type: Boolean, required: false, description: 'Show a search input to filter rows' },
		pageSize: { type: Number, required: false, description: 'Rows per page; 0 disables pagination' },
		defaultSort: { type: String, required: false, description: 'Column to sort by initially' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const sortableMeta = new Tag('meta', { content: attrs.sortable ?? '' });
		const searchableMeta = new Tag('meta', { content: String(attrs.searchable ?? false) });
		const pageSizeMeta = new Tag('meta', { content: String(attrs.pageSize ?? 0) });
		const defaultSortMeta = new Tag('meta', { content: attrs.defaultSort ?? '' });

		// Find the table element from children (may be wrapped in div.rf-table-wrapper)
		let tableTag: InstanceType<typeof Tag>;
		const directTable = children.tag('table');
		if (directTable.count() > 0) {
			tableTag = directTable.next();
		} else {
			// Unwrap from rf-table-wrapper div
			const wrapper = children.toArray().find(
				n => Tag.isTag(n) && n.name === 'div' && n.attributes.class === 'rf-table-wrapper'
			);
			const inner = wrapper && Tag.isTag(wrapper)
				? wrapper.children.find((c: any) => Tag.isTag(c) && c.name === 'table')
				: undefined;
			tableTag = (inner && Tag.isTag(inner) ? inner : new Tag('table', {}, [])) as InstanceType<typeof Tag>;
		}

		return createComponentRenderable({ rune: 'data-table', schemaOrgType: 'Dataset',
			tag: 'div',
			properties: {
				sortable: sortableMeta,
				searchable: searchableMeta,
				pageSize: pageSizeMeta,
				defaultSort: defaultSortMeta,
			},
			refs: {
				table: tableTag,
			},
			children: [sortableMeta, searchableMeta, pageSizeMeta, defaultSortMeta, tableTag],
		});
	},
});
