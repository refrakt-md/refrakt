import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class CastMember {
	name: string = '';
	role: string = '';
}

export interface CastMemberComponent extends ComponentType<CastMember> {
	tag: 'li',
	properties: {
		name: 'span',
		role: 'span',
	},
	refs: {
		body: 'div',
	}
}

export class Cast extends PageSection {
	member: CastMember[] = [];
	layout: string = 'grid';
}

export interface CastProperties extends PageSectionProperties {
	member: 'li',
	layout: 'meta',
}

export interface CastComponent extends ComponentType<Cast> {
	tag: 'section',
	properties: CastProperties,
	refs: {
		members: 'ul',
	}
}
