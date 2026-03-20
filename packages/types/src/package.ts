/** Community rune package registration types */

/** Attribute definition for community rune tooling and validation */
export interface RunePackageAttribute {
	type: 'string' | 'number' | 'boolean';
	default?: string | number | boolean;
	required?: boolean;
	/** Allowed values for enum-style attributes */
	matches?: string[];
}

/** A single rune provided by a community package */
export interface RunePackageEntry {
	/** Markdoc Schema for parsing and transformation (built using the full Model API) */
	transform: Record<string, unknown>;
	/** Attribute schema for tooling and validation */
	schema?: Record<string, RunePackageAttribute>;
	/** Markdoc fixture string for the inspect command */
	fixture?: string;
	/** AI prompt extension (appended to rune description in prompts) */
	prompt?: string;
	/** Human-readable description of what this rune does */
	description?: string;
	/** Alternative tag names that resolve to this rune */
	aliases?: string[];
	/** Schema.org type for SEO extraction (e.g., 'Product', 'Event') */
	seoType?: string;
	/** Describes how Markdown primitives are reinterpreted inside this rune */
	reinterprets?: Record<string, string>;
	/** Editor UI category (e.g., 'Content', 'Layout', 'Section') */
	category?: string;
	/** VSCode snippet body lines (array of strings with VSCode placeholder syntax).
	 *  Also used by the block editor for rich rune insertion. */
	snippet?: string[];
}

/** Additive extension to a core rune's schema */
export interface RuneExtension {
	/** Additional attributes to accept on the core rune */
	schema?: Record<string, RunePackageAttribute>;
}

/** Theme configuration contributed by a community package */
export interface RunePackageThemeConfig {
	/** RuneConfig entries for the package's runes (keyed by typeof name) */
	runes?: Record<string, Record<string, unknown>>;
	/** Additional icon SVGs (group name → icon name → SVG string) */
	icons?: Record<string, Record<string, string>>;
	/** Background preset definitions for this package's runes */
	backgrounds?: Record<string, Record<string, unknown>>;
}

/** A community rune package's exported registration object */
export interface RunePackage {
	/** Short package identifier used for namespacing (e.g., 'dnd-5e') */
	name: string;
	/** Human-readable display name */
	displayName?: string;
	/** Package version (semver) */
	version: string;
	/** Rune definitions provided by this package */
	runes: Record<string, RunePackageEntry>;
	/** Additive extensions to core runes (schema additions only) */
	extends?: Record<string, RuneExtension>;
	/** Identity transform config and icons for this package's runes */
	theme?: RunePackageThemeConfig;
	/** Client-side behavior functions keyed by rune typeof name (lowercase).
	 *  Typed as unknown here — actual BehaviorFn type lives in @refrakt-md/behaviors. */
	behaviors?: Record<string, unknown>;
	/** Build-time cross-page pipeline hooks.
	 *  Optional — packages that don't need cross-page awareness omit this entirely. */
	pipeline?: import('./pipeline.js').PackagePipelineHooks;
}
