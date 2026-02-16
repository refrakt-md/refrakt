import { ComponentType } from "../interfaces.js";
import { Command, LinkItem } from "./common.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class Hero extends PageSection {
	background: string = '';
	backgroundImage: string = '';
	align: string = 'center';
	action: (LinkItem | Command)[] = [];
}

export interface HeroComponent extends ComponentType<Hero> {
	tag: 'section',
	properties: PageSectionProperties & {
		background: 'meta',
		backgroundImage: 'meta',
		align: 'meta',
		action: 'li' | 'div',
	},
	refs: {
		actions: 'div',
		body: 'div',
	}
}
