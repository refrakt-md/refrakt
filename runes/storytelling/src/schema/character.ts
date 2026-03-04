import { StorySection } from "./story-section.js";

export class Character {
	name: string = '';
	role: string = 'supporting';
	status: string = 'alive';
	aliases: string = '';
	tags: string = '';
	section: StorySection[] = [];
}
