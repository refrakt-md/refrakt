import { PageSection } from "@refrakt-md/types";

export class BentoCell {
	size: 'large' | 'medium' | 'small' = 'small';
	name: string = '';
}

export class Bento extends PageSection {
	cell: BentoCell[] = [];
}
