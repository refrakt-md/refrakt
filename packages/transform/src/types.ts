import type { SerializedTag, RendererNode } from '@refrakt-md/types';

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
	/** Extra attributes. String values are literal; objects reference modifiers or page data */
	attrs?: Record<string, string | { fromModifier: string } | { fromPageData: string }>;
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

// ─── Layout Transform Types ───────────────────────────────────────────

/** Page data provided to the layout transform */
export interface LayoutPageData {
	renderable: RendererNode;
	regions: Record<string, { name: string; mode: string; content: RendererNode[] }>;
	title: string;
	url: string;
	pages: Array<{
		url: string;
		title: string;
		draft: boolean;
		description?: string;
		date?: string;
		author?: string;
		tags?: string[];
		image?: string;
	}>;
	frontmatter: Record<string, unknown>;
	headings?: Array<{ level: number; text: string; id: string }>;
}

/** Declarative layout configuration */
export interface LayoutConfig {
	/** BEM block name (e.g., 'docs' → .rf-layout-docs) */
	block: string;

	/** Root element tag, defaults to 'div' */
	tag?: string;

	/** Structural slots — where regions, content, and computed go */
	slots: Record<string, LayoutSlot>;

	/** Static chrome elements reusable across slots (buttons, icons, panels) */
	chrome?: Record<string, LayoutStructureEntry>;

	/** Computed content — built from page data at transform time */
	computed?: Record<string, ComputedContent>;

	/** Layout behaviors to attach via @refrakt-md/behaviors */
	behaviors?: string[];

	/** Programmatic escape hatch — runs after all declarative processing */
	postTransform?: (node: SerializedTag, page: LayoutPageData) => SerializedTag;
}

/** A structural slot in a layout */
export interface LayoutSlot {
	/** HTML tag name */
	tag: string;

	/** CSS class(es) */
	class?: string;

	/** Content source:
	 *  - 'region:<name>' — contents of a named region
	 *  - 'content' — the main page renderable
	 *  - 'computed:<name>' — output of a computed content builder
	 *  - 'clone:region:<name>' — deep-cloned copy of a region (for mobile panels)
	 *  - 'chrome:<name>' — output of a named chrome entry */
	source?: string;

	/** Only render this slot if the source content is non-empty */
	conditional?: boolean;

	/** Only render this slot if the named region exists (independent of source) */
	conditionalRegion?: string;

	/** Only render this slot if frontmatter[key] is truthy */
	frontmatterCondition?: string;

	/** Wrapper element for inner content */
	wrapper?: {
		tag: string;
		class: string;
		/** Add modifier class to wrapper when named computed content is present */
		conditionalModifier?: { computed: string; modifier: string };
	};

	/** Child slots, chrome references, or structure entries.
	 *  Strings starting with 'chrome:' reference named chrome entries. */
	children?: Array<string | LayoutSlot | LayoutStructureEntry>;

	/** Add BEM modifier class when named region exists */
	conditionalModifier?: { region: string; modifier: string };

	/** Extra attributes on the slot element */
	attrs?: Record<string, string>;
}

/** Computed content derived from page data at transform time */
export interface ComputedContent {
	/** Type of computed content */
	type: 'breadcrumb' | 'toc' | 'prev-next';

	/** Data source: 'region:nav', 'headings', etc. */
	source: string;

	/** Type-specific options */
	options?: Record<string, any>;

	/** Visibility rules — skip if conditions fail */
	visibility?: {
		/** Minimum count of source items needed */
		minCount?: number;
		/** Frontmatter key that disables when set to false */
		frontmatterToggle?: string;
	};
}

/** Extended structure entry for layout chrome — adds page data access */
export interface LayoutStructureEntry extends StructureEntry {
	/** Inject text from page data or frontmatter (dot-path, e.g. 'title', 'frontmatter.date') */
	pageText?: string;

	/** Only inject if page data field at dot-path is truthy */
	pageCondition?: string;

	/** Date formatting when pageText resolves to a date string */
	dateFormat?: Intl.DateTimeFormatOptions;

	/** Repeat child element for each item in a page data array */
	iterate?: { source: string; tag: string; class?: string };

	/** Inline SVG string (for icon buttons) */
	svg?: string;
}
