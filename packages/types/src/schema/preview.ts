import { ComponentType } from "../interfaces.js";

export class Preview {
	title: string = '';
	theme: string = 'auto';
	width: string = 'wide';
}

export interface PreviewComponent extends ComponentType<Preview> {
	tag: 'div',
	properties: {
		title: 'meta',
		theme: 'meta',
		width: 'meta',
	},
	refs: {}
}
