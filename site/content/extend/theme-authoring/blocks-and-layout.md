---
title: Blocks & layout
description: Plugins declare a metaFields data manifest, project named metadata blocks from it, and assemble the whole skeleton via the recursive layout tree. SPEC-080 / SPEC-081.
---

# Blocks & layout

SPEC-080 makes metadata-bearing rune structure fully explicit. There is
no canonical render order, no auto-derived preamble wrapper, and no
implicit nesting. Three orthogonal pieces on `RuneConfig` describe the
whole picture:

1. **`metaFields`** — a pure data manifest. One entry per meta-bearing
   field, describing *what* the field means. No layout, no placement.
2. **`blocks`** — named metadata blocks projected *from* `metaFields`.
   Each block picks which fields it contains and one layout primitive
   (`bar` or `definition-list`).
3. **`layout`** — the recursive skeleton tree. A map keyed by container
   name; an entry either *creates* a wrapper element or *orders* an
   existing one. This is the only thing that decides *where* anything
   renders, and (SPEC-081) it builds the preamble / content / media
   grouping that runes used to hand-assemble in TypeScript.

The shape a field renders as (chip vs. bare text, link, rating widget,
icon) is intrinsic to the field's `metaType` and decorations — it does
**not** change with the block's layout primitive. The primitive only
controls the geometry *around* the fields.

## metaFields manifest

Each entry describes one field. All keys are optional.

```typescript
metaFields: {
  status:   { metaType: 'status',
              sentimentMap: { done: 'positive', blocked: 'negative' } },
  priority: { metaType: 'category', label: 'Priority',
              sentimentMap: { high: 'caution', medium: 'neutral' } },
  created:  { metaType: 'temporal', label: 'Created', tag: 'time',
              condition: 'created', transform: 'duration' },
  tags:     { metaType: 'tag', label: 'Tags', condition: 'tags', splitOn: ',' },
}
```

### `MetaField` fields

| Field | Type | Description |
|-------|------|-------------|
| `metaType` | `'status' \| 'category' \| 'quantity' \| 'temporal' \| 'tag' \| 'id' \| 'code'` | Semantic kind. Drives intrinsic render shape and typography. Emits `data-meta-type` |
| `label` | `string` | Human-readable label. Used as the `<dt>` in a `definition-list`, and as link/icon text where applicable. Bar fields are unlabelled |
| `sentimentMap` | `Record<string, 'positive' \| 'negative' \| 'caution' \| 'neutral'>` | Maps the resolved value to a sentiment. Emits `data-meta-sentiment` when matched. Never changes shape — color only |
| `condition` | `string` | Field renders only when the named modifier has a truthy value |
| `renderWhenEmpty` | `boolean` | Loosen `condition` to test *presence* instead of truthiness — render when the modifier is defined, even if the value is `""`. Lets an empty-but-present value still project a block (e.g. `codegroup` `title=""` renders the window chrome without a filename) |
| `href` | `string` | Render the field as a link. The named modifier holds the URL |
| `rating` | `{ total?: string }` | Render the field as a rating widget. The field value is the filled count; `total` names the modifier holding the max (default `5`) |
| `icon` | `{ group: string }` | Decorate with a leading icon. The field's *value* selects the glyph within `group` |
| `tag` | `string` | Element tag override (e.g. `time` for a temporal field) |
| `splitOn` | `string` | Treat the value as a delimited collection — one element per item |
| `transform` | `'duration' \| 'uppercase' \| 'capitalize'` | Value transform applied before rendering |

## blocks — projected metadata blocks

A block selects fields from `metaFields` and a layout primitive. The
block's `data-name` is its key, so it gets the BEM element class
`.rf-{block}__{blockName}`.

```typescript
interface BlockDef {
  fields: (string | { field: string; align?: 'start' | 'end' })[];
  layout: 'bar' | 'definition-list';
  wrap?: boolean;
}
```

- **`fields`** — ordered list of `metaFields` keys. An entry may be a
  bare string or `{ field, align }` to right-align a field within a
  `bar` (see below).
- **`layout`** — the primitive: `bar` or `definition-list`.
- **`wrap`** — `bar` only; defaults `true`. Set `false` to keep the row
  on one line.

```typescript
blocks: {
  meta: { fields: ['status', { field: 'priority', align: 'end' }], layout: 'bar' },
  details: { fields: ['created', 'tags'], layout: 'definition-list' },
}
```

## layout — the recursive skeleton

`layout` is the skeleton tree. It is keyed by container name; the
reserved key `'root'` is the entry point — the rune's own element, which
already exists. Each entry is a **`LayoutEntry`**:

```typescript
type LayoutEntry =
  | string[]                                              // order children; create no wrapper
  | { tag?: string; children: string[]; attrs?: Record<string, string> };

layout?: Record<string, LayoutEntry>;
```

The two forms divide the two jobs SPEC-081 separates — the transform
*labels* slots (semantics), `layout` *nests* them (presentation):

- **An entry with a `tag`** *creates* a wrapper element. Its key becomes
  the wrapper's `data-name` (→ `.rf-{block}__{key}` via the BEM pass, and
  a `data-section` via the `sections` map). `attrs` adds static
  attributes. The transform never builds this wrapper — `layout` does.
- **An entry without a `tag`** (or a bare array) *orders an existing
  container* of that name in place — the transform built the container;
  `layout` reorders / injects into it.

### Name resolution

Each child name in a `children` list (or `root`) resolves, in order:

1. a `layout` entry **with a `tag`** → create the wrapper and recurse
   (its children pull from the same flat slot pool);
2. a `layout` entry **without a `tag`** → reorder the existing container
   of that name;
3. a **projected block** (a `blocks` entry) → project the metadata block;
4. a **transform-emitted node** carrying that `data-name` → place it;
5. otherwise → skip.

Each slot is placed **at most once** (diamond references resolve to the
first placement); a reference cycle (`a → b → a`) warns and skips to
break the loop. **Unlisted transform children** append after the listed
ones, in transform order — rune content is never dropped. **Omitting
`layout` entirely** renders the transform tree verbatim.

### Flat emit + declarative grouping

The idiom (SPEC-081): the transform emits a **flat bag of `data-name`
slots** — `headline`, `blurb`, `eyebrow`, `media`, `ingredients`, … — and
`layout` composes them into the nested skeleton. The recipe content +
media split, fully declarative:

```typescript
layout: {
  root: ['media', 'content'],
  content: { tag: 'div', children: ['preamble', 'metadata', 'ingredients', 'steps', 'tips'] },
  preamble: { tag: 'header', children: ['eyebrow', 'headline', 'blurb'] },
}
```

`root` places the `media` slot and creates the `content` column; `content`
creates the column `<div>` and fills it with the preamble header, the
projected `metadata` block, and the body slots; `preamble` creates the
`<header>` and fills it with the page-section header slots. None of these
wrappers exist in the transform output — `layout` builds them all.

> A `tag`-entry **subsumes `projection.group`** (a wrapper that creates a
> container *is* a group) and **`projection.relocate`** (you place a slot
> wherever you name it — no separate move op). Both are deprecated; see
> [Projection](#projection-reshaping-unowned-trees).

## Intrinsic field render shape

The shape a field value renders as is decided by its `metaType` and any
decorations, **independently of the block's layout primitive**.

### Chip vs. bare

- **Chip** (`.rf-badge`): `metaType` ∈ {`status`, `category`, `tag`}.
- **Bare inline text**: `metaType` ∈ {`id`, `quantity`, `temporal`,
  `code`}, or no `metaType`.

### Typography (via `data-meta-type`)

- `id` / `code` → monospace.
- `quantity` / `temporal` → tabular-nums.
- `id` additionally renders in the primary color (semantic emphasis).

`data-meta-type` is typography only — geometry comes from
`[data-zone-layout]` and the `.rf-badge` class.

### Rich renderings (decorations)

When a field carries `href`, `rating`, or `icon`, it renders richer
than a plain value. Precedence, highest first:
**link > rating > icon > chip > bare**.

- **`href`** → `<a data-meta-type="link">` with `label` (or the value)
  as text. Bare — no chip.
- **`rating`** → `<span data-meta-type="rating">` containing `total`
  mark `<span>`s; the first `value` of them carry `data-filled="true"`,
  the rest `data-filled="false"`. CSS draws the stars/dots.
- **`icon`** → a leading empty `<span data-icon-group="{group}"
  data-icon="{value}">` (glyph supplied by CSS `mask-image`) followed
  by `<span data-meta-value>{label or value}</span>`.

### Sentiment and split

- **`sentimentMap`** only adds `data-meta-sentiment` (color). It never
  changes the shape.
- **`splitOn`** fans a delimited value into one chip / element per item.

## Layout primitives — emitted DOM

`LayoutPrimitive` is `'bar' | 'definition-list'`.

### `bar`

A horizontal flex row of fields, each in its intrinsic shape. Bar
fields are **unlabelled** (eyebrow-style).

```html
<div class="rf-work__meta" data-name="meta" data-zone-layout="bar">
  <span class="rf-badge" data-meta-type="status"
        data-meta-sentiment="positive">done</span>
  <span class="rf-badge" data-meta-type="category"
        data-meta-sentiment="caution" data-align="end">high</span>
</div>
```

- A field with `align: 'end'` gets `data-align="end"`. In CSS that field
  takes `margin-left: auto`, pushing it (and everything after it) to the
  right edge.
- `wrap` defaults `true`. Set `wrap: false` → `data-wrap="false"` keeps
  the row on one line.

### `definition-list`

A `<dl>` with one `<div data-name="row" data-field="{name}">` per
field, each holding a `<dt data-meta-label>` and a `<dd>`.

```html
<dl class="rf-work__details" data-name="details" data-zone-layout="definition-list">
  <div data-name="row" data-field="created">
    <dt data-meta-label>Created</dt>
    <dd><time data-meta-type="temporal">3 days ago</time></dd>
  </div>
  <div data-name="row" data-field="tags">
    <dt data-meta-label>Tags</dt>
    <dd data-multi-value>
      <span class="rf-badge" data-meta-type="tag">api</span>
      <span class="rf-badge" data-meta-type="tag">docs</span>
    </dd>
  </div>
</dl>
```

- Chip-type fields render the value as a chip inside the `<dd>`.
- Bare types render plain in the `<dd>`, carrying `data-meta-type`.
- A multi-value (`splitOn`) `<dd>` gets `data-multi-value`.
- The `data-field="{name}"` lets themes target a specific row.

## Composable rune handles

Each layout primitive also ships as a standalone authoring rune so
authors can compose the same shape in prose without a plugin to project
it:

- **`{% bar %}`** — bar layout in the rune body.
- **`{% deflist %}`** — definition-list layout; a markdown list where
  each `- **Term:** value` becomes a `<dt>`/`<dd>` pair.

Same DOM, same CSS, same chip primitive as the projected versions.

## Worked examples

These are the canonical configs from the shipped runes.

### Hint — flat rune, single icon-decorated field

```typescript
metaFields: { hintType: { icon: { group: 'hint' } } },
blocks: { header: { fields: ['hintType'], layout: 'bar' } },
layout: { root: ['header'] },
```

The `header` block projects the single `hintType` field as an
icon-decorated value in a bar at the top of the rune.

### Budget — bar with a right-aligned field

```typescript
metaFields: {
  duration: { metaType: 'category', condition: 'duration' },
  currency: { metaType: 'category', condition: 'currency' },
},
blocks: { meta: { fields: ['duration', { field: 'currency', align: 'end' }], layout: 'bar' } },
layout: {
  root: ['meta', 'preamble'],
  preamble: { tag: 'header', children: ['headline', 'blurb', 'image'] },
},
```

`currency` is pushed to the right edge of the bar; the `meta` block
renders above the rune's `preamble` header. The transform's categories
and footer aren't named in `layout`, so they append after — content is
never dropped.

### Event — labelled def-list plus a bar-wrapped CTA link

```typescript
metaFields: {
  date:     { metaType: 'temporal', label: 'Date',     condition: 'date' },
  endDate:  { metaType: 'temporal', label: 'Ends',     condition: 'endDate' },
  location: { metaType: 'category', label: 'Location', condition: 'location' },
  register: { label: 'Register', href: 'url', condition: 'url' },
},
blocks: {
  metadata: { fields: ['date', 'endDate', 'location'], layout: 'definition-list' },
  register: { fields: ['register'], layout: 'bar' },
},
layout: {
  root: ['preamble', 'metadata', 'body', 'register'],
  preamble: { tag: 'header', children: ['eyebrow', 'headline', 'blurb', 'image'] },
},
```

`root` orders the preamble wrapper, the projected blocks (`metadata`,
`register`), and the `body` slot. The `preamble` entry *creates* the
`<header>` and fills it with the flat header slots — so `headline` /
`blurb` are addressable by name instead of being buried in a hand-built
wrapper (the bug SPEC-081 fixes). The `register` field renders as a link
(`href`), so it appears as bare link text inside its bar — no chip.

### Character / Recipe — creating a content column + preamble

```typescript
blocks: { metadata: { fields: ['role', 'status'], layout: 'definition-list' } },
layout: {
  root: ['portrait', 'content'],
  content: { tag: 'div', children: ['preamble', 'metadata', 'sections'] },
  preamble: { tag: 'header', children: ['name'] },
},
```

The transform emits flat slots only. `root` places the `portrait` slot
and creates the `content` column; the `content` entry creates the column
`<div>` and fills it with the preamble header, the projected `metadata`
def-list, and the `sections` slot; `preamble` creates the `<header>`
around the title. No wrapper is pre-built in the transform.

## Theme overrides

Themes override a rune's `metaFields`, `blocks`, or `layout` **by inner
key** via `mergeThemeConfig`. A theme can override a single field, a
single block, or a single container's order without restating the whole
map.

```typescript
// Theme override on a rune config
Character: {
  // Re-point one field's sentiment without touching the others
  metaFields: {
    status: { sentimentMap: { active: 'positive', retired: 'neutral' } },
  },
  // Swap one block's primitive
  blocks: {
    metadata: { fields: ['role', 'status', 'faction'], layout: 'bar' },
  },
  // Reshape one container without restating root (restate the wrapper
  // entry so its `tag` is preserved)
  layout: {
    content: { tag: 'div', children: ['metadata', 'preamble', 'sections'] },
  },
}
```

Each inner key is merged onto the rune's existing map, so unrelated
fields, blocks, and containers are inherited unchanged. A `layout` entry
is replaced as a whole, so restate its `tag` when overriding a
wrapper-creating container.

## variants — modifier-keyed config deltas (SPEC-091)

Some runes need their **structure** to vary by a modifier: a `feature`
tiles its definitions as a grid when media is stacked but stacks them in a
column when media is beside; a `card` in `media-position="cover"` regroups
`media + header` into an overlay band with the body flowing below. The
transform is flat/semantic (it never branches structure) and CSS can
reposition but not *restructure*, so this gap is filled by **engine config
variants**: modifier-keyed config deltas merged over the base config per
instance.

```typescript
// on RuneConfig
variants?: Record<string /* modifier (axis) */, Record<string /* value */, Partial<RuneConfig>>>;
```

The outer key is a **declared modifier name** (the axis); the inner key is
a modifier **value**; the payload is a **partial `RuneConfig`** merged over
base. A `recipe`'s cover variant:

```typescript
variants: {
  'media-position': {
    cover: {
      layout: {
        root: ['cover-band', 'body'],
        'cover-band': { tag: 'div', children: ['media', 'preamble'] },
        body:         { tag: 'div', children: ['metadata', 'ingredients', 'steps', 'tips'] },
      },
    },
  },
},
```

**Selection rides the modifier system.** Per instance the engine resolves
each axis's modifier value (with its `default`) and merges
`variants[axis][value]` over base — in `variants` **declaration order** —
*before* layout assembly. There is **no separate condition language** and
**no `defaultVariants`**: the modifier's own `default` already determines
the active value. The merge reuses the same by-key semantics as a theme
override (a delta's `layout.root` replaces the array; new wrapper keys are
added; base keys the variant no longer references simply go unused), and
the layout assembler itself is unchanged — variants only choose *which*
static config it is fed.

**What a delta may override.** A delta restructures/redecorates a rune; it
cannot redefine it. It may set the assembly/decoration fields (`layout`,
`structure`, `styles`, `contentWrapper`, `staticModifiers`, `autoLabel`,
`editHints`, …) but **not identity** fields (`block`, the `modifiers` axis
definitions, `sections`). Every axis must be a **declared modifier** —
both invariants are checked at config load (a missing modifier or an
identity-field override is a config error).

**Themes extend variants.** `variants` is part of `RuneConfig`, so
`mergeThemeConfig` merges it like any other field — a theme can add a new
axis or override a single axis/value delta. For example a theme can give
its `card` a `media-position="cover"` variant the base theme doesn't ship.

**Consumer prerequisite — the flat-slot model.** Because a variant
restructures by merging a `layout` delta and re-running flat-slot
assembly, the rune must emit flat `data-name` slots and carry a base
`layout` for the delta to override (see *layout — the recursive skeleton*
above). A rune that pre-assembles its structure in the transform has no
loose slots to regroup and no base layout to merge into — variants cannot
reach it. (`card`, `bento-cell`, and `recipe` are all on the flat-slot
model.)

**`compoundVariants`** (cross-axis deltas) is a reserved future extension,
intentionally not implemented.

**Tooling.** `refrakt contracts` enumerates a per-variant structure under
each rune's `variants[axis][value]` (the base merged with the delta), and
the CSS-coverage derivation folds in selectors a variant introduces.
`refrakt inspect <rune> --<modifier>=<value>` renders a variant by passing
the selecting modifier value — no new flag needed.

## Projection — reshaping unowned trees

`projection` reshapes the output tree by `data-name` *after* assembly. It
is the escape hatch for bending a tree a theme does **not** own — a theme
adjusting a third-party rune's output without that rune declaring
`layout`. The boundary (SPEC-081): `layout` is a rune/theme declaring its
*own* intended structure; `projection` is post-hoc surgery on someone
else's.

- **`hide`** — drop elements by `data-name` (the default is
  append-not-drop, so removal is explicit). **Retained.**
- **`group`** — *deprecated.* A wrapper that creates a container *is* a
  group; use a `layout` tag-entry instead.
- **`relocate`** — *deprecated.* You place a slot wherever you name it in
  the `layout` tree; there is no separate move op.

The contract generator emits a deprecation warning for `group` /
`relocate`, and they carry `@deprecated` JSDoc.

## Contracts

`generateStructureContract` surfaces each block as an addressable
element:

```json
{
  "tag": "div",
  "selector": ".rf-work__meta",
  "source": "block",
  "layout": "bar",
  "fields": ["status", "priority"]
}
```

`tag` is `div` for a `bar` block and `dl` for a `definition-list`.

It also surfaces every **`layout`-created wrapper** (SPEC-081) — the whole
declarative skeleton, not just projected blocks. A `tag`-entry becomes an
element carrying its child membership:

```json
{
  "tag": "header",
  "selector": ".rf-recipe__preamble",
  "source": "layout",
  "children": ["eyebrow", "headline", "blurb"]
}
```

The rune's `childOrder` is computed from `layout.root` (the listed names)
followed by a `{content}` sentinel that stands in for the appended,
unlisted transform children; the per-wrapper `children` lists describe
the nested membership below that.
