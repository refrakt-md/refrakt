import { Command, LinkItem, PageSection } from "@refrakt-md/types";

export class Hero extends PageSection {
	background: string = '';
	backgroundImage: string = '';
	align: string = 'center';
	action: (LinkItem | Command)[] = [];
}
