import { ComponentType } from "../interfaces.js";

export class SpacingScale {
	unit: string = '';
	scale: string[] = [];
}

export class SpacingRadius {
	name: string = '';
	value: string = '';
}

export class SpacingShadow {
	name: string = '';
	value: string = '';
}

export class Spacing {
	title: string = '';
}

export interface SpacingComponent extends ComponentType<Spacing> {
	tag: 'section',
	properties: {
		title: 'meta',
	},
	refs: {
		sections: 'div',
	}
}
