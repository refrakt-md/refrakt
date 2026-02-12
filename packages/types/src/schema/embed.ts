import { ComponentType } from "../interfaces.js";

export class Embed {
	url: string = '';
	type: string = '';
	aspect: string = '16:9';
	title: string = '';
	embedUrl: string = '';
	provider: string = '';
}

export interface EmbedComponent extends ComponentType<Embed> {
	tag: 'figure',
	properties: {
		url: 'meta',
		type: 'meta',
		aspect: 'meta',
		title: 'meta',
		embedUrl: 'meta',
		provider: 'meta',
	},
	refs: {
		fallback: 'div',
	}
}
