/** Project-level configuration (refrakt.config.json) */
export interface RefraktConfig {
	/** Path to content directory, relative to project root */
	contentDir: string;
	/** Active theme — package name or relative path */
	theme: string;
	/** Target framework identifier */
	target: string;
	/** Component overrides — maps typeof names to relative paths of replacement components */
	overrides?: Record<string, string>;
	/** Route-to-layout mapping rules, evaluated in order (first match wins) */
	routeRules?: RouteRule[];
	/** Syntax highlighting options */
	highlight?: {
		/** Shiki theme — a built-in theme name, or { light, dark } pair for dual themes */
		theme?: string | { light: string; dark: string };
	};
	/** Custom icon SVGs — merged into the theme's global icon group (icon name → SVG string) */
	icons?: Record<string, string>;
	/** Community rune packages to load (npm package names) */
	packages?: string[];
	/** Rune resolution configuration */
	runes?: {
		/** Resolve name collisions between community packages: rune name → preferred package name */
		prefer?: Record<string, string>;
	};
}

/** Theme manifest — the universal contract between content and rendering */
export interface ThemeManifest {
	name: string;
	version: string;
	description?: string;
	/** Target framework this theme is built for (e.g. "svelte", "astro") */
	target: string;
	/** Relative path to CSS custom properties file */
	designTokens: string;
	/** Layout definitions keyed by name */
	layouts: Record<string, LayoutDefinition>;
	/** Route-to-layout mapping rules, evaluated in order (first match wins).
	 * Prefer defining routeRules in refrakt.config.json instead — the site config
	 * takes precedence and keeps content structure independent of the theme. */
	routeRules?: RouteRule[];
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

export interface RouteRule {
	/** Glob-style pattern matched against the page URL (e.g. "docs/**", "**") */
	pattern: string;
	/** Name of the layout to use (key in manifest.layouts) */
	layout: string;
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
