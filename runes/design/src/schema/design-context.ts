import { ComponentType } from "@refrakt-md/types";

export class DesignContext {
	title: string = '';
	tokens: string = '';
}

export interface DesignContextComponent extends ComponentType<DesignContext> {
	tag: 'section',
	properties: {
		title: 'meta',
		tokens: 'meta',
	},
	refs: {}
}
