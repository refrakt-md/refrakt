import type { AdapterTheme } from '@refrakt-md/transform';
import type { SecurityPolicy } from '@refrakt-md/types';

/**
 * Theme definition for the Astro adapter.
 *
 * Alias for the shared `AdapterTheme` — all non-Svelte adapters
 * use the same shape (manifest + layouts).
 */
export type AstroTheme = AdapterTheme;

/** Options for the refrakt Astro integration */
export interface RefraktAstroOptions {
	/** Path to refrakt.config.json (default: './refrakt.config.json') */
	configPath?: string;
	/** Which site to use from the config. Required when the config declares
	 *  multiple `sites.*`; optional (and resolves to the lone site) otherwise. */
	site?: string;
	/** Security policy for untrusted author content. Defaults to `'trusted'`
	 *  (current behaviour — no sanitisation). Set `'strict'` for hosted-product
	 *  use to strip author scripts and harden the sandbox iframe. */
	security?: SecurityPolicy;
	/** Markdoc variables available in content via `{% $name %}` syntax.
	 *  Unlike the SvelteKit plugin's `variables: Record<string, string>` (which
	 *  embeds raw JS expressions into a generated module), Astro consumes actual
	 *  JavaScript values at runtime — pass the real value, not source text. */
	variables?: Record<string, unknown>;
}
