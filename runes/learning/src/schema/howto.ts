import { ComponentType, PageSection, PageSectionProperties } from "@refrakt-md/types";

export class HowTo extends PageSection {
	estimatedTime: string = '';
	difficulty: string = '';
}

export interface HowToProperties extends PageSectionProperties {
	estimatedTime: 'meta',
	difficulty: 'meta',
}

export interface HowToComponent extends ComponentType<HowTo> {
	tag: 'article',
	properties: HowToProperties,
	refs: {
		tools: 'ul',
		steps: 'ol',
	}
}
