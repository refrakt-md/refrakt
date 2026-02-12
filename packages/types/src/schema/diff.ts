import { ComponentType } from "../interfaces.js";

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
	refs: {
		before: 'pre',
		after: 'pre',
	}
}
