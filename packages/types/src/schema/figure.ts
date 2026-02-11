import { ComponentType } from "../interfaces.js";

export class Figure {
	caption: string = '';
	size: string = '';
	align: string = '';
}

export interface FigureComponent extends ComponentType<Figure> {
	tag: 'figure',
	properties: {
		caption: 'figcaption',
		size: 'meta',
		align: 'meta',
	},
	refs: {}
}
