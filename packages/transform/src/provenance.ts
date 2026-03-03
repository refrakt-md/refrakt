/** Where a resolved rune came from — used for inspector output, error messages, and CSS resolution */
export interface RuneProvenance {
	/** Qualified identifier: "core:hint", "marketing:hero", "local:my-widget" */
	qualifiedId: string;
	/** Source layer in the resolution order */
	source: 'core' | 'package' | 'local';
	/** Package short name (for package runes), e.g. "marketing" */
	packageName?: string;
	/** npm package name (for package runes) or file path (for local runes) */
	origin?: string;
}
