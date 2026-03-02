import { ComponentType } from "../interfaces.js";

export class Lore {
	title: string = '';
	category: string = '';
	spoiler: string = 'false';
	tags: string = '';
}

export interface LoreComponent extends ComponentType<Lore> {
	tag: 'article',
	properties: {
		title: 'span',
		category: 'meta',
		spoiler: 'meta',
		tags: 'meta',
	},
	refs: {
		body: 'div',
	}
}
