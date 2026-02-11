/** Options passed to the refract() plugin factory */
export interface RefractPluginOptions {
	/** Path to refract.config.json (default: './refract.config.json') */
	configPath?: string;
	/** Additional packages to add to ssr.noExternal */
	noExternal?: string[];
}
