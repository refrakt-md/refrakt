import { ComponentType } from "@refrakt-md/types";

export class Sidenote {
	style: string = 'sidenote';
}

export interface SidenoteComponent extends ComponentType<Sidenote> {
	tag: 'aside',
	properties: {
		style: 'meta',
	},
	refs: {
		body: 'div',
	}
}
