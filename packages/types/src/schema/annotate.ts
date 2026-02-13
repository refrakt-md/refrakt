import { ComponentType } from "../interfaces.js";

export class AnnotateNote {
}

export interface AnnotateNoteComponent extends ComponentType<AnnotateNote> {
	tag: 'aside',
	properties: {},
	refs: {
		body: 'div',
	}
}

export class Annotate {
	style: string = 'margin';
}

export interface AnnotateComponent extends ComponentType<Annotate> {
	tag: 'div',
	properties: {
		note: 'aside',
		style: 'meta',
	},
	refs: {
		body: 'div',
	}
}
