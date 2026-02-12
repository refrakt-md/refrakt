import { ComponentType } from "../interfaces.js";

export class Diagram {
	language: string = 'mermaid';
	title: string = '';
}

export interface DiagramComponent extends ComponentType<Diagram> {
	tag: 'figure',
	properties: {
		language: 'meta',
		title: 'meta',
	},
	refs: {
		source: 'meta',
	}
}
