import { PageSection } from "@refrakt-md/types";

export class TimelineEntry {
	date: string = '';
	label: string = '';
}

export class Timeline extends PageSection {
	entry: TimelineEntry[] = [];
	direction: string = 'vertical';
}
