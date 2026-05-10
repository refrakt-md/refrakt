import type { SecurityPolicy } from '@refrakt-md/types';

/** Options passed to the refrakt() plugin factory */
export interface RefractPluginOptions {
	/** Path to refrakt.config.json (default: './refrakt.config.json') */
	configPath?: string;
	/** Which site to use from the config. Required when the config declares
	 *  multiple `sites.*`; optional (and resolves to the lone site) otherwise. */
	site?: string;
	/** Additional packages to add to ssr.noExternal */
	noExternal?: string[];
	/**
	 * Markdoc variables available in content via {% $name %} syntax.
	 * Values are embedded as raw JavaScript expressions in the generated virtual module.
	 * Use Vite `define` globals (e.g., `__REFRAKT_VERSION__`) as values.
	 */
	variables?: Record<string, string>;
	/** Security policy for untrusted author content. Defaults to `'trusted'`
	 *  (current behaviour — no sanitisation). Set `'strict'` for hosted-product
	 *  use to strip author scripts and harden the sandbox iframe. See the
	 *  `SecurityPolicy` type for the full shape. */
	security?: SecurityPolicy;
}
