import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class TimelineEntry {
	date: string = '';
	label: string = '';
}

export interface TimelineEntryComponent extends ComponentType<TimelineEntry> {
	tag: 'li',
	properties: {
		date: 'time',
		label: 'span',
	},
	refs: {
		body: 'div',
	}
}

export class Timeline extends PageSection {
	entry: TimelineEntry[] = [];
	direction: string = 'vertical';
}

export interface TimelineProperties extends PageSectionProperties {
	entry: 'li',
}

export interface TimelineComponent extends ComponentType<Timeline> {
	tag: 'section',
	properties: TimelineProperties & {
		direction: 'meta',
	},
	refs: {
		entries: 'ol',
	}
}
