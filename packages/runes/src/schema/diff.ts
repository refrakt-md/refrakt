import { ComponentType } from "@refrakt-md/types";

export class Diff {
	mode: string = 'unified';
	language: string = '';
}

export interface DiffComponent extends ComponentType<Diff> {
	tag: 'div',
	properties: {
		mode: 'meta',
		language: 'meta',
	},
}
