import { ComponentType } from "../interfaces.js";

export class Beat {
	label: string = '';
	status: string = 'planned';
	id: string = '';
	track: string = '';
	follows: string = '';
}

export interface BeatComponent extends ComponentType<Beat> {
	tag: 'li',
	properties: {
		label: 'span',
		status: 'meta',
		id: 'meta',
		track: 'meta',
		follows: 'meta',
	},
	refs: {
		body: 'div',
	}
}

export class Plot {
	title: string = '';
	plotType: string = 'arc';
	structure: string = 'linear';
	tags: string = '';
	beat: Beat[] = [];
}

export interface PlotComponent extends ComponentType<Plot> {
	tag: 'section',
	properties: {
		title: 'span',
		plotType: 'meta',
		structure: 'meta',
		tags: 'meta',
		beat: 'li',
	},
	refs: {
		beats: 'ol',
	}
}
