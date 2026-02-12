import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

class DataTableModel extends Model {
	@attribute({ type: String, required: false })
	sortable: string = '';

	@attribute({ type: Boolean, required: false })
	searchable: boolean = false;

	@attribute({ type: Number, required: false })
	pageSize: number = 0;

	@attribute({ type: String, required: false })
	defaultSort: string = '';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const sortableMeta = new Tag('meta', { content: this.sortable });
		const searchableMeta = new Tag('meta', { content: String(this.searchable) });
		const pageSizeMeta = new Tag('meta', { content: String(this.pageSize) });
		const defaultSortMeta = new Tag('meta', { content: this.defaultSort });

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
	}
}

export const datatable = createSchema(DataTableModel);
