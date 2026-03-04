import { StorySection } from "./story-section.js";

export class Realm {
	name: string = '';
	realmType: string = 'place';
	scale: string = '';
	tags: string = '';
	parent: string = '';
	section: StorySection[] = [];
}
