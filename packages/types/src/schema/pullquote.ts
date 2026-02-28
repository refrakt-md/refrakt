import { ComponentType } from "../interfaces.js";

export class PullQuote {
	align: string = 'center';
	style: string = 'default';
}

export interface PullQuoteComponent extends ComponentType<PullQuote> {
	tag: 'blockquote',
	properties: {
		align: 'meta',
		style: 'meta',
	},
	refs: {}
}
