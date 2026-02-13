import { ComponentType, PropertyNodes } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class BentoCell {
	size: 'large' | 'medium' | 'small' = 'small';
	name: string = '';
}

export interface BentoCellComponent extends ComponentType<BentoCell> {
	tag: 'div',
	properties: {
		size: 'meta',
		name: 'span',
	},
	refs: {
		body: 'div',
	}
}

export class Bento extends PageSection {
	cell: BentoCell[] = [];
}

export interface BentoProperties extends PageSectionProperties {
	cell: 'div',
}

export interface BentoComponent extends ComponentType<Bento> {
	tag: 'section',
	properties: BentoProperties,
	refs: {
		grid: 'div',
	}
}
