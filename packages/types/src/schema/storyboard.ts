import { ComponentType } from "../interfaces.js";

export class StoryboardPanel {
}

export interface StoryboardPanelComponent extends ComponentType<StoryboardPanel> {
	tag: 'div',
	properties: {
		image: 'img',
		caption: 'p',
	},
	refs: {
		body: 'div',
	}
}

export class Storyboard {
	columns: number = 3;
	style: string = 'clean';
	panel: StoryboardPanel[] = [];
}

export interface StoryboardComponent extends ComponentType<Storyboard> {
	tag: 'div',
	properties: {
		panel: 'div',
		style: 'meta',
		columns: 'meta',
	},
	refs: {
		panels: 'div',
	}
}
