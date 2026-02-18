import { ComponentType } from "../interfaces.js";

export class Sandbox {
	framework: string = '';
	dependencies: string = '';
	label: string = '';
	height: string = 'auto';
	content: string = '';
}

export interface SandboxComponent extends ComponentType<Sandbox> {
	tag: 'div',
	properties: {
		framework: 'meta',
		dependencies: 'meta',
		label: 'meta',
		height: 'meta',
		content: 'meta',
	},
	refs: {}
}
