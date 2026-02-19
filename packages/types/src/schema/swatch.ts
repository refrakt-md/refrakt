import { ComponentType } from "../interfaces.js";

export class Swatch {
	color: string = '';
	label: string = '';
	showValue: boolean = false;
}

export interface SwatchComponent extends ComponentType<Swatch> {
	tag: 'span',
	properties: {
		color: 'meta',
		label: 'span',
		showValue: 'meta',
	},
	refs: {
		chip: 'span',
		value: 'span',
	}
}
