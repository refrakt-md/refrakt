import type { SerializedTag } from '@refrakt-md/types';

/** Configuration for a single rune's identity transform */
export interface RuneConfig {
	/** BEM block name (without prefix). E.g., 'hint' → .rf-hint */
	block: string;

	/** Parent rune typeof name for grouping in editors.
	 *  E.g., BentoCell sets parent: 'Bento' so they appear as one group. */
	parent?: string;

	/** Modifier sources — maps modifier name to where to read it from */
	modifiers?: Record<string, {
		/** Where to read the modifier value */
		source: 'meta' | 'attribute';
		/** Default value if not found */
		default?: string;
	}>;

	/** Context-aware modifiers — adds a BEM modifier when nested inside a parent rune.
	 *  Key = parent typeof (e.g., 'Hero'), Value = modifier suffix (e.g., 'in-hero').
	 *  Produces classes like: rf-callout--in-hero */
	contextModifiers?: Record<string, string>;

	/** Structural overrides — additional elements to inject (keyed by data-name) */
	structure?: Record<string, StructureEntry>;

	/** Auto-label children by tag name → data-name. E.g., { summary: 'header' } */
	autoLabel?: Record<string, string>;

	/** Extra attributes to add to the root element */
	rootAttributes?: Record<string, string>;

	/** Wrap content children (non-structural) in this element */
	contentWrapper?: { tag: string; ref: string };

	/** Map modifier names to CSS properties set as inline style on root.
	 *  Simple form: `{ columns: '--sb-columns' }` → `style="--sb-columns: 3"`
	 *  Template form: `{ columns: { prop: 'grid-template-columns', template: 'repeat({}, 1fr)' } }`
	 *    → `style="grid-template-columns: repeat(3, 1fr)"` */
	styles?: Record<string, string | { prop: string; template: string }>;

	/** Modifier class suffixes always applied (no meta source needed).
	 *  E.g., `['featured']` → class includes `rf-tier--featured` */
	staticModifiers?: string[];

	/** Programmatic escape hatch. Runs after all declarative processing.
	 *  Receives the fully transformed node and resolved modifier values.
	 *  Use declarative config first — this is for cases that can't be expressed declaratively. */
	postTransform?: (node: SerializedTag, context: {
		modifiers: Record<string, string>;
		parentType?: string;
	}) => SerializedTag;
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
	/** Only inject if the named modifier has a truthy resolved value */
	condition?: string;
	/** Only inject if ANY of the named modifiers has a truthy value */
	conditionAny?: string[];
	/** Extra attributes. String values are literal; objects reference modifiers */
	attrs?: Record<string, string | { fromModifier: string }>;
	/** Transform applied to metaText value before injection */
	transform?: 'duration' | 'uppercase' | 'capitalize';
	/** Static text prepended to metaText value */
	textPrefix?: string;
	/** Static text appended to metaText value */
	textSuffix?: string;
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
