import { PageSection } from "@refrakt-md/types";

export class RevealStep {
	name: string = '';
}

export class Reveal extends PageSection {
	step: RevealStep[] = [];
}
