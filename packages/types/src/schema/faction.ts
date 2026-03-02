import { ComponentType } from "../interfaces.js";
import { StorySection } from "./story-section.js";

export class Faction {
	name: string = '';
	factionType: string = '';
	alignment: string = '';
	size: string = '';
	tags: string = '';
	section: StorySection[] = [];
}

export interface FactionComponent extends ComponentType<Faction> {
	tag: 'article',
	properties: {
		name: 'span',
		factionType: 'meta',
		alignment: 'meta',
		size: 'meta',
		tags: 'meta',
		section: 'div',
	},
	refs: {
		sections: 'div',
		body: 'div',
	}
}
