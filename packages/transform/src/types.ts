import type { SerializedTag, RendererNode } from '@refrakt-md/types';

// ─── SPEC-080: Layout primitive vocabulary ────────────────────────────

/** Closed vocabulary of layout primitives a `BlockDef` can be rendered
 *  with. Each primitive emits a documented DOM shape and styles itself
 *  via `[data-zone-layout="…"]` CSS selectors.
 *
 *  - `bar` — horizontal flex row of fields, each in its intrinsic shape
 *    (chip vs bare from `metaType`); supports `wrap` + per-field `align`.
 *  - `definition-list` — `<dl>` with `<dt>` / `<dd>` per field; the dd
 *    value renders as a chip for chip-type fields, bare otherwise. */
export type LayoutPrimitive = 'definition-list' | 'bar';

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

/** SPEC-081 layout entry — one container's declaration within `layout`.
 *  - A bare `string[]` orders an *existing* container's children (the
 *    transform built the container; the engine reorders / injects into it).
 *  - `{ tag, children }` *creates* a wrapper element (`<tag data-name=key>`)
 *    and fills it with the resolved children, pulled from the flat transform
 *    slots. `attrs` adds literal attributes to the created wrapper.
 *  An object without `tag` behaves like the bare-array form (order existing). */
export type LayoutEntry =
	| string[]
	| { tag?: string; children: string[]; attrs?: Record<string, string> };

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

	/** Loosen `condition` (and the empty-value skip) to test for
	 *  *presence* rather than truthiness: the field renders when its
	 *  source modifier is defined, even if the value is an empty string.
	 *  Lets an empty-but-present value still project a block — e.g. a
	 *  `codegroup` with `title=""` renders the window chrome without a
	 *  filename, while an absent `title` renders nothing. */
	renderWhenEmpty?: boolean;

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

/** Configuration for a single rune's identity transform */
export interface RuneConfig {
	/** BEM block name (without prefix). E.g., 'hint' → .rf-hint */
	block: string;

	/** Parent rune typeof name for grouping in editors.
	 *  E.g., BentoCell sets parent: 'Bento' so they appear as one group.
	 *  Advisory only — a rune may declare a typical `parent` yet still be valid
	 *  standalone (e.g. `track`). Use `requiresParent` for a hard constraint. */
	parent?: string;

	/** SPEC-084 — self-declared hard nesting requirement: this rune is only
	 *  meaningful inside the named parent rune (PascalCase typeof). The engine
	 *  validates it (warning by default; error for the structurally-meaningless
	 *  set) when the rune appears without that parent as its nearest ancestor
	 *  rune. Open-world: a rune is validated only if it opts in here — there is
	 *  no container-side allow-list. */
	requiresParent?: string;

	/** SPEC-090 — interaction capability. A rune is presentational by default;
	 *  this flags the behaviour-driven (interactive) guests (codegroup, tabs,
	 *  datatable, form, map, sandbox, juxtapose, or any guest that declares it).
	 *  The engine reads it to decide whether a media guest in a linked tile needs
	 *  the interaction-posture build warning. */
	interactive?: boolean;

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

	/** Structural overrides — additional elements to inject (keyed by data-name).
	 *  Legacy field — superseded by SPEC-080 `metaFields` + `blocks`. No
	 *  first-party rune declares it; removed in WORK-313. */
	structure?: Record<string, StructureEntry>;

	// ─── SPEC-080: block-and-layout assembly model ───

	/** Pure data manifest for meta-bearing fields — domain semantics only.
	 *  Keyed by field name. Each field declares its metaType, label,
	 *  sentiment map, optional condition, and any rich rendering (`href`,
	 *  `rating`, `icon`). Blocks reference these fields by name; the engine
	 *  resolves them against modifier values and renders them. */
	metaFields?: Record<string, MetaField>;

	/** Named metadata blocks projected from `metaFields`. Each block is a
	 *  flat list of fields (optionally per-field aligned) rendered by a
	 *  layout primitive (`bar` / `definition-list`). Theme-overridable;
	 *  plugins ship defaults.
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
	 *  Omitting `layout` renders the transform tree verbatim, no projection.
	 *
	 *  Each value is a {@link LayoutEntry}: a bare `string[]` orders an existing
	 *  container, while `{ tag, children }` *creates* a wrapper element and
	 *  fills it from the flat transform slots (SPEC-081 declarative assembly). */
	layout?: Record<string, LayoutEntry>;

	/** SPEC-091 — modifier-keyed config deltas (engine config variants).
	 *  The outer key is a declared **modifier name** (the variant *axis*); the
	 *  inner key is one of that modifier's **values**; the payload is a partial
	 *  `RuneConfig` merged over the base config when an instance resolves that
	 *  axis to that value.
	 *
	 *  Selection rides the modifier system: per instance the engine resolves
	 *  each axis's modifier value (with its `default`) and merges
	 *  `variants[axis][value]` over base — in `variants` **declaration order** —
	 *  *before* layout assembly, reusing `mergeThemeConfig`'s by-key semantics
	 *  (a delta's `layout.root` replaces the array; new wrapper keys are added;
	 *  base keys the variant no longer references simply go unused). There is no
	 *  separate predicate language and no `defaultVariants` — the modifier's own
	 *  `default` already provides the active value.
	 *
	 *  A delta may override **assembly / decoration** fields (`layout`,
	 *  `structure`, `styles`, `contentWrapper`, `staticModifiers`, `autoLabel`,
	 *  `editHints`, …) but **not identity** fields (`block`, the `modifiers`
	 *  axis definitions, `sections` keys) — a variant restructures/redecorates a
	 *  rune, it cannot redefine it. Every axis must be a declared `modifiers`
	 *  entry; both invariants are checked at config load.
	 *
	 *  `compoundVariants` (cross-axis deltas) is a reserved future extension,
	 *  intentionally not implemented. */
	variants?: Record<string, Record<string, Partial<RuneConfig>>>;

	/** SPEC-086 — which surface `frame` chrome (aspect/displace/offset/oversize/
	 *  place/anchor/shadow) decorates. `'media'` targets the rune's
	 *  `[data-section="media"]` zone; `'self'` targets the rune's own root
	 *  (figure/showcase, whose body *is* the media). Defaults to `'media'` when
	 *  the rune declares a media section, else `'self'` is required to accept
	 *  `frame` — otherwise `frame` emits a build warning. */
	frameTarget?: 'media' | 'self';

	/** SPEC-087 — which surface a `substrate` pattern fills by default. Unlike
	 *  `frameTarget`, fill defaults to `'self'` (the whole rune) because "a
	 *  background" means "behind everything"; the media well is an addressable
	 *  inner surface opted into via `substrate-target="media"`. Theme-overridable;
	 *  a per-instance `substrate-target` always wins. */
	substrateTarget?: 'media' | 'self';

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

	/** Default surface elevation — the chrome/depth axis (SPEC-107). An ordered
	 *  ladder from recessed through on-plane to lifted; surface *presence* is the
	 *  low end. The engine emits `data-elevation`; the skin maps each rung to a
	 *  chrome bundle (fill/border/radius/shadow). Author `elevation=` and the
	 *  region/context cascade override. Supersedes the static surface groups. */
	defaultElevation?: 'sunken' | 'flush' | 'flat' | 'raised' | 'floating' | 'overlay';

	/** Default header prominence (SPEC-107) — only meaningful on runes with a
	 *  page-section header (the `sections` preamble/title/description cluster).
	 *  The engine emits `data-prominence`; the skin maps it to a type register.
	 *  Author `prominence=` overrides. */
	defaultProminence?: 'quiet' | 'normal' | 'prominent' | 'display';

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

	/** SPEC-105 — the cascade items the engine stamps with `--rf-reveal-index`
	 *  (0,1,2,… in document order) when the author sets `stagger` on this rune.
	 *  Matches a descendant's `data-field` or `data-name` (e.g. `'cell'`, `'tier'`,
	 *  `'feature-item'`). Absent → `stagger` is a silent no-op (single-child runes
	 *  like `hero`). "Which children cascade" is decided here in config, never in CSS. */
	staggerItems?: string;

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
	 *  Operates on `data-name` addresses. Execution order: hide → group → relocate.
	 *
	 *  SPEC-081 drew the boundary: `layout` is a rune/theme declaring its *own*
	 *  intended structure (a tag-entry creates a wrapper, a named slot is placed
	 *  wherever it appears); `projection` is post-hoc surgery on a tree you do
	 *  *not* own — a theme bending a third-party rune's output by `data-name`.
	 *  `hide` (explicit drop) and reshaping-unowned-trees are the retained role;
	 *  `group` and `relocate` are deprecated, subsumed by recursive `layout`. */
	projection?: {
		/** Remove elements matching these data-name values from the children array entirely */
		hide?: string[];
		/** @deprecated SPEC-081 — use a `layout` tag-entry instead (a wrapper that
		 *  creates a container *is* a group). Retained only for reshaping trees a
		 *  theme does not own; new runes should declare structure via `layout`.
		 *  Collect elements by data-name, wrap in a new container, place at first member's position. */
		group?: Record<string, {
			/** Container element tag */
			tag: string;
			/** data-name values to collect into this group */
			members: string[];
			/** Optional slot assignment for the group container */
			slot?: string;
		}>;
		/** @deprecated SPEC-081 — place the slot directly in the `layout` tree
		 *  instead (you put a slot wherever you name it; no separate move op).
		 *  Retained only for reshaping trees a theme does not own.
		 *  Move elements by data-name into another element or slot. */
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
		/** The parsed SPEC-082 `data-rune-fields` bag for this node. The engine
		 *  strips the bag attribute from the result before `postTransform` runs,
		 *  so a hook that needs non-modifier field values reads them here (or via
		 *  `readField(node, name, context.fields)` for bag-first + meta-fallback). */
		fields: Record<string, unknown>;
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
	/** SPEC-088 — structured token-driven gradient fill. `stops` are **token
	 *  names** (e.g. `["primary", "surface"]`), resolved to `var(--rf-color-*)`;
	 *  `direction` is a bounded named set (`to-t|to-b|to-l|to-r|to-tr|…`);
	 *  `type` is `linear` (default) | `radial` | `conic`. Lives here — not the
	 *  raw `style` map — so a named brand gradient stays token-driven & portable. */
	gradient?: { type?: string; direction?: string; stops: string[] };
	/** SPEC-104 — a live sandbox backdrop, resolved at **transform time** (the
	 *  identity engine has no file access). A `sandbox`-typed preset expands into
	 *  the WORK-428 `data-bg-guest` body: `bg="name"` becomes a `{% sandbox %}`
	 *  rendered into the bg layer. Describes only the scene; `height: fill`, the
	 *  backdrop posture and eager activation come from the bg-guest mechanism. May
	 *  coexist with `gradient`/`style` (the boot frame behind the live scene). */
	sandbox?: { src: string; framework?: string; dependencies?: string };
	/** Base preset to extend (e.g., "extends": "particles" to customize a package preset) */
	extends?: string;
}

// ─── Frame Preset Types (SPEC-086) ───────────────────────────────────

/** Named frame preset definition in theme config — the chrome that presents a
 *  rune's *media* surface (or its self surface when `frameTarget: 'self'`).
 *  Structurally parallel to {@link BgPresetDefinition}; facets are applied to
 *  the frame-target element and may be overridden inline via `frame-*` attrs. */
export interface FramePresetDefinition {
	/** Aspect ratio of the framed media, e.g. "16/9" | "1/1". */
	aspect?: string;
	/** Edge/corner the guest moves toward: top | bottom | end | bottom-end | top-end. */
	displace?: string;
	/** How displacement renders: `peek` (default) translates the inner guest inside
	 *  its frame target; `bleed` puts a negative margin on the media zone so
	 *  following layout pulls up — used to extend a guest past a section host
	 *  like a hero without leaving a gap above. */
	displaceMode?: string;
	/** Displacement distance — named scale: none | sm | md | lg | xl | 2xl | 3xl. */
	offset?: string;
	/** How far the guest exceeds its slot (scale factor / min-size); clipped guests only. */
	oversize?: string;
	/** Guest-box alignment in the slot: left|center|right × top|bottom. */
	place?: string;
	/** Crop focal point when the guest is cut (object-position). */
	anchor?: string;
	/** Silhouette drop-shadow strength: none | sm | md | lg. */
	shadow?: string;
	/** Layer onto a base preset (same `extends` resolution as bg/tint). */
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

	/** Named frame preset definitions (SPEC-086) — media-surface chrome. */
	frames?: Record<string, FramePresetDefinition>;
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
