import type { SiteConfig } from '@refrakt-md/types';
import { composeSiteTokensCss } from './site-tokens.js';

/** Virtual module ID adapters import to pull in the site-tokens CSS. */
export const SITE_TOKENS_VIRTUAL_ID = 'virtual:refrakt/site-tokens.css';
const RESOLVED_ID = `\0${SITE_TOKENS_VIRTUAL_ID}`;

/**
 * Minimal structural type for a Vite plugin — captures only the hooks this
 * helper uses. Avoids a hard dependency on `vite` from `@refrakt-md/transform`
 * (which is browser-safe everywhere except this `node` entrypoint).
 *
 * Adapter packages that depend on `vite` can cast the returned object to
 * `import('vite').Plugin` at the call site.
 */
export interface MinimalVitePlugin {
	name: string;
	resolveId?(id: string): string | undefined | null;
	load?(id: string): string | undefined | null | Promise<string | undefined | null>;
	buildStart?(): void | Promise<void>;
}

/**
 * Build a Vite plugin that serves `virtual:refrakt/site-tokens.css` with the
 * CSS produced by {@link composeSiteTokensCss}. The CSS is computed once in
 * the plugin's `buildStart` hook (the same timing the SvelteKit plugin uses)
 * and returned from `load` on every subsequent request.
 *
 * Shared between the Astro and Nuxt adapters so they emit byte-identical
 * site-tokens CSS without re-implementing the virtual-module machinery.
 */
export function createSiteTokensVitePlugin(
	site: SiteConfig,
	configDir: string,
): MinimalVitePlugin {
	let css = '';
	return {
		name: 'refrakt-md:site-tokens',
		async buildStart() {
			css = await composeSiteTokensCss(site, configDir);
		},
		resolveId(id: string) {
			if (id === SITE_TOKENS_VIRTUAL_ID) return RESOLVED_ID;
			return undefined;
		},
		load(id: string) {
			if (id === RESOLVED_ID) return css;
			return undefined;
		},
	};
}
