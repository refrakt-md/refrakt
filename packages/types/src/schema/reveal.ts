import { ComponentType, PropertyNodes } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class RevealStep {
	name: string = '';
}

export interface RevealStepComponent extends ComponentType<RevealStep> {
	tag: 'div',
	properties: {
		name: 'span',
	},
	refs: {
		body: 'div',
	}
}

export class Reveal extends PageSection {
	step: RevealStep[] = [];
}

export interface RevealProperties extends PageSectionProperties {
	step: 'div',
}

export interface RevealComponent extends ComponentType<Reveal> {
	tag: 'section',
	properties: RevealProperties,
	refs: {
		steps: 'div',
	}
}
