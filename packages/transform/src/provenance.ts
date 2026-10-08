/** Where a resolved rune came from — used for inspector output, error messages, and CSS resolution */
export interface RuneProvenance {
	/** Qualified identifier: "core:hint", "marketing:hero", "local:my-widget",
	 *  "__project__:recipe-card" */
	qualifiedId: string;
	/** Source layer in the resolution order (`project`: a definition in the
	 *  project's `runes.dir`, SPEC-153) */
	source: 'core' | 'plugin' | 'local' | 'project';
	/** Plugin short name (for plugin runes), e.g. "marketing" */
	pluginName?: string;
	/** npm package name (for plugin runes) or file path (for local runes) */
	origin?: string;
}
