---
title: Blocks & layout
description: Plugins declare a metaFields data manifest, project named metadata blocks from it, and place every child explicitly via the layout map. SPEC-080.
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
3. **`layout`** — the projected tree. A map from container `data-name`
   to the ordered list of child names it should contain. This is the
   only thing that decides *where* anything renders.

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

## layout — explicit placement

`layout` is the projected tree: a map from a container's `data-name` to
the ordered list of child names that container should hold. The
reserved key `'root'` addresses the rune's top-level children.

```typescript
layout: { root: ['eyebrow', 'metadata', 'body'] }
```

Semantics:

- **Projected block names** render in place where listed (the key is
  the block name from `blocks`).
- **Transform-built children** matched by `data-name` are reordered
  into the listed position.
- **Names absent from both** blocks and transform children are skipped.
- **Unlisted transform children** are appended after the listed ones,
  in transform order — rune content is never dropped.
- **Omitting `layout` entirely** renders the transform tree verbatim
  (no projection).
- **`data-name="root"` is reserved** and is never a valid block name.

A non-`root` key projects into a *nested* container. The container must
exist in the transform tree (it carries that `data-name`); its listed
children — projected blocks and reordered transform children — are
placed inside it.

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
layout: { root: ['meta', 'preamble'] },
```

`currency` is pushed to the right edge of the bar; the `meta` block
renders above the rune's `preamble` content.

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
layout: { root: ['eyebrow', 'headline', 'blurb', 'metadata', 'body', 'register'] },
```

`root` orders the projected blocks (`metadata`, `register`) interleaved
with transform children matched by `data-name` (`eyebrow`, `headline`,
`blurb`, `body`). The `register` field renders as a link (`href`), so it
appears as bare link text inside its bar — no chip.

### Character / Recipe — projecting a block into a nested container

```typescript
blocks: { metadata: { fields: ['role', 'status'], layout: 'definition-list' } },
layout: { content: ['preamble', 'metadata'] },
```

The rune's transform pre-builds a `content` column wrapper
(`data-name="content"`). The `layout` key `content` (not `root`) places
children *inside* that wrapper: the authored `preamble` first, then the
projected `metadata` def-list after it.

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
  // Reorder one container without restating root
  layout: {
    content: ['metadata', 'preamble'],
  },
}
```

Each inner key is merged onto the rune's existing map, so unrelated
fields, blocks, and containers are inherited unchanged.

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

`tag` is `div` for a `bar` block and `dl` for a `definition-list`. The
rune's `childOrder` is computed from `layout.root` (the listed names)
followed by a `{content}` sentinel that stands in for the appended,
unlisted transform children.
