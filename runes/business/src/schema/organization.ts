import { ComponentType, PageSection, PageSectionProperties } from "@refrakt-md/types";

export class Organization extends PageSection {
	type: string = 'Organization';
}

export interface OrganizationProperties extends PageSectionProperties {
	type: 'meta',
}

export interface OrganizationComponent extends ComponentType<Organization> {
	tag: 'article',
	properties: OrganizationProperties,
	refs: {
		body: 'div',
	}
}
