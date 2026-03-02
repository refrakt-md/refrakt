import { ComponentType } from "../interfaces.js";

export class Bond {
	from: string = '';
	to: string = '';
	bondType: string = '';
	status: string = 'active';
	bidirectional: string = 'true';
}

export interface BondComponent extends ComponentType<Bond> {
	tag: 'div',
	properties: {
		from: 'span',
		to: 'span',
		bondType: 'meta',
		status: 'meta',
		bidirectional: 'meta',
	},
	refs: {
		body: 'div',
	}
}
