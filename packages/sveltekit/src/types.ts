/** Options passed to the refrakt() plugin factory */
export interface RefractPluginOptions {
	/** Path to refrakt.config.json (default: './refrakt.config.json') */
	configPath?: string;
	/** Additional packages to add to ssr.noExternal */
	noExternal?: string[];
	/**
	 * Markdoc variables available in content via {% $name %} syntax.
	 * Values are embedded as raw JavaScript expressions in the generated virtual module.
	 * Use Vite `define` globals (e.g., `__REFRAKT_VERSION__`) as values.
	 */
	variables?: Record<string, string>;
}
