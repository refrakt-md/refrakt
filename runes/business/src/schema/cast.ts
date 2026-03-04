import { PageSection } from "@refrakt-md/types";

export class CastMember {
	name: string = '';
	role: string = '';
}

export class Cast extends PageSection {
	member: CastMember[] = [];
	layout: string = 'grid';
}
