{% spec id="SPEC-079" status="draft" tags="theme, runes, structure, metadata, badges, eyebrow, definition-list, plan, lumina" %}

# Semantic header zones + per-zone layout primitives for metadata-bearing runes

Refactor how metadata-bearing runes (plan entities — work, bug, spec,
decision, milestone — and any future card-shaped rune) declare their
header content and how themes render it. Today the plan plugin's theme
config bakes both the data manifest (which fields, types, sentiments)
**and** the rendering shape (flat chip rows, left/right justified for
the "primary" header) into a single `structure` tree. The badge styling
has drifted between standalone `{% badge %}` and entity-header badges,
the rendering shape is locked at the plugin layer, and the positional
names (`header-primary` / `header-secondary`) bury the actual semantic
roles. Split the concerns: plugins declare a meta-field manifest +
semantic zones; themes pick a layout primitive per zone; the engine
glues them.

## Problem

Three concrete pain points, observed on the plan plugin's work / bug /
decision runes but generalisable to any card-shaped metadata-bearing
rune.

**1. Badge style drift between `{% badge %}` and entity-header badges.**
The standalone `{% badge %}` rune renders as a chip — no border, soft
sentiment-tinted background, compact padding (`packages/lumina/styles/runes/badge.css`):

```css
.rf-badge {
  border: none;
  background: color-mix(in srgb, var(--meta-color) 10%, transparent);
  color: var(--meta-color);
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: var(--rf-radius-sm);
}
```

Entity-header badges (id / status / priority / etc.) render as bordered
pills via the universal metadata base in
`packages/lumina/styles/dimensions/metadata.css`:

```css
[data-meta-type="category"] {
  border: 1px solid var(--rf-color-border);
  background: transparent;
  color: var(--rf-color-muted);
  padding: 0.5em 1em;
  border-radius: 999px;
}
```

Both share the `data-meta-type` / `data-meta-rank` / `data-meta-sentiment`
contract the engine emits — the visual fork is entirely at the CSS
layer. The "chip" look reads as more modern and is what plan-progress
counts already adopted; the bordered pill in entity headers looks like
form-field tagging from a different era. No reason for one rune system
to ship two looks for the same primitive.

**2. Header rendering shape is plugin-owned, not theme-owned.** The
plan plugin declares the entity header's full DOM tree in its theme
config (`plugins/plan/src/config.ts:69-90`):

```ts
structure: {
  'header-primary': {
    tag: 'div',
    children: [
      { tag: 'span', ref: 'id-badge', metaText: 'id', metaType: 'id', metaRank: 'primary' },
      { tag: 'span', ref: 'status-badge', metaText: 'status', metaType: 'status', ... },
    ],
  },
  'header-secondary': {
    tag: 'div',
    children: [
      { tag: 'span', ref: 'priority-badge', metaText: 'priority', label: 'Priority:', metaType: 'category', ... },
      { tag: 'span', ref: 'complexity-badge', metaText: 'complexity', label: 'Complexity:', metaType: 'quantity', ... },
      // … 5 more
    ],
  },
}
```

The shape is fixed: a flat row of chips per zone. A theme that wants to
render the same fields as a `<dl>` definition list, a `<table>`, a
single-line dot-separated summary, or a sticky bar can't — the engine
maps `structure.children` directly to spans. Themes can restyle the
chips, but they can't change the layout primitive without overriding
the entire structure tree (and inheriting all the data-handling work
the plugin did).

**3. Positional names obscure semantic roles.** `header-primary` and
`header-secondary` say where the zone sits, not what it's for. The
primary header is functionally a **split eyebrow** — left chip
identifies (`id`), right chip status-flags (`status`), no labels, used
for at-a-glance context before reading the title. The secondary header
is functionally a **metadata block** — labelled fields, descriptive
attributes (`priority`, `complexity`, `assignee`, `milestone`, …).
These are different design-system primitives with different
information-density goals, but the names treat them as a generic header
gradient.

Lifting the semantic names out (`eyebrow` / `metadata`) also makes them
reusable: any future rune wanting an eyebrow above its title can
declare one with a one-line config, and themes style every eyebrow the
same way. The position name (`eyebrow`) is the same regardless of
whether the rune projects structured chips into the slot (work, bug,
decision) or expects the user to author prose there (card, recipe,
hero) — the source-of-content distinction is per-rune config, not a
vocabulary split.

## Goals

- **Unified chip primitive.** The chip look from
  `runes/badge.css` becomes the base in
  `dimensions/metadata.css`. The per-rune override file goes away.
  Plan entity headers and standalone badges look the same.

- **Plugin–theme concern split for rune headers.** The plugin declares
  a **meta-field manifest** (semantic data: which fields exist, their
  types, sentiments, labels, conditions) and a **zone manifest** (which
  fields populate which semantic zones). The theme declares a **layout
  per zone** from a small vocabulary of primitives. The engine renders
  by combining the two.

- **Semantic zone names + canonical ordering.** `eyebrow`,
  `title`, `blurb`, `metadata`, `body` name the positions that
  today's plan-entity config calls `header-primary`, `preamble`,
  `header-secondary`, `content`, etc. The position vocabulary has
  an implicit render order
  (`eyebrow → title → blurb → metadata → body`), so the rune-level
  `slots: string[]` array goes away — the vocabulary IS the order.
  `preamble` becomes a derived CSS wrapper the engine emits around
  the header region automatically. Old positional names continue
  to work via the legacy `slots: [...]` shim for one release.

- **One eyebrow slot per rune; the rune picks the source.**
  The position above the title is called `eyebrow` regardless of
  where its content comes from. A rune declares either
  `zones.eyebrow = { left, right }` (engine projects structured chips
  from the rune's attributes) **or** `sections.eyebrow = 'eyebrow'`
  (user authors prose at that slot in the rune body). The two are
  mutually exclusive — declaring both is a config-time error.
  Runes that want neither just don't have an eyebrow. Same DOM
  target (`.rf-{block}__eyebrow`, `[data-zone="eyebrow"]`), same
  CSS, regardless of which source filled it.

- **Layout primitives.** A small vocabulary covers the visible cases:
  `split`, `chip-row`, `definition-list`. Future additions
  (`table`, `inline-summary`, `sticky-bar`) plug into the same hook
  without touching plugin or engine code.

- **Composable rune handles for layout primitives.** Each layout
  primitive also exposes a user-authoring rune so the same shape can
  be composed in prose without needing a plugin to project it:
  `{% eyebrow %}…{% /eyebrow %}` (split layout) and
  `{% deflist %}…{% /deflist %}` (definition-list layout). Same DOM,
  same CSS, same chip primitive as the projected versions.

- **Backwards compatible.** Existing structure trees continue to work
  via a transition path: the engine recognises legacy `header-primary`
  / `header-secondary` slot names and renders them via the
  `chip-row` layout exactly as today. Plugins migrate to the new
  manifest at their own pace.

## Design Principles

**Data manifest stays with the plugin.** Which fields a work item has,
what each field means, what sentiment maps onto a priority value — all
domain knowledge. Themes shouldn't see this except as data.

**Layout shape stays with the theme.** Whether a metadata block reads
as chips, a definition list, or a table — all presentation. Plugins
shouldn't bake one choice into their config.

**Zones are semantic, not positional.** `eyebrow` says "the
contextualizing strip above the title"; `metadata` says "the
descriptive field list below the title." A theme could render eyebrow
as the right column of a sidebar without breaking semantics.

**Position, source, and layout are independent dimensions.** This
spec organises around three orthogonal axes:

1. **Position** (the slot name): `eyebrow`, `metadata`, `body`, etc.
   A vocabulary primitive that says "where in the rune's structure
   this content lives." Themes style by position.
2. **Source** (where the content comes from): `zones` (engine
   projects from rune attrs) or `sections` (user authors prose at
   the slot). The rune picks one per slot at config time.
3. **Layout** (which DOM shape renders the contents): `split`,
   `chip-row`, `definition-list`. The theme picks per zone. User
   sections render as their natural inline content unless a
   composable layout rune is dropped in.

The three dimensions don't interact: a `metadata` zone could be
rendered as `chip-row` or `definition-list` without changing what
"metadata" means; an `eyebrow` could be projected by the engine or
authored by the user without changing what "eyebrow" means.

**Layout primitives are a closed vocabulary, not arbitrary HTML.** A
theme picks one of `{split, chip-row, definition-list, …}`, not a tag
tree. New primitives are added by the engine when the vocabulary needs
to grow; theme-specific layouts live as one-off overrides for that
theme only.

**One chip primitive across runes.** Standalone `{% badge %}` and
entity-header values share the same chip CSS. The chip is part of the
metadata-dimension contract, not a per-rune style.

**`metaType` is typography, not geometry.** `data-meta-type="id"`
says "this is an identifier" (drives monospace font, copy semantics,
a11y label hints). It does **not** say "render as a bordered
monospace pill". The shape around a value (chip, plain text, gutter
cell) comes from the layout primitive, not the type. The same field
appears as primary-color text in an eyebrow's left slot and as a
chip inside a `<dd>` of a def-list — no per-field config change.
Today's metadata.css conflates the two; the rewrite splits them
(`[data-meta-type="id"]` → typography only; geometry moves to
`[data-layout]` selectors).

-----

## Authoring Surface

The authoring surface (what content authors write) does not change.
`{% work id="WORK-051" status="ready" priority="high" %}` still works
the same way — the change is entirely in how plugins declare rune
config and how themes consume it.

## Implementation Surface

The plugin's theme config gains two new fields alongside today's
`structure`:

```ts
Work: {
  block: 'work',
  defaultDensity: 'full',
  checklist: true,
  // No `slots: [...]` array — engine derives render order from the
  // canonical vocabulary (eyebrow → title → blurb → metadata → body).

  // NEW: pure data manifest — domain semantics only.
  metaFields: {
    id:         { metaType: 'id',       metaRank: 'primary' },
    status:     { metaType: 'status',   metaRank: 'primary',
                  sentimentMap: { draft: 'neutral', ready: 'neutral',
                                  'in-progress': 'neutral', review: 'caution',
                                  done: 'positive', blocked: 'negative' } },
    priority:   { metaType: 'category', metaRank: 'primary', label: 'Priority',
                  sentimentMap: { critical: 'negative', high: 'caution',
                                  medium: 'neutral', low: 'neutral' } },
    complexity: { metaType: 'quantity', metaRank: 'secondary', label: 'Complexity' },
    assignee:   { metaType: 'tag',      metaRank: 'secondary', label: 'Assignee',
                  condition: 'assignee' },
    milestone:  { metaType: 'tag',      metaRank: 'secondary', label: 'Milestone',
                  condition: 'milestone' },
    source:     { metaType: 'id',       metaRank: 'secondary', label: 'Source',
                  condition: 'source' },
    created:    { metaType: 'temporal', metaRank: 'secondary', label: 'Created',
                  tag: 'time', condition: 'created' },
    modified:   { metaType: 'temporal', metaRank: 'secondary', label: 'Modified',
                  tag: 'time', condition: 'modified' },
    tags:       { metaType: 'tag',      metaRank: 'secondary', label: 'Tags',
                  condition: 'tags' },
  },

  // NEW: zones — which fields populate each semantic zone.
  zones: {
    eyebrow:  { left: ['id'], right: ['status'] },
    metadata: { fields: ['priority', 'complexity', 'assignee', 'milestone',
                         'source', 'created', 'modified', 'tags'] },
  },

  // EXISTING: title + body sections continue to work as today.
  sections: { title: 'title', blurb: 'description', body: 'body' },
}
```

The theme declares one layout per zone (theme-wide defaults), with the
option to override per rune:

```ts
// Lumina (theme config)
zoneLayouts: {
  // Default for every rune that declares each zone:
  eyebrow:  'split',
  metadata: 'definition-list',

  // Per-rune override (optional):
  Work: { metadata: 'definition-list' },
  Milestone: { metadata: 'chip-row' }, // milestones have fewer fields
},
```

The engine looks up the rune's zones, pairs each with the theme's
layout choice, and renders.

### Source-of-content per slot: `zones` vs `sections`

A rune declares each header slot via **one** of two config keys:

```ts
// Work — projected eyebrow + projected metadata.
Work: {
  zones: {
    eyebrow:  { left: ['id'], right: ['status'] },
    metadata: { fields: ['priority', 'complexity', …] },
  },
  sections: { title: 'title', blurb: 'description', body: 'body' },
}

// Card — user-authored eyebrow, no projected meta.
Card: {
  zones: {},  // none
  sections: {
    eyebrow: 'eyebrow',   // user content fills the slot
    title: 'title',
    body: 'body',
  },
}

// Recipe — user-authored eyebrow + projected metadata.
Recipe: {
  metaFields: {
    servings:   { metaType: 'quantity', label: 'Serves' },
    prepTime:   { metaType: 'temporal', label: 'Prep' },
    cookTime:   { metaType: 'temporal', label: 'Cook' },
    difficulty: { metaType: 'category', label: 'Difficulty',
                  sentimentMap: { easy: 'positive', medium: 'caution',
                                  hard: 'negative' } },
  },
  zones: {
    metadata: { fields: ['servings', 'prepTime', 'cookTime', 'difficulty'] },
  },
  sections: {
    eyebrow: 'eyebrow',   // user authors the eyebrow prose
    title: 'title',
    blurb: 'description',
    body: 'body',
  },
}
```

Same slot name (`eyebrow`) in both keys is the conflict case — engine
errors at config time. The rune picks one source per slot; mixing
both is ambiguous and almost certainly a config mistake.

When a slot's content source is `sections`, the user's authored
content is rendered into the slot's wrapper element as-is. If the
user wants the `split` layout inside an authored eyebrow section,
they reach for `{% eyebrow %}` (see **Composable Rune Handles** below)
inside the section content. Themes don't apply a layout primitive to
authored sections automatically.

### Canonical ordering, and the slots collapse

Vocabulary positions have an implicit render order:

```
eyebrow → title → blurb → metadata → body
```

The engine emits each present zone / section as a wrapper at its
canonical position, skipping the ones the rune didn't declare. No
explicit `slots: string[]` field is needed on the rune config — the
**vocabulary IS the order**.

The previous `slots: string[]` array (today: `['header-primary',
'preamble', 'header-secondary', 'content']`) is removed from the
rune-level config in the new model. It collapsed three concerns
into one (vertical ordering + wrapper naming + position-of-content);
zones + sections handle naming and source, the canonical vocabulary
handles ordering, and `'content'` becomes the implicit `body`
section.

#### `preamble` is a derived wrapper

Some themes want a single CSS hook around the whole header region
(`eyebrow + title + blurb + metadata`) — Lumina's existing
`.rf-{block}__preamble` class. The engine derives this wrapper
automatically when a rune declares any of the header-region
positions; themes target it via the same selector. Plugins don't
need to declare `preamble` explicitly.

#### Custom ordering — opt-in escape hatch

A rune that genuinely needs unusual ordering declares an explicit
`order: [...]` field listing the positions in render order:

```ts
WeirdRune: {
  zones: { ... },
  sections: { ... },
  order: ['metadata', 'eyebrow', 'title', 'body'],  // explicit override
}
```

Most runes won't need this. The vocabulary's canonical order
covers the design pattern of nearly every entity, card, and hero
layout.

#### Disambiguation: not the layout-system `slots`

There's a separate `slots: Record<string, LayoutSlot>` field at
`packages/transform/src/types.ts:338` used by the layout-system
(SPEC-064-ish — page layouts with named regions). That's a
different mechanism at a different layer and stays. The rune-level
`slots: string[]` (described above) is what this spec removes.

## Layout Primitives

A closed vocabulary, each with a documented DOM shape, value-rendering
rule, and CSS contract.

**Value rendering is the layout's responsibility, not the field's.**
A field's `metaType` is a typing hint (used for accessibility, copy
semantics, monospace fonts, tabular numerals) — not a styling
directive. The geometry (chip vs plain text vs gutter cell) comes
from whichever layout primitive renders the field. The same field
can appear as plain text in one layout and a chip in another without
any per-field config change.

### `split`

**Intent:** Eyebrow / contextual strip — two or more cells justified
to opposite ends. No labels (visual position carries semantic). Used
for identifier + status, breadcrumb + actions, etc.

**Value rendering:** Left-side value = plain text (primary-color);
right-side value = chip if the field carries `sentimentMap`,
otherwise plain text. This produces the same visual a user would
write manually in an authored `{% eyebrow %}` (text on the left,
`{% badge %}` on the right). The chip emitted on the right is
visually identical to the standalone `{% badge %}` rune.

**DOM:**
```html
<div class="rf-{block}__eyebrow" data-zone="eyebrow" data-layout="split">
  <div data-eyebrow-slot="left">
    <span data-meta-type="id" data-meta-rank="primary">WORK-051</span>
  </div>
  <div data-eyebrow-slot="right">
    <span class="rf-badge" data-meta-type="status"
          data-meta-rank="primary"
          data-meta-sentiment="positive">done</span>
  </div>
</div>
```

The left-side `<span>` is plain text under Lumina's
`[data-eyebrow-slot="left"]` CSS (`color: var(--rf-color-primary);
font-weight: 500;` + monospace when `data-meta-type="id"`). The
right-side child is the universal chip primitive — same class and
DOM the `{% badge %}` rune emits — so the styling is shared, not
duplicated.

**CSS contract on the zone wrapper:** `display: flex;
justify-content: space-between; align-items: center; gap: 0.5rem`.

**Authoring:** `zones.eyebrow = { left: ['id'], right: ['status'] }`.
Extends to N slots via `{ left, center, right }` or `{ slots: [...] }`
if needed.

### `chip-row`

**Intent:** Today's secondary-header default — a flowing row of
chips with optional labels. Good for at-a-glance summaries with 2–5
fields.

**Value rendering:** Every field is rendered as a chip. The chip
carries `data-meta-type` (for typography) and `data-meta-sentiment`
(for tint, when sentiment is present). No bordered-pill geometry —
the chip is the universal shape.

**DOM:**
```html
<div class="rf-{block}__metadata" data-zone="metadata" data-layout="chip-row">
  <span class="rf-badge" data-meta-type="category"
        data-meta-sentiment="caution">
    <span data-meta-label>Priority:</span>
    <span data-meta-value>high</span>
  </span>
  <span class="rf-badge" data-meta-type="quantity">
    <span data-meta-label>Complexity:</span>
    <span data-meta-value>moderate</span>
  </span>
  …
</div>
```

**CSS contract on the zone wrapper:** `display: flex; flex-wrap:
wrap; gap: 0.5rem`.

### `definition-list`

**Intent:** Semantic term/description pairs for descriptive
metadata. Better information density than chips when there are 5+
fields, and better a11y (`<dl>` announces as definition list to
screen readers).

**Value rendering:** `<dd>` value = chip when the field carries
`sentimentMap` (the chip lives inside the `<dd>` so the row layout
isn't disrupted), otherwise plain text. The `<dt>` always renders
the label.

**DOM:**
```html
<dl class="rf-{block}__metadata" data-zone="metadata" data-layout="definition-list">
  <div data-name="row">
    <dt data-meta-label>Priority</dt>
    <dd>
      <span class="rf-badge" data-meta-type="category"
            data-meta-sentiment="caution"
            data-meta-rank="primary">high</span>
    </dd>
  </div>
  <div data-name="row">
    <dt data-meta-label>Complexity</dt>
    <dd data-meta-type="quantity">moderate</dd>
  </div>
  <div data-name="row">
    <dt data-meta-label>Assignee</dt>
    <dd data-meta-type="tag">@alice</dd>
  </div>
  …
</dl>
```

**CSS contract on the zone wrapper:** `display: grid;
grid-template-columns: max-content 1fr; gap: 0.25rem 1rem`. Each
`data-name="row"` is `display: contents` so the `<dt>` and `<dd>`
participate in the outer grid.

**Chip-or-text decision:** A field renders its value as a chip when
it has a `sentimentMap`. Everything else renders as plain text
inside the `<dd>` carrying the field's `data-meta-type` for
typography (monospace for ids, tabular nums for quantities, etc.).

### Future primitives (out of v1 scope, declared for the vocabulary)

- **`table`** — `<table>` with one row per field, good for very dense
  entity grids.
- **`inline-summary`** — single-line dot-separated list, e.g.
  `high · moderate · @alice`. For card thumbnails.
- **`sticky-bar`** — same data as `chip-row` but pinned to viewport
  bottom while the entity body is in view.

## Composable Rune Handles

Each layout primitive also ships as a standalone authoring rune so the
same shape can be composed in prose, inside other runes (card,
recipe, hero), without needing a plugin to project it. Same DOM,
same CSS, same chip primitive — the only difference is the content
source (user-authored vs engine-projected).

### `{% eyebrow %}` — split layout, composable

A block-level rune that renders the `split` layout primitive. Body
splits on a top-level `---` into `left` / `right` halves (matches the
authoring convention `{% drawer %}` uses for its body / footer split,
and `{% card %}` uses for its body / media split):

```markdoc
{% card %}
{% eyebrow %}
ID-123
---
{% badge sentiment="positive" %}done{% /badge %}
{% /eyebrow %}

# Card title

Body content
{% /card %}
```

DOM identical to a projected `zones.eyebrow = { left, right }` —
`<div data-zone="eyebrow" data-layout="split">…</div>` with the two
slots. Composable inside any container rune; renders as standalone
when used in plain prose.

### `{% deflist %}` — definition-list layout, composable

A block-level rune that renders the `definition-list` layout
primitive over user-authored term/description pairs. Authoring
convention is a markdown list with `**Term:**` leading each item:

```markdoc
{% deflist %}
- **Priority:** {% badge sentiment="caution" %}high{% /badge %}
- **Complexity:** moderate
- **Assignee:** @alice
{% /deflist %}
```

The rune parses each `**Term:**` prefix as the `<dt>` and the rest of
the list item as the `<dd>`. Inline runes inside the description
(badges, refs, code) compose naturally. DOM identical to a projected
metadata zone using the `definition-list` layout.

Use cases beyond projected metadata:
- A blog post explaining config options: term = option name,
  description = behaviour + default.
- A glossary in prose.
- A card's body filling in attribute details.

### Naming considerations

`deflist` matches the HTML element shorthand and is the canonical
name. `definitions` and `terms` are alternate aliases (registered via
`Plugin.runes.aliases`). `{% chiprow %}` is deferred — see the Open
Questions section for the reasoning.

## Engine Changes

`packages/transform/src/engine.ts` gains:

1. **Zone resolution.** When a rune config declares `zones`, the engine
   resolves each zone's `fields` against the rune's `metaFields`
   manifest to materialise a list of resolved field descriptors
   (label + value + metaType + metaRank + sentiment).

2. **Layout dispatch.** For each zone, the engine reads the theme's
   `zoneLayouts[runeName][zoneName]` (with a theme-wide fallback) to
   pick a layout. A small per-layout renderer turns the resolved field
   list into the DOM described above.

3. **Backwards-compat shim.** A rune config that still uses the legacy
   `structure` tree with `header-primary` / `header-secondary` slots
   continues to render via today's path. The shim is removed in a
   later release after plugins migrate.

The existing `metaType` / `metaRank` / `sentimentMap` / `editHints`
machinery carries through unchanged — they're field-level concerns, not
layout-level.

## Lumina Changes

The CSS rewrite is the "type is typography, layout is geometry"
split.

`packages/lumina/styles/dimensions/metadata.css` — strip geometry,
keep typography:

- Remove pill/border/padding from base `[data-meta-type=…]`
  selectors. Keep only typography hints:
  - `[data-meta-type="id"]` → `font-family: var(--rf-font-mono)`
  - `[data-meta-type="quantity"]` → `font-variant-numeric:
    tabular-nums`
  - `[data-meta-type="temporal"]` → `font-variant-numeric:
    tabular-nums`
  - Other types: no base styling (typography comes from inheritance).
- Move geometry to layout selectors:
  - `[data-zone] [data-layout="chip-row"] > * { /* chip styling */ }`
  - `[data-zone] [data-layout="split"] [data-eyebrow-slot="left"]
    { color: var(--rf-color-primary); … }`
  - `[data-zone] [data-layout="definition-list"] { display: grid; …}`
- Sentiment rules unchanged (`[data-meta-sentiment]` still drives
  `--meta-color`).

`packages/lumina/styles/runes/badge.css` — promote, then unify:

- The chip look (no border, soft sentiment-tinted background, compact
  padding) becomes the universal `.rf-badge` class.
- Chips emitted by layout primitives (`chip-row` and the right-slot
  of `split`, def-list `<dd>` with sentiment) carry `class="rf-badge"`
  in addition to their `data-meta-*` attributes — same visual as the
  standalone `{% badge %}` rune.

`packages/lumina/styles/runes/work.css` (and bug, decision, spec,
milestone):

- Drop the per-rune chip overrides.
- Drop the `__header-primary` justify-content override (the
  `split` layout owns this).
- Keep rune-specific touches: complexity dots, assignee `@` prefix,
  body section dividers.

Linked-eyebrow special case (preserves today's hero behaviour):

- `[data-zone="eyebrow"] a` → primary-color underline treatment.
  Works for any eyebrow whose authored content is an `<a>`,
  regardless of source. The existing hero pattern (e.g. site-index
  hero with a link as eyebrow text) inherits this for free.

## Zone Overrides — theme power

Themes can rebalance content across zones for a specific rune. This
is **Level 2** power in the spec's terms: theme can move fields
between zones, but cannot invent new zone names or change zone
semantics. The vocabulary stays closed.

### Mechanism

Plugin's `zones` declaration is the **default placement**. Theme
provides per-rune overrides via `zones.{RuneName}` on the theme
config. Each override **replaces** the corresponding plugin zone
wholesale — no partial merge inside a zone (keeps the mental model
simple).

```ts
// Plugin (storytelling)
Character: {
  metaFields: {
    role:    { metaType: 'category', label: 'Role' },
    status:  { metaType: 'status',   label: 'Status',
               sentimentMap: { alive: 'positive', dead: 'negative',
                               missing: 'caution', unknown: 'neutral' } },
    age:     { metaType: 'quantity', label: 'Age' },
    faction: { metaType: 'tag',      label: 'Faction',
               condition: 'faction' },
    realm:   { metaType: 'tag',      label: 'Realm',
               condition: 'realm' },
  },
  zones: {                              // plugin's default placement
    eyebrow:  { left: ['role'], right: ['status'] },
    metadata: { fields: ['age', 'faction', 'realm'] },
  },
}

// Lumina — accepts plugin defaults, only declares layouts
zoneLayouts: { eyebrow: 'split', metadata: 'definition-list' }
// Renders: `Antagonist | Alive` → `# Veshna` → def-list of age / faction / realm

// Encyclopaedic theme — rebalances Character's fields
zones: {
  Character: {
    eyebrow: null,                                                   // suppress
    metadata: { fields: ['role', 'status', 'age', 'faction', 'realm'] },
  },
}
// Renders: no eyebrow → `# Veshna` → def-list of all five fields including
// role + status (with status rendering as a sentiment chip per def-list rules)
```

### Rules

- **Omit a zone** in theme override → inherit plugin default.
- **`null`** in theme override → suppress the zone (no rendering).
- **Object** in theme override → replace the plugin zone wholesale.
- **New zone the plugin didn't declare** → allowed, but only if
  every field listed exists in the plugin's `metaFields`. Engine
  errors at config time if the theme references unknown fields.
- **Field reused across zones** → allowed. The same field can
  appear in both `eyebrow` and `metadata` if the theme wants
  redundancy (e.g. `id` on eyebrow AND in the metadata def-list as
  copy-fodder). Engine doesn't error; it's a design choice.

### Resolution order

Configs layer plugin → theme → site → page-frontmatter. Each
subsequent layer can override per-rune zone declarations from the
previous. Site-level overrides are useful for "this whole site
suppresses entity eyebrows" without changing plugin or theme code;
page-frontmatter overrides are useful for one-off "this page wants
the alternate layout" cases.

The chain resolution semantic is **per zone**: later layers
replace specific zones, not the whole `zones.{RuneName}` block.
This way a site can suppress just the eyebrow without losing the
theme's metadata override.

## Plan Plugin Changes

`plugins/plan/src/config.ts`:

- Each entity gets a `metaFields` manifest + a `zones` declaration.
- The existing `structure` field is removed (migrated to `zones`).
- The existing `slots: [...entitySlots]` arrays are removed (engine
  derives render order from canonical vocabulary).
- The `entitySlots` constant goes away.
- The engine's backwards-compat shim catches any third-party plugins
  still using the old `slots` + `structure` shape — plan plugin
  itself can lead the migration.

## Acceptance Criteria

- [ ] `metaFields` and `zones` accepted on `RuneConfig` and threaded
  through `mergeThemeConfig`.
- [ ] Engine layout dispatcher with three layouts implemented:
  `split`, `chip-row`, `definition-list`. New tests in
  `packages/transform/test/engine-zones.test.ts` cover each layout's
  DOM contract.
- [ ] **Mutual-exclusion validation.** Engine errors at config time
  when a rune declares both `zones.eyebrow` and `sections.eyebrow`
  (or any other slot name used by both `zones` and `sections`).
  Test in `engine-zones.test.ts` confirms the error message names
  the conflicting slot.
- [ ] Backwards-compat shim renders legacy `slots: [...]` +
  `structure: { ... }` rune configs via the matching layout
  primitives — `header-primary` → `split` (when children fit a
  left/right pattern) or `chip-row`, `header-secondary` →
  `chip-row`, `content` → body. Engine emits a build-time warning
  on first encounter naming the rune + the migration path.
- [ ] **Canonical-ordering engine path.** Engine derives render
  order from the position vocabulary
  (`eyebrow → title → blurb → metadata → body`) when no explicit
  `order: [...]` field is declared. Test in
  `engine-zones.test.ts` covers: all positions, sparse positions
  (only eyebrow + body), custom-order override, and the legacy
  `slots: [...]` shim path.
- [ ] **`preamble` wrapper auto-derivation.** Engine emits the
  `.rf-{block}__preamble` wrapper around `title + blurb` (and
  `eyebrow` when projected, see canonical order) when any of those
  positions is declared. No-op when the rune has no header region.
- [ ] **`{% eyebrow %}` rune.** New core rune in
  `packages/runes/src/tags/eyebrow.ts`. Content model splits body on
  top-level `---` into `left` / `right`. Emits the same DOM as a
  projected `zones.eyebrow = { left, right }` with the `split`
  layout. Tests in `packages/runes/test/eyebrow.test.ts`.
- [ ] **`{% deflist %}` rune.** New core rune in
  `packages/runes/src/tags/deflist.ts`. Content model parses a list
  where each item starts with `**Term:**` (or `<strong>Term:</strong>`
  in the parsed AST) as a `<dt>` + `<dd>` pair. Emits the same DOM
  as a projected metadata zone with the `definition-list` layout.
  Tests in `packages/runes/test/deflist.test.ts` cover the parsing,
  inline-rune composition (badges, refs inside `<dd>`), and the
  fallback when items don't follow the `**Term:**` convention.
- [ ] **`metaType` typography / layout geometry split.** Lumina's
  `dimensions/metadata.css` is rewritten so `[data-meta-type=…]`
  selectors carry only typography hints (monospace, tabular nums,
  etc.). Geometry (chip padding, border, layout) moves to
  `[data-layout=…]` selectors. Existing CSS coverage tests updated;
  the universal `.rf-badge` class becomes the chip primitive,
  emitted by layout primitives + the standalone `{% badge %}` rune.
  `runes/badge.css` consolidated into the metadata-dimension base.
- [ ] **Zone overrides supported.** Theme can override per-zone via
  `zones.{RuneName}.{zoneName}`. `null` suppresses; object replaces;
  omit inherits plugin default. New zones (not declared by plugin)
  allowed when every referenced field exists in `metaFields`;
  engine errors otherwise. Tests in `engine-zones.test.ts` cover
  replace, suppress, inherit, and unknown-field-error cases.
- [ ] **Linked-eyebrow CSS preserved.** Lumina styles `[data-zone=
  "eyebrow"] a` with the primary-color underline treatment (matches
  today's hero behaviour). Tested visually on the site-index hero;
  no regressions.
- [ ] Plan plugin migrated. Work / bug / decision / spec / milestone
  all declare `metaFields` + `zones`, render with the new layouts on
  Lumina, and pass the existing snapshot/HTML tests with the new DOM
  shape.
- [ ] Docs updated: `site/content/extend/theme-authoring/header-zones.md`
  (or similar) explains the manifest / layout split with worked
  examples. `site/content/runes/plan/work.md` (if it exists) updates
  any output-contract snippets that referenced the old `header-primary`
  selectors.
- [ ] Eyebrow as a vocabulary primitive: the card rune's authoring
  spec confirms it can accept an eyebrow slot (even if v1 implementation
  is just the zone-declaration capability — actual eyebrow content on
  card is a follow-up work item).

## Migration Notes

- **Theme authors** can opt into the new manifest by declaring
  `zoneLayouts` on their theme config. Without it, the engine falls
  back to `chip-row` for any non-legacy zone — visually similar to
  today's secondary-header layout.

- **Plugin authors** migrate by:
  1. Dropping the `slots: [...]` array from rune configs. The engine
     derives render order from the canonical vocabulary.
  2. Renaming `structure.header-primary` / `header-secondary`
     entries into `metaFields` + `zones`. Slot-keyed structure
     entries (`structure.X = { slot: 'header-primary', ... }`)
     become field entries in the appropriate zone's `left` / `right`
     / `fields` array.
  3. Removing the per-field `tag` / `ref` boilerplate — the layout
     primitive owns the DOM shape now.
  4. A rune that needs unusual ordering declares `order: [...]`
     explicitly; otherwise the canonical vocabulary order applies.

- **CSS authors targeting the old class names**
  (`.rf-work__header-primary`, etc.) need to update selectors. The new
  classes are zone-named (`.rf-work__eyebrow`, `.rf-work__metadata`).
  Documented in the changeset as an internal-protocol change (these
  classes are theme-level, not authored content).

## Dependencies

- {% ref "SPEC-068" /%} (or whichever spec governs the metadata dimension
  contract) — the chip primitive consolidation builds on the existing
  `data-meta-*` attribute contract.

## References

- {% ref "SPEC-051" /%} — universal theming dimensions (where metadata
  fits).
- {% ref "SPEC-068" /%} — metadata dimension contract.

## Open Questions

- **`{% chiprow %}` composable rune.** `{% eyebrow %}` and
  `{% deflist %}` give authoring handles for the `split` and
  `definition-list` primitives. The `chip-row` primitive doesn't get
  one in v1 — the existing pattern of inlining multiple `{% badge %}`s
  is already an authoring handle for chip-row-ish shapes. A dedicated
  `{% chiprow %}` would mostly add wrapping / spacing guarantees, not
  new capability. Worth revisiting once a concrete authoring need
  appears.
- **Vocabulary scope.** Does v1 ship `split` + `chip-row` +
  `definition-list`, or also include `table`? My instinct says ship
  three and add `table` when a concrete consumer asks for it.
- **Eyebrow slot count.** `split` is documented as 2-slot (left,
  right). Some designs want 3-slot (left, center, right) — worth
  supporting now or punt?
- **Theme-level vs rune-level defaults.** The proposal allows both
  (`zoneLayouts.eyebrow` is theme-wide, `zoneLayouts.Work.eyebrow`
  overrides per-rune). Is that the right granularity, or should it
  always be per-rune?
- **Closed vocabulary scope.** The position vocabulary
  (`eyebrow`, `title`, `blurb`, `metadata`, `body`) covers every
  rune we've stress-tested against (plan entities, card, recipe,
  hero, character). Worth declaring it formally closed (any
  extension goes through a spec update) or leaving it open so
  plugins can register new positions? Probably formally closed —
  same logic as the layout primitive vocabulary; new positions
  are vocabulary changes, not plugin config.
- **CSS namespacing of `data-layout`.** Should `data-layout="split"`
  conflict-check against existing `data-layout` attributes used by
  other runes (e.g. `gallery`)? Probably fine since the engine scopes
  them to zone elements, but worth verifying.
- **Mutual-exclusion validation timing.** Should the
  `zones.eyebrow` + `sections.eyebrow` conflict be caught at
  `mergeThemeConfig` time (synchronous, fails the build with a clear
  error) or only at pipeline preprocess time? Build-time feels right
  but means the validator needs the full merged config to check.
- **`{% deflist %}` authoring fallback.** When a list item inside
  `{% deflist %}` doesn't start with `**Term:**`, do we (a) treat the
  whole item as a `<dd>` with no `<dt>`, (b) error at build, (c) emit
  the item as a plain `<li>` outside the `<dl>`? Probably (a) for
  authoring forgiveness, but worth deciding.
- **Partial-merge syntax for zone overrides.** v1 says theme override
  replaces a zone wholesale. Reasonable shortcut for "add `lifespan`
  to the right of Character's eyebrow without restating `left`"
  syntax? Something like `zones.Character.eyebrow.right.append =
  ['lifespan']`? Probably defer — wholesale replacement covers 95%
  of cases and the partial-merge syntax adds confusion.
- **Site / page-frontmatter override surface.** The spec proposes
  plugin → theme → site → page-frontmatter as the layer chain. Is
  page-frontmatter override actually useful, or does that put too
  much theming power in content authors' hands? Site-level feels
  important; page-level is more speculative.

{% /spec %}
