/** Plugin registration types */

/** Attribute definition for plugin rune tooling and validation */
export interface PluginAttribute {
	type: 'string' | 'number' | 'boolean';
	default?: string | number | boolean;
	required?: boolean;
	/** Allowed values for enum-style attributes */
	matches?: string[];
}

/** A single rune provided by a plugin */
export interface PluginRune {
	/** Markdoc Schema for parsing and transformation (built using the full Model API) */
	transform: Record<string, unknown>;
	/** Attribute schema for tooling and validation */
	schema?: Record<string, PluginAttribute>;
	/** Markdoc fixture string for the inspect command */
	fixture?: string;
	/**
	 * Authoring hints — a short note that reads naturally to both humans browsing
	 * the reference and LLMs generating content. Rendered as an "Authoring notes"
	 * block by `refrakt reference` and included in `refrakt write` prompts.
	 */
	authoringHints?: string;
	/** Human-readable description of what this rune does */
	description?: string;
	/** Alternative tag names that resolve to this rune */
	aliases?: string[];
	/** Schema.org type for SEO extraction (e.g., 'Product', 'Event') */
	seoType?: string;
	/** Editor UI category (e.g., 'Content', 'Layout', 'Section') */
	category?: string;
	/** VSCode snippet body lines (array of strings with VSCode placeholder syntax).
	 *  Also used by the block editor for rich rune insertion. */
	snippet?: string[];
}

/** Additive extension to a core rune's schema */
export interface RuneExtension {
	/** Additional attributes to accept on the core rune */
	schema?: Record<string, PluginAttribute>;
}

/** Theme configuration contributed by a plugin */
export interface PluginThemeConfig {
	/** RuneConfig entries for the plugin's runes (keyed by typeof name) */
	runes?: Record<string, Record<string, unknown>>;
	/** Additional icon SVGs (group name → icon name → SVG string) */
	icons?: Record<string, Record<string, string>>;
	/** Background preset definitions for this plugin's runes */
	backgrounds?: Record<string, Record<string, unknown>>;
	/** Domain-aware ordering overrides for collection/relationships sort &
	 *  group (SPEC-072), keyed `type → field → ordered values`. Only needed
	 *  where presentation order differs from a rune attribute's declaration
	 *  `matches` (which is used as the default automatically). */
	orderings?: Record<string, Record<string, string[]>>;
}

/** A plugin's exported registration object.
 *  A plugin is an npm package that may contribute runes, layouts, theme config,
 *  pipeline hooks, behaviors, and/or CLI commands (via a separate `cli-plugin`
 *  entry point). */
export interface Plugin {
	/** Short identifier used for namespacing (e.g., 'dnd-5e') */
	name: string;
	/** Human-readable display name */
	displayName?: string;
	/** Plugin version (semver) */
	version: string;
	/** Rune definitions provided by this plugin */
	runes: Record<string, PluginRune>;
	/** Additive extensions to core runes (schema additions only) */
	extends?: Record<string, RuneExtension>;
	/** Identity transform config and icons for this plugin's runes */
	theme?: PluginThemeConfig;
	/** Client-side behavior functions keyed by rune typeof name (lowercase).
	 *  Typed as unknown here — actual BehaviorFn type lives in @refrakt-md/behaviors. */
	behaviors?: Record<string, unknown>;
	/** Build-time cross-page pipeline hooks.
	 *  Optional — plugins that don't need cross-page awareness omit this entirely. */
	pipeline?: import('./pipeline.js').PluginPipelineHooks;
	/** File-root namespaces this plugin contributes, keyed by namespace.
	 *  Values are paths relative to the plugin package's own directory.
	 *  Once registered, references like `{% partial file="<ns>:foo.md" /%}`
	 *  (and `{% snippet path="<ns>:bar.svelte" /%}` once SPEC-062's v2
	 *  lands) resolve from the named root. See SPEC-063 for the full
	 *  authoring + resolution model. */
	fileRoots?: Record<string, string>;
}
