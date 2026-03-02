import { ComponentType } from "../interfaces.js";
import { StorySection } from "./story-section.js";

export class Character {
	name: string = '';
	role: string = 'supporting';
	status: string = 'alive';
	aliases: string = '';
	tags: string = '';
	section: StorySection[] = [];
}

export interface CharacterComponent extends ComponentType<Character> {
	tag: 'article',
	properties: {
		name: 'span',
		role: 'meta',
		status: 'meta',
		aliases: 'meta',
		tags: 'meta',
		section: 'div',
	},
	refs: {
		portrait: 'div',
		sections: 'div',
		body: 'div',
	}
}
