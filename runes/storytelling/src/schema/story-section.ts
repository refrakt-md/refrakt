import { ComponentType } from "@refrakt-md/types";

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
