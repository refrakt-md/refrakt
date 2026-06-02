{% spec id="SPEC-080" status="draft" source="SPEC-079" tags="theme, runes, structure, metadata, blocks, layout, eyebrow, definition-list, chip-row, api, recipe, lumina" %}

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
3. **Layout** — *geometry only.* `definition-list` (dt/dd grid), `chip-row`
   (flex-wrap row), `eyebrow` (flex row, no wrap, honours align). Layouts
   *arrange* fields; they never decide a field's shape.
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
  /** Optional shape override when render kind must differ from the
   *  semantic type. Defaults from metaType. Add only when a real case
   *  demands it. */
  as?: 'badge' | 'text' | 'code';
}>;

// THEME-overridable: metadata fields grouped into named blocks + layout.
blocks?: Record<string, {
  fields: (string | { field: string; align?: 'start' | 'end' })[];
  layout: 'definition-list' | 'chip-row' | 'eyebrow';
}>;

// THEME-overridable: the projected tree — ordered child block names per
// container. Sparse: any transform block not named is appended in transform
// order; metadata blocks must be named to appear.
layout?: Record<string /* container data-name */, string[] /* block names */>;
```

`metaFields`, `sections`, `mediaSlots`, `editHints`, `modifiers`, `styles`
keep their roles. `zones`, `zoneLayouts`, `contentSlots`, `order`, `zoneHost`,
`zoneHostPlacement`, and the legacy `slots` / `structure` are removed once all
runes migrate.

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
purely from the field — never from the layout. Consequence: `chip-row` stops
forcing every field into a chip; it becomes "arrange fields (each in its own
shape) in a wrapping row," which also removes the `id`-chip-vs-plain
inconsistency. `eyebrow` is `chip-row` with no wrap plus `align`.

## Eyebrow without left/right

"Left/right" is alignment, and alignment is presentation. Project the eyebrow
as a flat field list; order + a per-field `align: 'end'` express the
right-hand group; one shared rule does the work:

```css
[data-zone-layout="eyebrow"] [data-align="end"] { margin-left: auto; }
```

`margin-left: auto` in a flex row pushes the field and everything after it to
the right edge — which covers the universal "left cluster / right cluster"
eyebrow. Three distinct alignment groups are an escape-hatch CSS job, not new
config.

## Case study — api (eyebrow with mixed shapes)

api is visually an eyebrow today (`[method] [path] … [auth]`) but is still on
the legacy `structure` path. Target:

```ts
metaFields: {
  method: { metaType: 'category', sentimentMap: { GET:'positive', POST:'neutral', DELETE:'negative', /*…*/ } }, // chip
  path:   { metaType: 'code' },                                                                                  // bare <code>
  auth:   { metaType: 'status', condition: 'auth' },                                                             // chip
}
blocks: {
  eyebrow: { fields: ['method', 'path', { field: 'auth', align: 'end' }], layout: 'eyebrow' },
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
- Field shape (chip vs bare) is decided from the field's `metaType` / `as`,
  identically across `definition-list`, `chip-row`, and `eyebrow`.
- A `code` metaType renders monospace inline with no chip geometry.
- `eyebrow` is a flat layout; right-alignment is a per-field `align: 'end'`
  driving one shared `margin-left: auto` rule (no left/right wrappers).
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
- api first as the isolated proof of the flat-eyebrow + intrinsic-shape
  mechanism.

## Open Questions

- Vocabulary: settle one term for "addressable node in a rune's tree"
  (`block` vs `slot`); avoid `region` (page layout) and `zone` (SPEC-079).
- Do we keep `eyebrow` as a distinct layout or express it as `chip-row` +
  a `wrap: false` flag + align?
- Is an explicit per-field `as` override worth shipping now, or only the
  metaType-derived default until a real case needs it?
- Should `layout` containers support a default global placement (e.g. canonical
  "metadata after preamble") so simple runes need no `layout` at all?
- Fate of `projection` (hide/group/relocate): fully subsumed by `layout`, or
  retained as the deep-surgery escape hatch alongside `postTransform`?

{% /spec %}
