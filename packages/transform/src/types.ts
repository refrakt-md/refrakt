import type { SerializedTag, RendererNode } from '@refrakt-md/types';

// ─── SPEC-079: Layout primitive vocabulary ────────────────────────────

/** Closed vocabulary of layout primitives the engine can dispatch to
 *  for rendering a zone's resolved field list. Each primitive emits a
 *  documented DOM shape (see SPEC-079 §Layout Primitives) and styles
 *  itself via `[data-zone-layout="…"]` CSS selectors.
 *
 *  - `split` — two-slot row, opposite-justified. Used for eyebrow:
 *    left = plain primary-color text, right = chip when the field
 *    carries `sentimentMap`, plain text otherwise.
 *  - `chip-row` — wrapping row, every value rendered as a chip.
 *  - `definition-list` — `<dl>` with `<dt>` / `<dd>` per field, value
 *    rendered as chip when sentiment-mapped, plain text otherwise.
 *
 *  - `bar` — SPEC-080 horizontal flex row of fields; `wrap` + per-field
 *    `align`. Supersedes `split` + `chip-row` for the block model.
 *
 *  Reserved-but-unimplemented (SPEC-079 §Future primitives): `table`,
 *  `inline-summary`, `sticky-bar`. */
export type LayoutPrimitive = 'split' | 'chip-row' | 'definition-list' | 'bar';

/** SPEC-080 block definition — a named group of meta-fields rendered by a
 *  layout primitive. Field shape (chip vs bare) is intrinsic to each field's
 *  `metaType`; this declares only which fields, their order, the layout, and
 *  optional per-field horizontal alignment. */
export interface BlockDef {
	/** Field names (from `metaFields`), in order. A field may be given as
	 *  `{ field, align }` to push it to the row end (`bar` layout). */
	fields: (string | { field: string; align?: 'start' | 'end' })[];
	/** `definition-list` (labeled pairs grid) or `bar` (horizontal flex row). */
	layout: 'definition-list' | 'bar';
	/** `bar` only — wrap onto multiple lines. Default true. */
	wrap?: boolean;
}

/** Pure data manifest entry for a meta-bearing field. Describes the
 *  field's domain semantics (type, sentiment, label) independent
 *  of which layout primitive renders it. The same field can appear as
 *  primary-color text in an eyebrow's left slot and as a chip in a
 *  def-list's `<dd>` — no per-field config change. */
export interface MetaField {
	/** Semantic metadata type — emits `data-meta-type` attribute and, under
	 *  the SPEC-080 block model, determines render *shape*: chip-rendered
	 *  (`.rf-badge`) for `status` / `category` / `tag`; bare inline for
	 *  `id` / `quantity` / `temporal` / `code`. Also drives typography
	 *  (monospace for `id` / `code`, tabular-nums for `quantity` /
	 *  `temporal`). `sentimentMap` only adds colour, never shape.
	 *  (Legacy zones path still derives chip-vs-plain from the layout
	 *  primitive — see `renderZone`.) */
	metaType?: 'status' | 'category' | 'quantity' | 'temporal' | 'tag' | 'id' | 'code';

	/** Human-readable label emitted as `<span data-meta-label>`. Used
	 *  by `chip-row` (inside the chip) and `definition-list` (as the
	 *  `<dt>`). Ignored by `split` (eyebrow slots are unlabelled). */
	label?: string;

	/** Maps the field's resolved value to a sentiment. Emits
	 *  `data-meta-sentiment` when matched. Presence of a `sentimentMap`
	 *  also triggers chip rendering in layouts that switch on it
	 *  (`split` right-slot, `definition-list` `<dd>`). */
	sentimentMap?: Record<string, 'positive' | 'negative' | 'caution' | 'neutral'>;

	/** When set, the field only renders if the named modifier has a
	 *  truthy resolved value. Use for optional fields like
	 *  `assignee`, `milestone`, `source`. */
	condition?: string;

	/** Render the field as a link (`<a>`). The value of the named modifier
	 *  is the URL; the field's `label` (falling back to its value) is the
	 *  link text. Bare-rendered (no chip). Used for source/repo links and
	 *  any metadata that points elsewhere. */
	href?: string;

	/** Render the field as a rating widget. The field's value is the filled
	 *  count; `total` names the modifier holding the maximum (default 5).
	 *  Emits `total` mark elements, the first `value` of them `data-filled`.
	 *  Used for star ratings, progress dots, etc. */
	rating?: { total?: string };

	/** Decorate the field with a leading icon. The field's value selects the
	 *  glyph (the variant); `group` names the icon set. Emits an icon element
	 *  carrying `data-icon-group` + `data-icon` (value) ahead of the value
	 *  text — CSS draws the glyph via `mask-image`. Bare-rendered (no chip).
	 *  Used for the hint header (note/warning/caution/check) and similar
	 *  labelled-with-icon metadata. */
	icon?: { group: string };

	/** Override the rendered element tag. Defaults to `span`; common
	 *  override is `time` for temporal fields so the engine emits
	 *  `<time datetime="…">…</time>`. */
	tag?: string;

	/** Treat the field's value as a delimited collection — split on
	 *  this character and render one chip per item. Used for fields
	 *  like `tags` where the modifier value is a comma-separated
	 *  string but the rendering should be a row of individual chips.
	 *  Currently applies to `chip-row` and `definition-list` layouts;
	 *  `split` (eyebrow) ignores it since slots hold single values. */
	splitOn?: string;

	/** Pure-text transform applied to the resolved value before it's
	 *  rendered. `duration` parses ISO 8601 (`PT30M`) → human-readable
	 *  (`30m`). `uppercase` / `capitalize` are simple case
	 *  transforms. Mirrors the legacy `StructureEntry.transform`
	 *  field. */
	transform?: 'duration' | 'uppercase' | 'capitalize';
}

/** A semantic zone's declared content shape. Each zone declares either
 *  a split-shape (`left`/`right` arrays of field names — used by the
 *  `split` layout) or a flat-shape (`fields` array — used by all other
 *  layouts).
 *
 *  Layout-specific shape choice is independent of which layout primitive
 *  ultimately renders the zone (the theme picks that via `zoneLayouts`),
 *  but layouts gracefully handle mismatches: a `split`-shaped zone
 *  rendered as `chip-row` flattens `left` + `right` into a single row.
 *
 *  `null` is reserved for theme-level overrides to suppress an
 *  inherited plugin zone (SPEC-079 §Zone Overrides). */
export type ZoneDeclaration =
	| { left: string[]; right: string[] }
	| { fields: string[] }
	| null;

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
		/** Maps raw modifier values to output values before emitting data attributes.
		 *  Unmapped values pass through unchanged. */
		valueMap?: Record<string, string>;
		/** Target data attribute name for the mapped value (e.g., 'data-checked').
		 *  When set, the mapped value is emitted on this attribute instead of the
		 *  default `data-{modifier-name}` attribute. The original modifier attribute
		 *  is still emitted with the raw value. */
		mapTarget?: string;
	}>;

	/** Context-aware modifiers — adds a BEM modifier when nested inside a parent rune.
	 *  Key = parent typeof (e.g., 'Hero'), Value = modifier suffix (e.g., 'in-hero').
	 *  Produces classes like: rf-callout--in-hero */
	contextModifiers?: Record<string, string>;

	/** Ordered slot names for structure assembly. When declared, the engine
	 *  assembles children by iterating slots in order instead of binary before/after.
	 *  The special 'content' slot is where content children are placed.
	 *
	 *  Legacy field — superseded by SPEC-079's `zones` + `sections` +
	 *  canonical-ordering model. Runes that still declare `slots` + `structure`
	 *  go through the backwards-compat shim. */
	slots?: string[];

	/** Structural overrides — additional elements to inject (keyed by data-name).
	 *  Legacy field — superseded by SPEC-079's `metaFields` + `zones`. */
	structure?: Record<string, StructureEntry>;

	// ─── SPEC-079: semantic header zones + per-zone layout primitives ───

	/** Pure data manifest for meta-bearing fields — domain semantics only.
	 *  Keyed by field name (the same name used in `zones.*.left/right/fields`
	 *  arrays). Each field declares its metaType, label, sentiment
	 *  map, and optional condition for conditional rendering. The engine
	 *  reads this manifest at zone resolution time to materialise field
	 *  descriptors that layout primitives render. */
	metaFields?: Record<string, MetaField>;

	/** Semantic header zones — projected meta content groupings. Each zone
	 *  references fields from `metaFields` and gets rendered by the
	 *  theme-chosen layout primitive. Standard zone names: `eyebrow`,
	 *  `metadata`. Custom positions require declaration in `order`. */
	zones?: Record<string, ZoneDeclaration>;

	/** User-authored content slots — the manifest of canonical positions
	 *  that hold rune-author-written content. Each value is the
	 *  `data-name` of the rune-emitted ref where authored content gets
	 *  placed. Standard keys: `eyebrow` (user-authored prose), `title`,
	 *  `blurb`, `body`. A slot name appearing in both `zones` and
	 *  `contentSlots` is a config-time error (mutual exclusion — pick
	 *  one source per slot).
	 *
	 *  Distinct from the existing `sections` field, which maps a child's
	 *  `data-name` to a `data-section` role attribute for theme styling
	 *  (different concept, different direction). */
	contentSlots?: Record<string, string>;

	/** Per-rune layout overrides for zones. Resolution chain:
	 *  theme-level `zoneLayouts.{zoneName}` → per-rune
	 *  `zoneLayouts.{Rune}.{zoneName}` (overrides the theme-wide default).
	 *  Lives on the rune config so a plugin can ship a default layout
	 *  preference, and on the theme config so themes can override per-rune. */
	zoneLayouts?: Record<string, LayoutPrimitive>;

	/** Explicit render-order override for the rune's zones + sections.
	 *  When omitted, the engine derives order from the canonical position
	 *  vocabulary: `eyebrow → title → blurb → metadata → body`. Use this
	 *  when a rune needs unusual ordering OR declares a custom position
	 *  outside the standard vocabulary. */
	order?: string[];

	// ─── SPEC-080: block-and-layout assembly model ───
	// Supersedes the placement-related SPEC-079 fields above (zones shape,
	// zoneLayouts, contentSlots, order, zoneHost, zoneHostPlacement). A rune
	// opts into the new model by declaring `blocks` / `layout`; the legacy
	// path is used otherwise. Removal of the legacy fields is tracked in
	// WORK-320.

	/** Named metadata blocks projected from `metaFields`. Each block is a
	 *  flat list of fields (optionally per-field aligned) rendered by a
	 *  layout primitive. Theme-overridable; plugins ship defaults. Replaces
	 *  the SPEC-079 `zones` + `zoneLayouts`.
	 *
	 *  Render *shape* (chip vs bare) of each field is intrinsic to the
	 *  field's `metaType`, not the block's layout. */
	blocks?: Record<string, BlockDef>;

	/** The projected tree — ordered child block names per container. A key is
	 *  a container's `data-name`, or the reserved `'root'` for the rune's own
	 *  top-level children (flat runes with no content/media wrapper).
	 *  `data-name="root"` is therefore not a valid block name.
	 *
	 *  Projected (`blocks`) entries appear ONLY where named here — no
	 *  canonical/default placement. Transform-built children a list doesn't
	 *  name are appended in transform order (rune content is never dropped).
	 *  Omitting `layout` renders the transform tree verbatim, no projection. */
	layout?: Record<string, string[]>;

	/** Nest projected header zones (the auto-derived preamble) *inside* a
	 *  pre-built content element instead of emitting them as top-level
	 *  siblings. The value is the `data-name` of the host element the rune's
	 *  transform already produced (e.g. `'content'`). Used by split-layout
	 *  runes (recipe) whose transform hand-assembles a `content` + `media`
	 *  column pair: a projected `metadata` def-list must live within the
	 *  content column, not become a third grid child that breaks the split.
	 *  When the named host isn't found among the children, the engine falls
	 *  back to top-level projection — so it's safe to set on any rune.
	 *  Projected zones are inserted relative to a leading `<header>` /
	 *  `[data-section="header"]` within the host — see `zoneHostPlacement`. */
	zoneHost?: string;

	/** Where projected zones land relative to the host's leading header:
	 *  `'after'` (default) places them below the heading/blurb; `'before'`
	 *  places them above it (metadata reads on top of the preamble). Only
	 *  meaningful alongside `zoneHost`. */
	zoneHostPlacement?: 'before' | 'after';

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
	 *  Roles: 'header' | 'preamble' | 'title' | 'description' | 'body' | 'footer' | 'media' */
	sections?: Record<string, 'header' | 'preamble' | 'title' | 'description' | 'body' | 'footer' | 'media'>;

	/** Declares how named sections should be edited in the block editor.
	 *  Keys are data-name values. Resolved at click time by the editor —
	 *  no extra attributes in rendered HTML. */
	editHints?: Record<string, 'inline' | 'link' | 'code' | 'image' | 'icon' | 'none'>;

	/** Enable checkbox marker detection on all list items within this rune.
	 *  When true, the identity transform scans `<li>` text for `[x]`, `[ ]`, `[>]`, `[-]`
	 *  markers, strips them, and emits `data-checked` on the element.
	 *  Detection also applies generically to all list items, but this flag
	 *  documents the intent for discoverability and tooling. */
	checklist?: boolean;

	/** Sequential item style for ordered lists within this rune.
	 *  The identity transform emits `data-sequence` on `<ol>` elements.
	 *  'numbered' — counter circle indicators, 'connected' — connector line with dots,
	 *  'plain' — no visual indicators */
	sequence?: 'numbered' | 'connected' | 'plain';

	/** Direction source for sequential items.
	 *  Reads the named modifier value and emits `data-sequence-direction`.
	 *  Only used when `sequence` is set. */
	sequenceDirection?: { fromModifier: string; default?: string };

	/** Maps ref names (data-name values) to media treatment types.
	 *  The identity transform emits `data-media` on elements whose
	 *  `data-name` matches a key in this map, enabling generic media styling.
	 *  Values: 'portrait' | 'cover' | 'thumbnail' | 'hero' | 'icon' */
	mediaSlots?: Record<string, 'portrait' | 'cover' | 'thumbnail' | 'hero' | 'icon'>;

	/** Density imposed on child runes when this rune is the parent context.
	 *  Replaces hardcoded density context sets — plugins can declare
	 *  their own density behavior without modifying the engine. */
	childDensity?: 'compact' | 'minimal';

	/** Declarative structural reshaping of the output tree.
	 *  Runs after BEM class application (Phase 6) but before meta tag filtering (Phase 7).
	 *  Operates on `data-name` addresses. Execution order: hide → group → relocate. */
	projection?: {
		/** Remove elements matching these data-name values from the children array entirely */
		hide?: string[];
		/** Collect elements by data-name, wrap in a new container, place at first member's position */
		group?: Record<string, {
			/** Container element tag */
			tag: string;
			/** data-name values to collect into this group */
			members: string[];
			/** Optional slot assignment for the group container */
			slot?: string;
		}>;
		/** Move elements by data-name into another element or slot */
		relocate?: Record<string, {
			/** Target data-name or slot name */
			into: string;
			/** Where within the target (default: 'append') */
			position?: 'prepend' | 'append';
		}>;
	};

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
	/** Which slot this entry occupies (used when RuneConfig.slots is declared) */
	slot?: string;
	/** Ordering within a slot (default: 0, lower numbers first) */
	order?: number;
	/** Generate N copies of a template element. Used for star ratings, progress dots, etc. */
	repeat?: {
		/** Modifier name that provides the total count */
		count: string;
		/** Maximum elements to prevent runaway generation (default: 10) */
		max?: number;
		/** Modifier name for how many are "filled" (optional) */
		filled?: string;
		/** Template for each generated element */
		element: StructureEntry;
		/** Template for filled elements (optional — if not set, filled elements get data-filled="true") */
		filledElement?: StructureEntry;
	};
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

	/** Human-readable label emitted as a separate `<span data-meta-label>` child,
	 *  enabling independent styling (thin font, hide entirely, etc.).
	 *  Use for labels like "Prep:", "Role:". For non-label prefixes
	 *  (e.g., "v" on version badges), use textPrefix instead. */
	label?: string;
	/** When true, the label span receives `data-meta-label-hidden` so themes can
	 *  apply an sr-only pattern — visually hidden but accessible to screen readers.
	 *  Use for labels where the value is self-explanatory (IDs, status with sentiment dots). */
	labelHidden?: boolean;

	/** Semantic metadata type — emits `data-meta-type` attribute.
	 *  Values: 'status' | 'category' | 'quantity' | 'temporal' | 'tag' | 'id' */
	metaType?: 'status' | 'category' | 'quantity' | 'temporal' | 'tag' | 'id';
	/** Maps modifier values to sentiment — emits `data-meta-sentiment` when the
	 *  current modifier value (from `metaText`) has a matching entry.
	 *  E.g., `{ accepted: 'positive', rejected: 'negative' }` */
	sentimentMap?: Record<string, 'positive' | 'negative' | 'caution' | 'neutral'>;
}

// ─── Tint Types ──────────────────────────────────────────────────────

/** Set of colour tokens a tint can override. Field names align with the
 *  token contract (SPEC-053): each field maps to a `--rf-color-*` token via
 *  the same dot-to-dash rule used by the contract generator.
 *
 *  | Field | Target token |
 *  |---|---|
 *  | `bg`      | `color.bg`            → `--rf-color-bg` |
 *  | `surface` | `color.surface.base`  → `--rf-color-surface` |
 *  | `text`    | `color.text`          → `--rf-color-text` |
 *  | `muted`   | `color.muted`         → `--rf-color-muted` |
 *  | `primary` | `color.primary`       → `--rf-color-primary` |
 *  | `border`  | `color.border`        → `--rf-color-border` |
 */
export interface TintTokens {
	bg?: string;
	surface?: string;
	text?: string;
	muted?: string;
	primary?: string;
	border?: string;
}

/** Named tint definition in theme config. */
export interface TintDefinition {
	/** Force a colour scheme on the tinted subtree, regardless of page mode.
	 *  Present (`'light'` or `'dark'`) = lock to that scheme; absent = inherit
	 *  the page's current mode. Replaces the previous three-valued `mode`
	 *  field per SPEC-053 — `'auto'` is now the absence of `lockMode`. */
	lockMode?: 'light' | 'dark';
	/** Light-mode token values. */
	light?: TintTokens;
	/** Dark-mode token values. */
	dark?: TintTokens;
	/** Extend another named tint **or a preset module path**, layering this
	 *  tint's overrides on top.
	 *
	 *  Two resolution modes (SPEC-056):
	 *
	 *  - **Tint name** (existing SPEC-053 behaviour) — the base tint is fully
	 *    expanded first (recursively, if it also `extends`), then `light` /
	 *    `dark` / `lockMode` from this tint override per leaf.
	 *  - **Preset module path** (new) — the named preset's
	 *    {@link ThemeTokensConfig} is projected to scope-eligible namespaces
	 *    (chrome colour accents + `syntax.*` + `color.code.*`; typography,
	 *    spacing, radius, shadow, and `color.status.*` are dropped). Chrome
	 *    accents land in {@link TintTokens} via this tint's `light`/`dark`;
	 *    the syntax + code-surface portions are emitted as a static
	 *    `[data-tint="<name>"]` CSS block via
	 *    `generateScopedTintStylesheet`.
	 *
	 *  Circular chains are rejected at merge time. A preset path always wins
	 *  the resolution branch if it matches a registered preset, even if a
	 *  tint with the same name exists. */
	extends?: string;
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

	/** SPEC-079: theme-wide default layout primitives per zone name.
	 *  Resolved AFTER per-rune `zoneLayouts`. E.g., `{ eyebrow: 'split',
	 *  metadata: 'definition-list' }` makes every zone with those names
	 *  render with the matching primitive unless a rune overrides. */
	zoneLayouts?: Record<string, LayoutPrimitive>;

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
	headings?: Array<{ level: number; text: string; id: string; knownSection?: string }>;
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
