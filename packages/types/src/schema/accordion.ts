import { ComponentType, PropertyNodes } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class Accordion extends PageSection {
	item: AccordionItem[] = [];
}

export interface AccordionProperties extends PageSectionProperties {
	item: 'div',
}

export interface AccordionComponent extends ComponentType<Accordion> {
	tag: 'section',
	properties: AccordionProperties,
	refs: {
		items: 'div',
	}
}

export class AccordionItem {
	name: string = '';
}

export interface AccordionItemComponent extends ComponentType<AccordionItem> {
	tag: 'div',
	properties: {
		name: 'span',
	},
	refs: {
		body: 'div',
	}
}
