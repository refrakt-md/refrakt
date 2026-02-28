import { ComponentType } from "../interfaces.js";

export class MediaText {
	align: string = 'left';
	ratio: string = '1:1';
	wrap: boolean = false;
}

export interface MediaTextComponent extends ComponentType<MediaText> {
	tag: 'div',
	properties: {
		align: 'meta',
		ratio: 'meta',
		wrap: 'meta',
	},
	refs: {
		media: 'div',
		body: 'div',
	}
}
