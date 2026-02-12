/** Options passed to the refrakt() plugin factory */
export interface RefractPluginOptions {
	/** Path to refrakt.config.json (default: './refrakt.config.json') */
	configPath?: string;
	/** Additional packages to add to ssr.noExternal */
	noExternal?: string[];
}
