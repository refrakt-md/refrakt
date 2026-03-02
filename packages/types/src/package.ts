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
}
