import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class Hero extends PageSection {
	background: string = '';
	backgroundImage: string = '';
	align: string = 'center';
}

export interface HeroComponent extends ComponentType<Hero> {
	tag: 'section',
	properties: PageSectionProperties & {
		background: 'meta',
		backgroundImage: 'meta',
		align: 'meta',
	},
	refs: {
		actions: 'div',
		body: 'div',
	}
}
