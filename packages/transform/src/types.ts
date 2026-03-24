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
		/** Skip BEM modifier class — only produce data attribute (useful for values like ratios) */
		noBemClass?: boolean;
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
	 *    → `style="grid-template-columns: repeat(3, 1fr)"`
	 *  Transform form: `{ ratio: { prop: '--split-ratio', transform: v => v.split(' ').map(n => n+'fr').join(' ') } }` */
	styles?: Record<string, string | { prop: string; template?: string; transform?: (value: string) => string }>;

	/** Modifier class suffixes always applied (no meta source needed).
	 *  E.g., `['featured']` → class includes `rf-tier--featured` */
	staticModifiers?: string[];

	/** Default page grid width for this rune.
	 *  Runes like hero/feature/cta default to 'full' (full-bleed).
	 *  Omit or set to 'content' for standard content-width runes. */
	defaultWidth?: 'content' | 'wide' | 'full';

	/** Default density for this rune. Controls how much detail is shown.
	 *  'full' — all sections visible, generous spacing (dedicated page)
	 *  'compact' — descriptions truncated, secondary metadata hidden (grid cell, card)
	 *  'minimal' — title and primary metadata only (list view, backlog row)
	 *  Defaults to 'full' if not specified. Can be overridden by author attribute
	 *  or automatically by rendering context (grid → compact, list → minimal). */
	defaultDensity?: 'full' | 'compact' | 'minimal';

	/** Maps structural ref names to standard section roles.
	 *  The identity transform emits `data-section` on elements whose
	 *  `data-name` matches a key in this map, enabling generic theme styling.
	 *  Roles: 'header' | 'title' | 'description' | 'body' | 'footer' | 'media' */
	sections?: Record<string, 'header' | 'title' | 'description' | 'body' | 'footer' | 'media'>;

	/** Declares how named sections should be edited in the block editor.
	 *  Keys are data-name values. Resolved at click time by the editor —
	 *  no extra attributes in rendered HTML. */
	editHints?: Record<string, 'inline' | 'link' | 'code' | 'image' | 'icon' | 'none'>;

	/** Maps ref names (data-name values) to media treatment types.
	 *  The identity transform emits `data-media` on elements whose
	 *  `data-name` matches a key in this map, enabling generic media styling.
	 *  Values: 'portrait' | 'cover' | 'thumbnail' | 'hero' | 'icon' */
	mediaSlots?: Record<string, 'portrait' | 'cover' | 'thumbnail' | 'hero' | 'icon'>;

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

	/** Semantic metadata type — emits `data-meta-type` attribute.
	 *  Values: 'status' | 'category' | 'quantity' | 'temporal' | 'tag' | 'id' */
	metaType?: 'status' | 'category' | 'quantity' | 'temporal' | 'tag' | 'id';
	/** Semantic metadata rank — emits `data-meta-rank` attribute.
	 *  Values: 'primary' | 'secondary' */
	metaRank?: 'primary' | 'secondary';
	/** Maps modifier values to sentiment — emits `data-meta-sentiment` when the
	 *  current modifier value (from `metaText`) has a matching entry.
	 *  E.g., `{ accepted: 'positive', rejected: 'negative' }` */
	sentimentMap?: Record<string, 'positive' | 'negative' | 'caution' | 'neutral'>;
}

// ─── Tint Types ──────────────────────────────────────────────────────

/** Set of colour tokens that a tint can override */
export interface TintTokenSet {
	background?: string;
	surface?: string;
	primary?: string;
	secondary?: string;
	accent?: string;
	border?: string;
}

/** Named tint definition in theme config */
export interface TintDefinition {
	/** Colour scheme override: 'auto' follows page, 'dark'/'light' forces scheme */
	mode?: 'auto' | 'dark' | 'light';
	/** Light-mode token values */
	light?: TintTokenSet;
	/** Dark-mode token values */
	dark?: TintTokenSet;
}

// ─── Background Preset Types ─────────────────────────────────────────

/** Named background preset definition in theme config */
export interface BgPresetDefinition {
	/** CSS properties applied to the bg layer (Tier 1 — CSS-only presets) */
	style?: Record<string, string>;
	/** Default params for render function (Tier 2 — structural presets) */
	params?: Record<string, string>;
	/** Base preset to extend (e.g., "extends": "particles" to customize a package preset) */
	extends?: string;
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

	/** Named tint definitions for section-level colour overrides */
	tints?: Record<string, TintDefinition>;

	/** Named background preset definitions for section-level backgrounds */
	backgrounds?: Record<string, BgPresetDefinition>;
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
		version?: string;
		versionGroup?: string;
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
	type: 'breadcrumb' | 'toc' | 'prev-next' | 'version-switcher';

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
