import { ComponentType } from "../interfaces.js";

export class PaletteEntry {
	name: string = '';
	value: string = '';
	/** Comma-separated values for neutral scales */
	values: string[] = [];
}

export class PaletteGroup {
	title: string = '';
	entries: PaletteEntry[] = [];
}

export class Palette {
	title: string = '';
	showContrast: boolean = false;
	showA11y: boolean = false;
	columns: number | undefined = undefined;
}

export interface PaletteComponent extends ComponentType<Palette> {
	tag: 'section',
	properties: {
		title: 'meta',
		showContrast: 'meta',
		showA11y: 'meta',
		columns: 'meta',
	},
	refs: {
		grid: 'div',
	}
}
