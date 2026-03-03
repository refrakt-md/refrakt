import { ComponentType } from "@refrakt-md/types";

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
