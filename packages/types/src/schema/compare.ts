import { ComponentType } from "../interfaces.js";

export class Compare {
	layout: string = 'side-by-side';
}

export interface CompareComponent extends ComponentType<Compare> {
	tag: 'div',
	properties: {
		layout: 'meta',
	},
	refs: {
		panels: 'div',
	}
}
