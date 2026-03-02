import { ComponentType } from "../interfaces.js";

export class StorySection {
	name: string = '';
}

export interface StorySectionComponent extends ComponentType<StorySection> {
	tag: 'div',
	properties: {
		name: 'span',
	},
	refs: {
		body: 'div',
	}
}
