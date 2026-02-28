import { ComponentType } from "../interfaces.js";

export class Mockup {
	device: string = 'browser';
	label: string = '';
	color: string = 'dark';
	statusBar: string = 'true';
	url: string = '';
	scale: string = '1';
}

export interface MockupComponent extends ComponentType<Mockup> {
	tag: 'div',
	properties: {
		device: 'meta',
		label: 'meta',
		color: 'meta',
		statusBar: 'meta',
		url: 'meta',
		scale: 'meta',
	},
	refs: {
		viewport: 'div',
	}
}
