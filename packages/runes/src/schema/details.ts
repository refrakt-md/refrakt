import { ComponentType } from "@refrakt-md/types";

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
