import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class ChangelogRelease {
	version: string = '';
	date: string = '';
}

export interface ChangelogReleaseComponent extends ComponentType<ChangelogRelease> {
	tag: 'section',
	properties: {
		version: 'h3',
		date: 'time',
	},
	refs: {
		body: 'div',
	}
}

export class Changelog extends PageSection {
	release: ChangelogRelease[] = [];
	project: string = '';
}

export interface ChangelogProperties extends PageSectionProperties {
	release: 'section',
}

export interface ChangelogComponent extends ComponentType<Changelog> {
	tag: 'section',
	properties: ChangelogProperties & {
		project: 'meta',
	},
	refs: {
		releases: 'div',
	}
}
