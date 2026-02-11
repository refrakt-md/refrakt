import { ComponentType } from "../interfaces.js";

export class Details {
	summary: string = '';
	open: boolean = false;
}

export interface DetailsComponent extends ComponentType<Details> {
	tag: 'section',
	properties: {
		summary: 'span',
		open: 'meta',
	},
	refs: {
		body: 'div',
	}
}
