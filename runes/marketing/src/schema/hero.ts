import { Command, LinkItem, PageSection } from "@refrakt-md/types";

export class Hero extends PageSection {
	align: string = 'center';
	action: (LinkItem | Command)[] = [];
}
