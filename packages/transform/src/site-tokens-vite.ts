import type { SiteConfig } from '@refrakt-md/types';
import type { ThemeConfig } from './types.js';
import { composeSiteTokensCss } from './site-tokens.js';
import { buildUsedCssImports } from './used-css.js';

/** Virtual module ID adapters import to pull in the site-tokens CSS. */
export const SITE_TOKENS_VIRTUAL_ID = 'virtual:refrakt/site-tokens.css';
const SITE_TOKENS_RESOLVED_ID = `\0${SITE_TOKENS_VIRTUAL_ID}`;

/** Virtual module ID adapters import to pull in the tree-shaken per-rune CSS. */
export const RUNES_VIRTUAL_ID = 'virtual:refrakt/runes.css';
const RUNES_RESOLVED_ID = `\0${RUNES_VIRTUAL_ID}`;

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
			if (id === SITE_TOKENS_VIRTUAL_ID) return SITE_TOKENS_RESOLVED_ID;
			return undefined;
		},
		load(id: string) {
			if (id === SITE_TOKENS_RESOLVED_ID) return css;
			return undefined;
		},
	};
}

/**
 * Build a Vite plugin that serves `virtual:refrakt/runes.css` — a CSS module
 * that emits one `@import` per used rune block, computed from a callback the
 * adapter supplies (since the rune-usage analysis depends on the content
 * pipeline which the plugin doesn't own).
 *
 * The `getUsedBlocks` callback runs in the plugin's `buildStart` hook. It
 * returns the result of {@link computeUsedCssBlocks} along with the theme
 * package specifier that {@link buildUsedCssImports} uses to assemble the
 * `@import` lines.
 *
 * If the callback returns `undefined` (e.g. when analysis fails) the plugin
 * falls back to importing the theme package's full barrel CSS — same
 * graceful-degradation behaviour the SvelteKit plugin has.
 */
export function createRunesCssVitePlugin(
	getUsedBlocks: () => Promise<
		| { usedBlocks: Set<string>; themePackage: string; themeConfig: ThemeConfig }
		| { themePackage: string; fallbackToBarrel: true }
		| undefined
	>,
): MinimalVitePlugin {
	let css = '';
	return {
		name: 'refrakt-md:runes',
		async buildStart() {
			const result = await getUsedBlocks();
			if (!result) {
				css = '';
				return;
			}
			if ('fallbackToBarrel' in result) {
				css = `@import '${result.themePackage}';\n`;
				return;
			}
			const imports = buildUsedCssImports(result.themePackage, result.usedBlocks);
			css = imports.map(spec => `@import '${spec}';`).join('\n') + '\n';
		},
		resolveId(id: string) {
			if (id === RUNES_VIRTUAL_ID) return RUNES_RESOLVED_ID;
			return undefined;
		},
		load(id: string) {
			if (id === RUNES_RESOLVED_ID) return css;
			return undefined;
		},
	};
}
