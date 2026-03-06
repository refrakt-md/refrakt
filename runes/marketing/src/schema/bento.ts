import { PageSection } from "@refrakt-md/types";

export class BentoCell {
	size: 'full' | 'large' | 'medium' | 'small' | 'span' = 'small';
	span: number = 0;
	name: string = '';
}

export class Bento extends PageSection {
	sizing: 'tiered' | 'span' = 'tiered';
	cell: BentoCell[] = [];
}
