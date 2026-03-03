import { ComponentType } from "@refrakt-md/types";

export class Chart {
	type: string = 'bar';
	title: string = '';
	stacked: boolean = false;
}

export interface ChartComponent extends ComponentType<Chart> {
	tag: 'figure',
	properties: {
		type: 'meta',
		title: 'meta',
		stacked: 'meta',
	},
	refs: {
		data: 'meta',
	}
}
