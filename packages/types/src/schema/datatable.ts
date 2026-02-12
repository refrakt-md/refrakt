import { ComponentType } from "../interfaces.js";

export class DataTable {
	sortable: string = '';
	searchable: boolean = false;
	pageSize: number = 0;
	defaultSort: string = '';
}

export interface DataTableComponent extends ComponentType<DataTable> {
	tag: 'div',
	properties: {
		sortable: 'meta',
		searchable: 'meta',
		pageSize: 'meta',
		defaultSort: 'meta',
	},
	refs: {
		table: 'table',
	}
}
