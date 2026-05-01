/** Per-site configuration. A project may declare a single site (via `site`) or
 *  multiple named sites (via `sites: { name: SiteConfig }`).
 *  All fields except `contentDir`, `theme`, and `target` are optional. */
export interface SiteConfig {
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
		theme?: string | { light: string; dark: string };
	};
	/** Custom icon SVGs — merged into the theme's global icon group */
	icons?: Record<string, string>;
	/** Community rune packages to merge into this site's ThemeConfig */
	packages?: string[];
	/** Project-level tint presets — merged after theme tints (last wins) */
	tints?: Record<string, Record<string, unknown>>;
	/** Project-level background presets — merged after theme backgrounds (last wins) */
	backgrounds?: Record<string, Record<string, unknown>>;
	/** Sandbox configuration */
	sandbox?: {
		examplesDir?: string;
	};
	/** Base URL for canonical links and og:url */
	baseUrl?: string;
	/** Human-readable site name for og:site_name */
	siteName?: string;
	/** Default og:image for pages without their own image */
	defaultImage?: string;
	/** Site logo for Organization JSON-LD schema */
	logo?: string;
	/** Rune resolution configuration */
	runes?: {
		prefer?: Record<string, string>;
		aliases?: Record<string, string>;
		local?: Record<string, string>;
	};
}

/** Plan-management configuration. Optional — when absent, plan tooling falls
 *  back to autodetecting `./plan` from the working directory. */
export interface PlanConfig {
	/** Plan directory, relative to project root. Default: `plan` */
	dir?: string;
}

/** Project-level configuration (refrakt.config.json).
 *
 *  Three valid input shapes — all collapse to the same normalized internal form:
 *  - **Flat** (legacy): top-level `contentDir`, `theme`, `target`, …
 *  - **Singular**: `{ "site": { contentDir, theme, target, … } }`
 *  - **Plural**: `{ "sites": { "main": { … }, "blog": { … } } }`
 *
 *  Flat and singular shapes both collapse to `sites.default`. Plural projects
 *  must reference sites by name in CLI commands and adapter options. */
export interface RefraktConfig {
	/** Plugin packages contributing CLI commands and MCP tools.
	 *  When set, this is authoritative; when absent, plugin discovery falls back
	 *  to scanning `package.json` for `@refrakt-md/*` dependencies. */
	plugins?: string[];

	/** Plan-management configuration. */
	plan?: PlanConfig;

	/** Singular-site declaration. Mutually exclusive with `sites`. */
	site?: SiteConfig;

	/** Multi-site declaration keyed by site name. Mutually exclusive with `site`. */
	sites?: Record<string, SiteConfig>;

	// --- Legacy flat-shape fields (backwards compatible) ---
	// These are shorthand for `sites.default.*`. The normalizer mirrors them
	// into a `sites.default` entry and exposes them at the top level for
	// existing adapter code that reads them directly. For single-site configs
	// (the only shape pre-v0.11.0 adapters support), these are guaranteed to
	// be populated after normalization. Multi-site repos must read from
	// `sites[name]` directly.

	/** @deprecated Shorthand for `sites.default.contentDir` */
	contentDir: string;
	/** @deprecated Shorthand for `sites.default.theme` */
	theme: string;
	/** @deprecated Shorthand for `sites.default.target` */
	target: string;
	/** @deprecated Shorthand for `sites.default.overrides` */
	overrides?: Record<string, string>;
	/** @deprecated Shorthand for `sites.default.routeRules` */
	routeRules?: RouteRule[];
	/** @deprecated Shorthand for `sites.default.highlight` */
	highlight?: {
		theme?: string | { light: string; dark: string };
	};
	/** @deprecated Shorthand for `sites.default.icons` */
	icons?: Record<string, string>;
	/** @deprecated Shorthand for `sites.default.packages` */
	packages?: string[];
	/** @deprecated Shorthand for `sites.default.tints` */
	tints?: Record<string, Record<string, unknown>>;
	/** @deprecated Shorthand for `sites.default.backgrounds` */
	backgrounds?: Record<string, Record<string, unknown>>;
	/** @deprecated Shorthand for `sites.default.sandbox` */
	sandbox?: {
		examplesDir?: string;
	};
	/** @deprecated Shorthand for `sites.default.baseUrl` */
	baseUrl?: string;
	/** @deprecated Shorthand for `sites.default.siteName` */
	siteName?: string;
	/** @deprecated Shorthand for `sites.default.defaultImage` */
	defaultImage?: string;
	/** @deprecated Shorthand for `sites.default.logo` */
	logo?: string;
	/** @deprecated Shorthand for `sites.default.runes` */
	runes?: {
		prefer?: Record<string, string>;
		aliases?: Record<string, string>;
		local?: Record<string, string>;
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
