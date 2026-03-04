import { ComponentType } from "@refrakt-md/types";

export class Sandbox {
	framework: string = '';
	dependencies: string = '';
	label: string = '';
	height: string = 'auto';
	content: string = '';
	context: string = 'default';
}

export interface SandboxComponent extends ComponentType<Sandbox> {
	tag: 'div',
	properties: {
		framework: 'meta',
		dependencies: 'meta',
		label: 'meta',
		height: 'meta',
		content: 'meta',
		context: 'meta',
	},
	refs: {}
}
