import { ComponentType } from "../interfaces.js";

export class BreadcrumbItem {
	name: string = '';
	url: string = '';
}

export interface BreadcrumbItemComponent extends ComponentType<BreadcrumbItem> {
	tag: 'li',
	properties: {
		name: 'span',
		url: 'a',
	},
	refs: {}
}

export class Breadcrumb {
	separator: string = '/';
}

export interface BreadcrumbComponent extends ComponentType<Breadcrumb> {
	tag: 'nav',
	properties: {
		separator: 'meta',
	},
	refs: {
		items: 'ol',
	}
}
