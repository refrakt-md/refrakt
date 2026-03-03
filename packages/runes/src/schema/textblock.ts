import { ComponentType } from "@refrakt-md/types";

export class TextBlock {
	dropcap: boolean = false;
	columns: number = 1;
	lead: boolean = false;
	align: string = 'left';
}

export interface TextBlockComponent extends ComponentType<TextBlock> {
	tag: 'div',
	properties: {
		dropcap: 'meta',
		columns: 'meta',
		lead: 'meta',
		align: 'meta',
	},
	refs: {
		body: 'div',
	}
}
