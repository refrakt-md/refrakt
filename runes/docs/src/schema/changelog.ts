import { PageSection } from "@refrakt-md/types";

export class ChangelogRelease {
	version: string = '';
	date: string = '';
}

export class Changelog extends PageSection {
	release: ChangelogRelease[] = [];
	project: string = '';
}
