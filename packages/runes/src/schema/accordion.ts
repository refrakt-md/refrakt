import { PageSection } from "@refrakt-md/types";

export class Accordion extends PageSection {
	item: AccordionItem[] = [];
}

export class AccordionItem {
	name: string = '';
}
