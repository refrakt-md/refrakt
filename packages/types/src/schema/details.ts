import { ComponentType } from "../interfaces.js";

export class Details {
	// summary and open are now handled via <summary> element and root attribute
	// rather than property-tagged children
}

export interface DetailsComponent extends ComponentType<Details> {
	tag: 'details',
	properties: {},
	refs: {
		body: 'div',
	}
}
