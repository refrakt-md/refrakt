{% spec id="SPEC-080" status="draft" source="SPEC-079" tags="theme, runes, structure, metadata, blocks, layout, bar, definition-list, eyebrow, api, recipe, lumina" %}

# Block-and-layout rune assembly model

Refine the SPEC-079 zone model into a smaller, orthogonal contract for how
metadata-bearing and media-bearing runes are assembled. A rune transform
emits a tree of **named blocks**; the theme projects **metadata blocks** from
a field manifest and composes the final tree by placing block names into
containers. Field *shape* (chip vs bare), block *grouping*, layout *geometry*,
and final *placement* become four independent axes instead of the overlapping
`zones` / `zoneLayouts` / `contentSlots` / `order` / `zoneHost` /
`zoneHostPlacement` surface that has accreted on `RuneConfig`.

This supersedes the placement-related parts of SPEC-079 (`zones` shape,
`zoneHost`, `zoneHostPlacement`, eyebrow left/right slots). The data-manifest
idea (`metaFields`) and the plugin-declares-data / theme-declares-presentation
split from SPEC-079 are kept and extended.

## Terminology

"Eyebrow" was overloaded across a position, a geometry, and a rune. We split
the word's three meanings so each axis is named for what it is:

- **`eyebrow` — a position only.** The kicker slot above the heading, in the
  canonical order `eyebrow → title → blurb → metadata → body`. Positional, the
  traditional editorial meaning. It names no geometry and no rune.
- **`bar` — a geometry.** A horizontal flex row of fields with `wrap` + per-
  field `align`. It is position-neutral (an eyebrow kicker, a metadata strip,
  a footer row are all `bar`s). `bar` **replaces both `split` and `chip-row`** —
  which were the same geometry differing only in wrap/alignment, and where
  "chip-row" became a misnomer once field shape went intrinsic (a bare field
  stays bare). The other layout primitive is `definition-list` (labeled pairs).
- **`bar` — the rune.** The `eyebrow` rune created on the SPEC-079 branch
  (unreleased) is renamed `bar`: a position-agnostic authoring handle for a
  two-aligned row. *Where* it lands is placement, not the rune's identity.

## Problem

The SPEC-079 implementation shipped and works, but iterating on recipe, howto,
faction, realm, and character surfaced four structural issues in `RuneConfig`.

**1. Placement-concept proliferation.** There are now ~6 fields that influence
where a node lands or in what order:

- `order` — sequence of canonical positions
- `zoneHost` + `zoneHostPlacement` — nest projected zones into a container,
  before/after its leading header
- `projection.{hide,group,relocate}` — post-hoc tree surgery by `data-name`
- `contentWrapper` — wrap content children
- `sections` — assign `data-section` roles
- legacy `slots` + `structure` — the pre-SPEC-079 assembly model

`zoneHost`/`zoneHostPlacement` were added to nest the metadata def-list into a
split rune's content column (recipe), then to flip it above the header. But
`zoneHostPlacement` is just ordering re-expressed in a second coordinate
system, and `projection.relocate` already overlaps `zoneHost`. When two fields
can accomplish the same move, theme authors don't know which is canonical and
we maintain both.

**2. `zoneHost` exists because of "hybrid" runes.** Recipe, faction, etc.
hand-assemble `content` + `media` in their transform and only project the
`metadata` zone. The engine owns one position and must thread it into a
structure it didn't build, anchored to a `<header>` it locates heuristically.
That bridge is fragile (find-the-header, before/after) and can't express
"put the metadata over the image."

**3. `chip` vs `plain` rendering is decided inconsistently.** The
`MetaField` doc says "the shape around the value (chip vs plain text) comes
from the layout primitive," but two contradictory rules exist:

- Legacy `structure` (what `api` still uses): `metaType` present → `.rf-badge`.
  So `method`/`auth` are chips and `path` (no metaType) is a bare `<code>`.
- SPEC-079 layouts: `chip-row` makes everything a chip; `split` /
  `definition-list` make a chip only when `sentimentMap` is present.

The same field renders differently depending on layout (`id` is a chip in
`chip-row`, plain in `definition-list`). api's correct look only survives
because it is still on the legacy path.

**4. Block definitions are not uniform.** `definition-list` and `chip-row`
take a flat `fields: []`, but eyebrow's `split` took `{ left: [], right: [] }`.
The structural left/right split bakes a *presentation* decision (which side a
field hugs) into the *data* manifest.

## Model

Two phases with clean ownership.

### Phase 1 — transform emits a tree of named blocks (rune author)

The transform builds the rune's semantic structure as addressable blocks.
Recipe already does this:

```
media
content
  preamble        (eyebrow + title + blurb, as authored)
  ingredients
  steps
```

Block `data-name`s are the addressing API. Containers (e.g. `content`) hold an
ordered child list. The transform knows nothing about metadata projection or
theme placement.

### Phase 2 — config projects metadata blocks and composes the tree (theme; plugin ships defaults)

Two sub-steps:

(a) **Define metadata blocks** from the field manifest, each with a layout.

(b) **Compose** the final tree by naming, per container, the ordered child
blocks — transform-built or metadata-projected:

```
media
content
  metadata        ← projected, placed here by the theme
  preamble
  ingredients
  steps
  tags            ← projected (illustrative future block)
```

Because placement targets any container, a theme can put `metadata` into
`media` to overlay it on the image — a capability `zoneHost` could not express.

## Four orthogonal axes

The test of the design: these four concerns never overlap.

1. **Field shape** — *intrinsic to the field.* Whether a value renders as a
   chip (`.rf-badge`) or bare inline text is a property of the field, not the
   layout. Driven by the `metaType` taxonomy (below). A field renders the same
   way in every layout.
2. **Block** — *grouping + layout.* A named block is a flat list of fields plus
   a layout primitive (and optional per-field align). Plugin ships defaults,
   theme overrides.
3. **Layout** — *geometry only.* `definition-list` (dt/dd grid) and `bar`
   (horizontal flex row; `wrap` + per-field `align`). `bar` replaces both
   `split` and `chip-row`. Layouts *arrange* fields; they never decide a
   field's shape.
4. **Placement / CSS** — *position.* The `layout` map decides which container a
   block sits in and its order among siblings; final visual nudges
   (e.g. right-aligning a field) live in CSS.

## Contract

```ts
// PLUGIN: pure data manifest. `metaType` now also implies render shape.
metaFields?: Record<string, {
  metaType?:
    // chip-rendered (.rf-badge)
    | 'status' | 'category' | 'tag'
    // bare-rendered (inline, data-meta-type drives typography)
    | 'id' | 'quantity' | 'temporal' | 'code';
  label?: string;
  sentimentMap?: Record<string, 'positive'|'negative'|'caution'|'neutral'>;
  condition?: string;
  tag?: string;
  splitOn?: string;
  transform?: 'duration' | 'uppercase' | 'capitalize';
  // Render shape (chip vs bare) is derived from metaType — no per-field
  // override. If a real case ever needs one, revisit then.
}>;

// THEME-overridable: metadata fields grouped into named blocks + layout.
blocks?: Record<string, {
  fields: (string | { field: string; align?: 'start' | 'end' })[];
  layout: 'definition-list' | 'bar';
  /** `bar` only: wrap onto multiple lines (chip-row behaviour). Default true. */
  wrap?: boolean;
}>;

// THEME-overridable: the projected tree — ordered child block names per
// container. Projected (metadata) blocks appear ONLY where named here — no
// canonical/default placement. Transform-built blocks the theme didn't name
// are appended in transform order (rune content is never dropped). Omitting
// `layout` entirely renders the transform tree verbatim, with no projection.
layout?: Record<string /* container data-name */, string[] /* block names */>;
```

`metaFields`, `sections`, `mediaSlots`, `editHints`, `modifiers`, `styles`
keep their roles. `zones`, `zoneLayouts`, `contentSlots`, `order`, `zoneHost`,
`zoneHostPlacement`, and the legacy `slots` / `structure` are removed once all
runes migrate. The `split` and `chip-row` layout primitives collapse into
`bar`, and the unreleased `eyebrow` rune is renamed `bar` (the word `eyebrow`
survives only as a position name).

## Field shape via metaType taxonomy

Reverses the SPEC-079 statement that shape comes from the layout. Shape is
intrinsic to the field:

- **Chip-rendered** (`buildChip` → `.rf-badge`): `status`, `category`, `tag`.
- **Bare-rendered** (`buildPlainValue` → inline, `data-meta-type`): `id`,
  `quantity`, `temporal`, and a new **`code`** type (monospace inline, e.g. an
  API path).
- `sentimentMap` is orthogonal: it only adds colour to whichever shape the
  field already has.

Every layout iterates its fields and calls `buildChip` / `buildPlainValue`
purely from the field — never from the layout. Consequence: the horizontal
`bar` no longer forces every field into a chip; it "arranges fields (each in
its own shape) in a row," which also removes the `id`-chip-vs-plain
inconsistency. `wrap: true` (default) gives the old chip-row behaviour;
`wrap: false` plus per-field `align` gives the old split/eyebrow bar.

## Bar alignment (no left/right slots)

"Left/right" is alignment, and alignment is presentation. Project the bar as a
flat field list; order + a per-field `align: 'end'` express the right-hand
group; one shared rule does the work:

```css
[data-zone-layout="bar"] [data-align="end"] { margin-left: auto; }
```

`margin-left: auto` in a flex row pushes the field and everything after it to
the right edge — which covers the universal "left cluster / right cluster"
bar. Three distinct alignment groups are an escape-hatch CSS job, not new
config.

## Case study — api (bar in the eyebrow position, mixed shapes)

api is visually a bar in the eyebrow position today (`[method] [path] …
[auth]`) but is still on the legacy `structure` path. Target — note the block
is *named* for its position (`eyebrow`) while its *layout* is the geometry
(`bar`):

```ts
metaFields: {
  method: { metaType: 'category', sentimentMap: { GET:'positive', POST:'neutral', DELETE:'negative', /*…*/ } }, // chip
  path:   { metaType: 'code' },                                                                                  // bare <code>
  auth:   { metaType: 'status', condition: 'auth' },                                                             // chip
}
blocks: {
  eyebrow: { fields: ['method', 'path', { field: 'auth', align: 'end' }], layout: 'bar', wrap: false },
}
layout: { content: ['eyebrow', 'body'] }
```

method/auth are chips and path is bare **because of their types**, in any
layout — no layout-specific or slot-specific logic. api is the recommended
first prototype: tiny, no media/split complexity, already visually an eyebrow.

## Case study — recipe (the hardest: split media + content)

```
media
content
  metadata         (def-list; theme places it above preamble)
  preamble
  ingredients
  steps
```

`blocks: { metadata: { fields: ['prepTime','cookTime','servings','difficulty'], layout: 'definition-list' } }`
and `layout: { content: ['metadata','preamble','ingredients','steps'] }`.
"Above vs below the header" is just the block's position in the `content`
list — no `zoneHostPlacement`. Faction/realm use the same with `metadata`
after `preamble`; character keeps a floated portrait and places `metadata`
after the title.

## Acceptance Criteria

- `RuneConfig` exposes `blocks` and `layout`; `zones`, `zoneLayouts`,
  `contentSlots`, `order`, `zoneHost`, `zoneHostPlacement` are removed.
- Field shape (chip vs bare) is decided from the field's `metaType`,
  identically across `definition-list` and `bar`. No per-field override.
- Every block in the rendered tree is placed by an explicit `layout` entry;
  there is no implicit/default placement, even for simple runes.
- A `code` metaType renders monospace inline with no chip geometry.
- `bar` is the single horizontal layout (`split` and `chip-row` removed), with
  a `wrap` knob and per-field `align`; right-alignment is `align: 'end'`
  driving one shared `[data-zone-layout="bar"] [data-align="end"]
  { margin-left: auto }` rule (no left/right wrappers).
- The unreleased `eyebrow` rune is renamed `bar`; `eyebrow` remains only a
  position name in the canonical order.
- `layout` placement is sparse: unnamed transform blocks append in transform
  order; metadata blocks appear only when named; a block name absent from the
  tree is skipped.
- A theme can place a metadata block into the `media` container (overlay).
- api, recipe, howto, faction, realm, character render equivalently to today
  (modulo intended changes) through the new model.
- Block names are surfaced in the generated structure contracts as the stable
  addressing API.

## Migration

- Split/media runes (recipe, howto, faction, realm, character) already build a
  named-block tree; they migrate by moving `zones`+`zoneLayouts` → `blocks`
  and `zoneHost`(+placement)/`order` → `layout`.
- The plan family (work, spec, bug, decision, milestone) leans on the
  dispatcher + `contentSlots` + canonical order; converging them means their
  transforms build their own block tree. This is the bulk of the work.
- Ship behind the new fields with the legacy `slots`/`structure` and SPEC-079
  paths intact; remove them once every rune is migrated.
- api first as the isolated proof of the `bar` layout + intrinsic-shape
  mechanism.

## Resolved decisions

- **Eyebrow vs bar.** `eyebrow` is a *position* only. The horizontal geometry
  is `bar` (one primitive; `wrap` + per-field `align`), absorbing both `split`
  and `chip-row`. The unreleased `eyebrow` rune is renamed `bar`. (See
  Terminology.)
- **Vocabulary: `block`.** The addressable node in a rune's tree is a *block*.
  `region` (page layout) and `zone` (SPEC-079) are not reused for this.
- **No per-field shape override.** Render shape is derived from `metaType`
  alone (chip types vs bare types). No `as` field ships now; revisit only if a
  real case demands a shape that contradicts the semantic type.
- **Explicit placement, no magic defaults.** There is no canonical/default
  placement (e.g. "metadata after preamble"). Every projected block appears
  only where an explicit `layout` entry names it — including simple runes. A
  rune with no `layout` renders its transform tree verbatim (projected blocks
  don't appear). Within a container `layout` addresses, transform-built blocks
  the theme didn't name are appended in transform order, so the rune's own
  content is never silently dropped.

## Open Questions

- Fate of `projection` (hide/group/relocate): fully subsumed by `layout`, or
  retained as the deep-surgery escape hatch alongside `postTransform`? (Leaning
  retain — `layout` is deliberately shallow/explicit; deep tree surgery wants a
  separate, clearly-escape-hatch home.)

{% /spec %}
