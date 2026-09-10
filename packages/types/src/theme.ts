import type { RouteRule } from './config.js';

/** Extract the theme package identifier from a `SiteConfig.theme` value.
 *  Accepts either the legacy string form or the new {@link SiteThemeConfig}
 *  object form (where the identifier lives in `package`). Useful at call sites
 *  that need the package name for dynamic import or noExternal lists. */
export function getThemePackage(theme: string | SiteThemeConfig): string {
	return typeof theme === 'string' ? theme : theme.package;
}

/** Per-site theme configuration. May be supplied as a string (legacy shorthand
 *  for `{ package: <string> }`) or as a full object with token overrides,
 *  presets, modes, and colour-scheme behaviour.
 *
 *  Per SPEC-048: the contract is universal, values are themed; presets are
 *  plain data merged in declared order. Per SPEC-052: `colorScheme` is the
 *  *site-wide* root of the per-page tint cascade — every page inherits from
 *  this unless its layout or own frontmatter overrides. */
export interface SiteThemeConfig {
	/** Active theme — package name or relative path. */
	package: string;
	/** Preset modules to merge into the theme, in declared order (last wins
	 *  per token). Each entry is a module identifier (npm package + export
	 *  path) that resolves to a `ThemeTokensConfig`. */
	presets?: string[];
	/** Initial colour scheme behaviour for the rendered site.
	 *  - `'auto'` (default): respect user preference (saved or system).
	 *  - `'light'` / `'dark'`: force this scheme regardless of user preference.
	 *    The pre-paint client script no-ops and does not apply saved preference. */
	colorScheme?: 'auto' | 'light' | 'dark';
	/** Site-level token overrides applied on top of the theme's base values and
	 *  any presets. Validated against the typed `TokenContract`. */
	tokens?: import('./token-contract.js').ThemeTokensConfig;
	/** Site-level per-mode overlays (e.g. `dark`). Layer on top of the theme's
	 *  modes and any preset modes. */
	modes?: Record<string, import('./token-contract.js').PartialTokenContract>;
	/** Code-block-specific theme settings. */
	code?: {
		/** Force fenced code blocks to a specific colour scheme regardless of
		 *  the surrounding page mode.
		 *  - `'auto'` (default): code blocks follow the page's light/dark mode.
		 *  - `'dark'` / `'light'`: stamp `data-color-scheme` on each `<pre>` so
		 *    the cascade picks the matching scheme's values for syntax tokens,
		 *    background, foreground, and border. Lets sites keep an
		 *    always-dark code aesthetic on light pages (Stripe/Vercel-style)
		 *    without hand-maintaining a parallel override stylesheet. */
		colorScheme?: 'auto' | 'light' | 'dark';
	};
}

/** Theme manifest — the universal contract between content and rendering */
export interface ThemeManifest {
	name: string;
	version: string;
	description?: string;
	/** Compatible refrakt range, validated at install (ADR-023). Optional — a
	 *  missing range is treated as universal/no-constraint. */
	refrakt?: string;
	/** @deprecated Target framework hint (e.g. "svelte"). Documentation-only —
	 *  adapters do not gate on it (ADR-024). A framework-agnostic theme omits it. */
	target?: string;
	/** Relative path to CSS custom properties file */
	designTokens: string;
	/** Layout definitions keyed by name */
	layouts: Record<string, LayoutDefinition>;
	/** Route-to-layout mapping rules, evaluated in order (first match wins).
	 * Prefer defining routeRules in refrakt.config.json instead — the site config
	 * takes precedence and keeps content structure independent of the theme. */
	routeRules?: RouteRule[];
	/** Human-readable site name for og:site_name and similar meta tags */
	siteName?: string;
	/** Base URL for canonical links and og:url (e.g. "https://refrakt.md") */
	baseUrl?: string;
	/** Default og:image for pages without their own image (path relative to site root, e.g. "/og-image.png"). Recommended size: 1200x630px. */
	defaultImage?: string;
	/** Site logo for Organization JSON-LD schema (path relative to site root, e.g. "/favicon-192.png") */
	logo?: string;
	/** Rune-to-component mappings keyed by typeof name */
	components: Record<string, ComponentDefinition>;
	/** Behavior when a rune has no matching component */
	unsupportedRuneBehavior?: 'fallback' | 'passthrough' | 'hide';
	/** Relative path to fallback component for unsupported runes */
	fallbackComponent?: string;
}

export interface LayoutDefinition {
	/** Relative path to layout component file */
	component: string;
	/** All region names this layout supports */
	regions: string[];
	/** Regions that must be provided for this layout to render correctly */
	requiredRegions?: string[];
}

export interface ComponentDefinition {
	/** Relative path to component file */
	component: string;
	/** Maps rune attribute names to component prop names */
	propMapping?: Record<string, string>;
	/** Whether this component accepts children */
	acceptsChildren?: boolean;
	/** Context-dependent component overrides: key is parent rune name */
	contextOverrides?: Record<string, { component: string }>;
}
