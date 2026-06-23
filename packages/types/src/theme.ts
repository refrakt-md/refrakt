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

/** A declarative entity → page route (SPEC-069). Generates one page per
 *  registered entity matching `type` + optional `filter`. `{name}` placeholders
 *  in `url` / `title` / `frontmatter` interpolate entity fields; `$item` is
 *  bound in `render` / `render-template`. `render` and `render-template` are
 *  mutually exclusive. */
export interface EntityRoute {
	/** Entity type(s) the rule matches, comma-separated for multiple. */
	type: string;
	/** Optional field:value filter (SPEC-070 grammar). */
	filter?: string;
	/** Templated route, site-root-relative (basePath applied by the loader). */
	url: string;
	/** Templated page title; falls back to the rendered content's heading. */
	title?: string;
	/** Inline markdoc body, with `$item` bound. */
	render?: string;
	/** Markdoc partial used as the body instead of `render`. */
	'render-template'?: string;
	/** Frontmatter for the generated page (`{name}` placeholders interpolate). */
	frontmatter?: Record<string, unknown>;
}

/** Per-site configuration. A project may declare a single site (via `site`) or
 *  multiple named sites (via `sites: { name: SiteConfig }`).
 *  Only `contentDir` and `theme` are strictly required for the site to load. */
export interface SiteConfig {
	/** Path to content directory, relative to project root */
	contentDir: string;
	/** Active theme — accepts either a package name string (legacy shorthand)
	 *  or a full {@link SiteThemeConfig} with presets, token overrides, mode
	 *  overlays, and `colorScheme`. */
	theme: string | SiteThemeConfig;
	/** Documentation-only adapter hint (`svelte`, `astro`, `next`, `nuxt`, `eleventy`, `html`).
	 *  No adapter reads or validates this field today; it serves as an in-config record of
	 *  which adapter the site is intended for. Slated for removal in v1.0. */
	target?: string;
	/** Component overrides — maps typeof names to relative paths of replacement components */
	overrides?: Record<string, string>;
	/** Route-to-layout mapping rules, evaluated in order (first match wins) */
	routeRules?: RouteRule[];
	/** Declarative entity → page routes (SPEC-069). Each rule generates one page
	 *  per registered entity matching `type` + optional `filter`. */
	entityRoutes?: EntityRoute[];
	/** Syntax highlighting options */
	highlight?: {
		theme?: string | { light: string; dark: string };
	};
	/** Custom icon SVGs — merged into the theme's global icon group */
	icons?: Record<string, string>;
	/** Plugins to merge into this site's ThemeConfig (runes, layouts, hooks, etc.) */
	plugins?: string[];
	/** Project-level tint presets — merged after theme tints (last wins).
	 *  Field shape matches `TintDefinition` from `@refrakt-md/transform` per
	 *  SPEC-053; `Record<string, unknown>` is used here to avoid a cross-package
	 *  type dependency in `@refrakt-md/types`. */
	tints?: Record<string, Record<string, unknown>>;
	/** Project-level background presets — merged after theme backgrounds (last wins) */
	backgrounds?: Record<string, Record<string, unknown>>;
	/** Sandbox configuration. The runtime program-source directory (SPEC-104). */
	sandbox?: {
		/** Directory of sandbox program sources, scanned at build time
		 *  (ADR-022). Relative to the project root. */
		dir?: string;
		/** @deprecated Renamed to `dir` (ADR-022). Still accepted as input — the
		 *  config normalizer coalesces it into `dir` and emits a deprecation
		 *  warning — but will be removed in a future release. */
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
	/** Canonical GitHub (or compatible) repository URL — e.g.
	 *  `"https://github.com/owner/repo"`. Used by file-ref (SPEC-078) to
	 *  build deep-link "View source" URLs of the form
	 *  `{repoUrl}/blob/{repoBranch}/{path}#L{start}-L{end}`. When absent,
	 *  `file-ref` falls back to a no-href link / in-page anchor with a
	 *  build warning. */
	repoUrl?: string;
	/** Git ref appended to GitHub source URLs (branch / tag / commit SHA).
	 *  Defaults to `"main"` when omitted. Use a commit SHA for archival
	 *  URLs that won't drift when the file is edited later. */
	repoBranch?: string;
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
	/** Plugins for this project — npm packages that contribute runes, layouts,
	 *  pipeline hooks, behaviors, and/or CLI commands and MCP tools.
	 *  When set, this is authoritative; when absent, plugin discovery falls back
	 *  to scanning `package.json` for `@refrakt-md/*` dependencies. */
	plugins?: string[];

	/** Plan-management configuration. */
	plan?: PlanConfig;

	/** Cross-reference URL templates. Patterns are tried in array order when an
	 *  xref's ID isn't found in the registry (or when the registry-found entity
	 *  has no usable `sourceUrl`). First match wins. See {@link XrefPattern}. */
	xrefs?: XrefPattern[];

	/** Named file roots — directories that file-reading runes can reach via
	 *  a `namespace:filename` syntax. Markdoc partials extend `{% partial %}`
	 *  to honor namespaced refs (`shared:footer.md`); the snippet rune
	 *  ({% ref "SPEC-062" /%}) consumes the same resolver when its v2 lands.
	 *
	 *  Keys are namespace names; values are paths relative to the config
	 *  file's directory (i.e. the project root). Paths must point to existing
	 *  directories. The namespace `site` is reserved for future site-level
	 *  resolution. See SPEC-063 for the full resolution model. */
	fileRoots?: Record<string, string>;

	/** Singular-site declaration. Mutually exclusive with `sites`. */
	site?: SiteConfig;

	/** Multi-site declaration keyed by site name. Mutually exclusive with `site`. */
	sites?: Record<string, SiteConfig>;

	// --- Legacy flat-shape fields (backwards compatible) ---
	// These are shorthand for `sites.default.*`. The normalizer mirrors them
	// into a `sites.default` entry and exposes them at the top level for
	// existing adapter code that reads them directly. They are populated for
	// single-site configs (flat or singular shape) after normalization but
	// undefined for multi-site repos, where each site lives under `sites[name]`.
	// Adapter code reading these directly should null-check or migrate to
	// `resolveSite(config).site.contentDir`.

	/** @deprecated Shorthand for `sites.default.contentDir`. Undefined for multi-site configs — use `resolveSite(config).site.contentDir`. */
	contentDir?: string;
	/** @deprecated Shorthand for `sites.default.theme`. Undefined for multi-site configs — use `resolveSite(config).site.theme`. Accepts the same `string | SiteThemeConfig` shape as the per-site field. */
	theme?: string | SiteThemeConfig;
	/** @deprecated Shorthand for `sites.default.target`. Undefined for multi-site configs — use `resolveSite(config).site.target`. The field itself is also under review (v0.11.0 follow-up): adapters do not validate it and it is increasingly vestigial; treat it as documentation-only for now. */
	target?: string;
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
	/** @deprecated Shorthand for `sites.default.backgrounds` */
	backgrounds?: Record<string, Record<string, unknown>>;
	/** @deprecated Shorthand for `sites.default.sandbox` */
	sandbox?: {
		dir?: string;
		/** @deprecated Renamed to `dir` (ADR-022). */
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
	/** @deprecated Shorthand for `sites.default.repoUrl` */
	repoUrl?: string;
	/** @deprecated Shorthand for `sites.default.repoBranch` */
	repoBranch?: string;
	/** @deprecated Shorthand for `sites.default.runes` */
	runes?: {
		prefer?: Record<string, string>;
		aliases?: Record<string, string>;
		local?: Record<string, string>;
	};
}

/** A single cross-reference resolution pattern. Configures how unresolved xref
 *  IDs (those without a matching registry entity) are turned into URLs.
 *
 *  Example: route GitHub-style refs to issue pages.
 *  ```jsonc
 *  {
 *    "match": "^GH-(?<num>\\d+)$",
 *    "template": "https://github.com/myuser/myrepo/issues/{num}",
 *    "type": "github-issue",
 *    "label": "GitHub #{num}"
 *  }
 *  ```
 *
 *  See SPEC-065 for the full resolution model. */
export interface XrefPattern {
	/** Regex pattern matched against the ID. Anchored to whole-string match by
	 *  default — `^` and `$` are auto-applied unless explicit anchors are
	 *  present at the start/end. Named groups (`(?<name>...)`) are extractable
	 *  in `template` and `label` as `{name}`. */
	match: string;
	/** URL template. Supports `{id}` (the full matched ID) and `{name}` for
	 *  named groups. Each substituted value is encoded per URL segment (split
	 *  on `/`, encode each segment, rejoin) so path-shaped captures preserve
	 *  slashes. */
	template: string;
	/** CSS modifier class — applied as `rf-xref--{type}`. Default: `"external"`.
	 *  The value `"unresolved"` is reserved and rejected at config load. */
	type?: string;
	/** Template for the rendered link text. Same placeholder syntax as
	 *  `template`. Default: `"{id}"`. The rune's `label=` attribute (if set)
	 *  still overrides this. */
	label?: string;
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

export interface RouteRule {
	/** Glob-style pattern matched against the page URL (e.g. "docs/**", "**") */
	pattern: string;
	/** Name of the layout to use (key in manifest.layouts) */
	layout: string;
	/** Register pages matching this pattern as registry entities of this type,
	 *  in addition to their `page` registration (SPEC-092). A page's own
	 *  frontmatter `type` overrides the rule. Lets a project type a whole section
	 *  by convention (e.g. `runes/**` → `rune`) without per-page frontmatter. */
	entity?: string;
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
