/** A serialized Markdoc Tag (plain object, not a class instance) */
export interface SerializedTag {
	$$mdtype: 'Tag';
	name: string;
	attributes: Record<string, any>;
	children: RendererNode[];
}

export type RendererNode = SerializedTag | string | number | null | undefined | RendererNode[];

/** Configuration for a single rune's identity transform */
export interface RuneConfig {
	/** BEM block name (without prefix). E.g., 'hint' → .rf-hint */
	block: string;

	/** Modifier sources — maps modifier name to where to read it from */
	modifiers?: Record<string, {
		/** Where to read the modifier value */
		source: 'meta' | 'attribute';
		/** Default value if not found */
		default?: string;
	}>;

	/** Structural overrides — additional elements to inject (keyed by data-name) */
	structure?: Record<string, StructureEntry>;

	/** Auto-label children by tag name → data-name. E.g., { summary: 'header' } */
	autoLabel?: Record<string, string>;

	/** Extra attributes to add to the root element */
	rootAttributes?: Record<string, string>;
}

export interface StructureEntry {
	/** HTML tag name */
	tag: string;
	/** Sets data-name on the element (overrides the structure key) */
	ref?: string;
	/** Child structure entries or content directives */
	children?: (string | StructureEntry)[];
	/** Insert before existing children */
	before?: boolean;
	/** Inject an SVG icon from config.icons[group][resolvedVariantValue] */
	icon?: { group: string; variant: string };
	/** Inject text from a resolved modifier value */
	metaText?: string;
}

/** Top-level theme configuration */
export interface ThemeConfig {
	/** BEM prefix. E.g., 'rf' → .rf-hint */
	prefix: string;

	/** CSS custom property prefix. E.g., '--rf' → --rf-color-text */
	tokenPrefix: string;

	/** Icon SVGs organized by rune and variant */
	icons: Record<string, Record<string, string>>;

	/** Per-rune transform configuration */
	runes: Record<string, RuneConfig>;
}
