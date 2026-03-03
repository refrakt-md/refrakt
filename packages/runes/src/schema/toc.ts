import { ComponentType } from "@refrakt-md/types";

export class TableOfContents {
	depth: number = 3;
	ordered: boolean = false;
}

export interface TableOfContentsComponent extends ComponentType<TableOfContents> {
	tag: 'nav',
	properties: {
		depth: 'meta',
		ordered: 'meta',
	},
	refs: {
		list: 'ul',
	}
}
