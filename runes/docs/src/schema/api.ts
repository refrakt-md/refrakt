import { ComponentType } from "@refrakt-md/types";

export class Api {
	method: string = 'GET';
	path: string = '';
	auth: string = '';
}

export interface ApiComponent extends ComponentType<Api> {
	tag: 'article',
	properties: {
		method: 'meta',
		path: 'meta',
		auth: 'meta',
	},
	refs: {
		body: 'div',
	}
}
