import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

export const datatable = createContentModelSchema({
	attributes: {
		sortable: { type: String, required: false },
		searchable: { type: Boolean, required: false },
		pageSize: { type: Number, required: false },
		defaultSort: { type: String, required: false },
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

		// Find the table element from children
		const table = children.tag('table');
		const tableTag = table.count() > 0 ? table.next() : new Tag('table', {}, []);

		return createComponentRenderable(schema.DataTable, {
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
