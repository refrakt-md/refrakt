---
title: Header zones + layout primitives
description: Plugins declare metaFields + zones; themes pick a layout primitive per zone. Engine glues them via canonical render order. SPEC-079.
---

# Header zones + layout primitives

SPEC-079 splits the concerns of metadata-bearing rune headers into
three orthogonal axes:

1. **Position** — *where* the content lives. A closed vocabulary of
   slot names: `eyebrow`, `title`, `blurb`, `metadata`, `body`. The
   vocabulary IS the canonical render order.
2. **Source** — *where* the content comes from. Either `zones` (the
   engine projects structured chips from the rune's attributes) or
   `contentSlots` (the user authors prose at the slot in the rune
   body). Mutually exclusive per slot.
3. **Layout** — *how* the contents render as DOM. A closed vocabulary
   of primitives: `split`, `chip-row`, `definition-list`. The theme
   picks per zone.

The three dimensions don't interact: a `metadata` zone can render as
`chip-row` or `definition-list` without changing what "metadata"
means; an `eyebrow` can be projected by the engine or authored by the
user without changing what "eyebrow" means.

## metaFields manifest

Plugins declare a pure data manifest — *which* fields exist on the
rune, *what* each field means semantically. No rendering hints.

```typescript
Work: {
  block: 'work',
  metaFields: {
    id:         { metaType: 'id',       metaRank: 'primary' },
    status:     { metaType: 'status',   metaRank: 'primary',
                  sentimentMap: { done: 'positive', blocked: 'negative' } },
    priority:   { metaType: 'category', metaRank: 'primary', label: 'Priority',
                  sentimentMap: { high: 'caution', medium: 'neutral' } },
    complexity: { metaType: 'quantity', metaRank: 'secondary', label: 'Complexity' },
    assignee:   { metaType: 'tag',      metaRank: 'secondary', label: 'Assignee',
                  condition: 'assignee' },
    created:    { metaType: 'temporal', metaRank: 'secondary', label: 'Created',
                  tag: 'time', condition: 'created' },
  },
  // …
}
```

Each field declares:

- **`metaType`** — typography hint. `id` gets monospace, `quantity` /
  `temporal` get tabular-nums. Does NOT control geometry (chip vs
  plain text).
- **`metaRank`** — `primary` or `secondary` for prominence cues.
- **`label`** — human-readable label emitted as `<dt>` (def-list) or
  inline `<span data-meta-label>` (chip-row).
- **`sentimentMap`** — maps the resolved value to a sentiment. Drives
  chip rendering (sentiment-mapped fields render as chips in layouts
  that switch on it; unmapped fields render as plain text).
- **`condition`** — optional modifier name. The field only renders
  when the modifier has a truthy value (typical: `condition:
  'assignee'` on an optional field).
- **`tag`** — element tag override. Default `span`; use `time` for
  temporal fields so the engine emits `<time datetime="…">…</time>`.

## zones declaration

The plugin maps fields to semantic zones:

```typescript
Work: {
  // …
  zones: {
    eyebrow:  { left: ['id'], right: ['status'] },
    metadata: { fields: ['priority', 'complexity', 'assignee', 'created'] },
  },
  // …
}
```

Two shapes:

- **Split-shape** (`{ left: [...], right: [...] }`) — used by the
  `split` layout. Renders left/right justified.
- **Flat-shape** (`{ fields: [...] }`) — used by `chip-row` and
  `definition-list`.

When a zone's shape doesn't match the picked layout, the engine
gracefully reconciles: a split-shape zone rendered as `chip-row`
flattens `left + right` into a single row; a flat-shape zone rendered
as `split` makes the first field left and the rest right.

## contentSlots declaration

The plugin declares which canonical positions accept user-authored
content from the rune's body refs:

```typescript
Work: {
  // …
  contentSlots: {
    title: 'title',          // data-name of the authored title ref
    blurb: 'description',    // data-name of the authored description ref
    body: 'body',            // data-name of the authored body ref
  },
}
```

Each value is the `data-name` of a ref the rune emits during transform.
The engine extracts that ref from the rune's children and places it at
the canonical position, wrapping it with `data-zone="{position}"` so
themes can style projected + authored slots identically.

**Mutual exclusion**: a slot name appearing in both `zones` and
`contentSlots` is a config-time error. Pick one source per slot.
Setting `zones.{slot}: null` in a theme override frees the slot name
for `contentSlots` use.

## Theme picks layouts

The theme declares one layout per zone name (theme-wide default) and
optionally per-rune overrides:

```typescript
// Lumina (theme config)
zoneLayouts: {
  eyebrow:  'split',
  metadata: 'definition-list',
}

// Per-rune override on the rune config:
Milestone: {
  // …
  zoneLayouts: { metadata: 'chip-row' },  // milestones have fewer fields
}
```

Resolution chain:

1. Per-rune `zoneLayouts.{zone}`
2. Theme-level `zoneLayouts.{zone}`
3. Engine default (`split` for eyebrow, `chip-row` for metadata)

## The three layout primitives

### `split`

Two-slot row, opposite-justified. Used for eyebrow.

- **Left** = plain text in `var(--rf-color-primary)`.
- **Right** = chip (`.rf-badge`) when the field carries `sentimentMap`,
  plain text otherwise.

```html
<div class="rf-work__eyebrow" data-zone="eyebrow" data-zone-layout="split">
  <div data-eyebrow-slot="left">
    <span data-meta-type="id">WORK-051</span>
  </div>
  <div data-eyebrow-slot="right">
    <span class="rf-badge" data-meta-type="status"
          data-meta-sentiment="positive">done</span>
  </div>
</div>
```

### `chip-row`

Wrapping row, every value rendered as a chip with optional inline
label.

```html
<div class="rf-work__metadata" data-zone="metadata" data-zone-layout="chip-row">
  <span class="rf-badge" data-meta-type="category" data-meta-sentiment="caution">
    <span data-meta-label>Priority</span>
    <span data-meta-value>high</span>
  </span>
  …
</div>
```

### `definition-list`

`<dl>` with `<dt>` + `<dd>` per field, wrapped in
`<div data-name="row">` so dt/dd participate in the outer grid via
`display: contents`. Sentiment-mapped values render as chips inside
`<dd>`; others render as plain text with `data-meta-type` carrying
typography hints.

```html
<dl class="rf-work__metadata" data-zone="metadata" data-zone-layout="definition-list">
  <div data-name="row" data-field="priority">
    <dt data-meta-label>Priority</dt>
    <dd><span class="rf-badge" data-meta-type="category"
              data-meta-sentiment="caution">high</span></dd>
  </div>
  <div data-name="row" data-field="complexity">
    <dt data-meta-label>Complexity</dt>
    <dd data-meta-type="quantity">moderate</dd>
  </div>
  …
</dl>
```

The `data-field="{name}"` lets themes target specific rows for
field-specific styling (e.g., the work plugin uses
`[data-field="assignee"] dd::before { content: '@'; }`).

## Canonical ordering and the preamble wrapper

Positions render in the canonical order:

```
eyebrow → title → blurb → metadata → body
```

Sparse positions (a rune declares only some) render without empty
wrappers. A rune with unusual ordering or a custom position declares
an explicit `order: [...]` field.

The engine emits an auto-derived `<div data-name="preamble">` wrapper
around all four header positions (`eyebrow + title + blurb + metadata`)
when any are declared, giving themes a single CSS hook around the
header region. `body` and custom positions stay outside.

## Composable rune handles

Each layout primitive also ships as a standalone authoring rune so
authors can compose the same shape in prose without needing a plugin
to project it:

- **`{% eyebrow %}`** — split layout, body splits on top-level `---`
  into left/right halves.
- **`{% deflist %}`** — definition-list layout, body is a markdown
  list where each `- **Term:** value` becomes a `<dt>`/`<dd>` pair.

Same DOM, same CSS, same chip primitive as the projected versions.

## Worked examples

### Card — user-authored eyebrow, no projected meta

```typescript
Card: {
  block: 'card',
  zones: {},
  contentSlots: {
    eyebrow: 'eyebrow',   // user content fills the slot
    title: 'title',
    body: 'body',
  },
}
```

### Recipe — user-authored eyebrow + projected metadata

```typescript
Recipe: {
  block: 'recipe',
  metaFields: {
    servings:   { metaType: 'quantity', label: 'Serves' },
    prepTime:   { metaType: 'temporal', label: 'Prep' },
    difficulty: { metaType: 'category', label: 'Difficulty',
                  sentimentMap: { easy: 'positive', hard: 'negative' } },
  },
  zones: {
    metadata: { fields: ['servings', 'prepTime', 'difficulty'] },
  },
  contentSlots: {
    eyebrow: 'eyebrow',
    title: 'title',
    body: 'body',
  },
}
```

### Custom position via `order`

```typescript
WeirdRune: {
  block: 'weird',
  zones: {
    eyebrow: { left: ['id'], right: ['status'] },
    sidebar: { fields: ['related-links'] },   // custom position
  },
  contentSlots: { title: 'title', body: 'body' },
  order: ['eyebrow', 'sidebar', 'title', 'body'],
  zoneLayouts: { sidebar: 'chip-row' },       // theme defaults don't apply to custom positions
}
```

Custom positions get an auto-derived `.rf-{block}__{name}` CSS class.
No theme-default layout applies — the rune is on the hook for picking
one via `zoneLayouts.{Rune}.{custom-name}`.

## Theme power: zone overrides

Themes can rebalance content across zones for a specific rune via
per-rune `zones` overrides. Each override **replaces** the
corresponding plugin zone wholesale; `null` suppresses; omit inherits.

```typescript
// Plugin defaults
Character: {
  zones: {
    eyebrow:  { left: ['role'], right: ['status'] },
    metadata: { fields: ['age', 'faction', 'realm'] },
  },
}

// Encyclopaedic theme rebalances
zones: {
  Character: {
    eyebrow: null,                                                // suppress
    metadata: { fields: ['role', 'status', 'age', 'faction'] },  // replace
  },
}
```

The vocabulary stays closed (themes can't invent new zone names), but
field placement within the vocabulary is theme-customisable.
