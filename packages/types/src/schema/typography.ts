import { ComponentType } from "../interfaces.js";

export class TypographySpecimen {
	role: string = '';
	family: string = '';
	weights: number[] = [];
}

export class Typography {
	title: string = '';
	sample: string = 'The quick brown fox jumps over the lazy dog';
	showSizes: boolean = true;
	showWeights: boolean = true;
	showCharset: boolean = false;
}

export interface TypographyComponent extends ComponentType<Typography> {
	tag: 'section',
	properties: {
		title: 'meta',
		sample: 'meta',
		showSizes: 'meta',
		showWeights: 'meta',
		showCharset: 'meta',
	},
	refs: {
		specimens: 'div',
	}
}
