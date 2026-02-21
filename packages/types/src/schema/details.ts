import { ComponentType } from "../interfaces.js";

export class Details {
	summary: string = '';
}

export interface DetailsComponent extends ComponentType<Details> {
	tag: 'details',
	properties: {
		summary: 'summary',
	},
	refs: {
		body: 'div',
	}
}
