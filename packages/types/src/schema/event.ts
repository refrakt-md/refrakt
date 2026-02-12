import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class Event extends PageSection {
	date: string = '';
	endDate: string = '';
	location: string = '';
	url: string = '';
}

export interface EventProperties extends PageSectionProperties {
	date: 'meta',
	endDate: 'meta',
	location: 'meta',
	url: 'meta',
}

export interface EventComponent extends ComponentType<Event> {
	tag: 'article',
	properties: EventProperties,
	refs: {
		body: 'div',
	}
}
