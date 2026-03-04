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
