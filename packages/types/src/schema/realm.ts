import { ComponentType } from "../interfaces.js";
import { StorySection } from "./story-section.js";

export class Realm {
	name: string = '';
	realmType: string = 'place';
	scale: string = '';
	tags: string = '';
	parent: string = '';
	section: StorySection[] = [];
}

export interface RealmComponent extends ComponentType<Realm> {
	tag: 'article',
	properties: {
		name: 'span',
		realmType: 'meta',
		scale: 'meta',
		tags: 'meta',
		parent: 'meta',
		section: 'div',
	},
	refs: {
		scene: 'div',
		sections: 'div',
		body: 'div',
	}
}
