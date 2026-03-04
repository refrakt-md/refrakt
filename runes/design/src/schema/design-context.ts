import { ComponentType } from "@refrakt-md/types";

export class DesignContext {
	title: string = '';
	tokens: string = '';
	scope: string = 'default';
}

export interface DesignContextComponent extends ComponentType<DesignContext> {
	tag: 'section',
	properties: {
		title: 'meta',
		tokens: 'meta',
		scope: 'meta',
	},
	refs: {}
}
