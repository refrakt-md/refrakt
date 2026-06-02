---
title: Universal Theming Dimensions
description: Semantic data attributes that enable generic cross-rune styling — metadata badges, density, sections, media, state, and more
---

# Universal Theming Dimensions

Traditional theme development requires per-rune CSS for every rune in the ecosystem. A recipe's difficulty badge, a character's status badge, and a work item's priority badge all need separate styles — even though they're conceptually the same thing.

Universal theming dimensions solve this. A handful of semantic data attributes describe **what** something is, not **how** it should look. The identity transform emits these attributes automatically from the rune config. A theme writes generic CSS rules targeting these attributes, and every rune — core, community, or custom — is styled.

## Overview

| Dimension | Attribute | Values | Controls | Declared by |
|-----------|-----------|--------|----------|-------------|
| **Meta type** | `data-meta-type` | `status`, `category`, `quantity`, `temporal`, `tag`, `id` | Typography hints (monospace, tabular-nums) | `MetaField.metaType` (or legacy `StructureEntry.metaType`) |
| **Sentiment** | `data-meta-sentiment` | `positive`, `negative`, `caution`, `neutral` | Badge / value color | `MetaField.sentimentMap` (or legacy `StructureEntry.sentimentMap`) |
| **Zone layout** | `data-zone-layout` | `bar`, `definition-list` | Geometric shape of a metadata block (flex row, dt/dd grid) | A block's `layout` primitive in `blocks` (SPEC-080) |
| **Density** | `data-density` | `full`, `compact`, `minimal` | Spacing and detail level | `RuneConfig.defaultDensity` + context |
| **Section** | `data-section` | `header`, `preamble`, `title`, `description`, `body`, `footer`, `media` | Structural anatomy | `RuneConfig.sections` |
| **Media** | `data-media` | `portrait`, `cover`, `thumbnail`, `hero`, `icon` | Image treatment | `RuneConfig.mediaSlots` |
| **Checklist** | `data-checked` | `checked`, `unchecked`, `active`, `skipped` | Checkbox list items | `RuneConfig.checklist` |
| **Sequence** | `data-sequence` | `numbered`, `connected`, `plain` | Ordered item indicators | `RuneConfig.sequence` |
| **State** | `data-state` | `open`, `closed`, `active`, `inactive`, `selected`, `disabled` | Interactive states | Behavior scripts |
| **Surface** | (class-based) | `card`, `inline`, `banner`, `inset` | Container treatment | Theme only |

The first three style metadata content. **Meta type** and **sentiment** describe the field itself; **zone layout** describes the geometric shape around groups of fields. The remaining dimensions style the rune's structure, content, and behavior.

> **Type-vs-layout split.** `data-meta-type` is *typography only* — it controls monospace for `id` / `code`, tabular nums for `quantity` / `temporal`, primary color for `id`, and nothing else. The geometric shape (chip pill, plain text, def-list cell) comes from `data-zone-layout` and the universal `.rf-badge` class. The same field renders as a chip in one block and as plain text in another with no per-field config change — the field's `metaType` and decorations decide its intrinsic shape, the block's layout primitive decides the surrounding geometry.

---

## Metadata dimensions

Metadata badges — status indicators, categories, durations, tags — appear across dozens of runes. The metadata system provides three dimensions so themes can style every badge generically.

### Declaring metadata — `metaFields`, `blocks`, `layout` (SPEC-080)

Runes declare their meta-bearing fields via the `metaFields` manifest on `RuneConfig`. Each entry is pure data — no rendering hints. Named `blocks` project fields from the manifest into a layout primitive, and the `layout` map places every child explicitly. See [Blocks & layout](/extend/theme-authoring/blocks-and-layout) for the full model.

```typescript
Recipe: {
  block: 'recipe',
  modifiers: {
    difficulty: { source: 'meta', default: 'medium' },
    prepTime: { source: 'meta' },
    servings: { source: 'meta' },
    tags: { source: 'meta', noBemClass: true },
  },
  metaFields: {
    prepTime:   { metaType: 'temporal', label: 'Prep',     tag: 'time', condition: 'prepTime' },
    servings:   { metaType: 'quantity', label: 'Serves',   condition: 'servings' },
    difficulty: { metaType: 'category', label: 'Difficulty',
                  sentimentMap: { easy: 'positive', medium: 'neutral', hard: 'caution' } },
    tags:       { metaType: 'tag',      label: 'Tags',     condition: 'tags', splitOn: ',' },
  },
  blocks: {
    metadata: { fields: ['prepTime', 'servings', 'difficulty'], layout: 'definition-list' },
    tags:     { fields: ['tags'], layout: 'bar' },
  },
  layout: { root: ['eyebrow', 'title', 'blurb', 'metadata', 'tags', 'body'] },
}
```

### MetaField fields

| Field | Type | Description |
|-------|------|-------------|
| `metaType` | `'status' \| 'category' \| 'quantity' \| 'temporal' \| 'tag' \| 'id' \| 'code'` | Semantic kind; drives intrinsic render shape and typography. Emits `data-meta-type` |
| `sentimentMap` | `Record<string, 'positive' \| 'negative' \| 'caution' \| 'neutral'>` | Maps the field's resolved value to a sentiment. Emits `data-meta-sentiment` when matched — color only, never changes shape |
| `label` | `string` | Human-readable label. Rendered as `<dt>` in a `definition-list`, and as link / icon text where applicable; `bar` fields are unlabelled |
| `condition` | `string` | Field renders only when the named modifier has a truthy value |
| `href` | `string` | Render the field as a link; the named modifier holds the URL. Renders bare (no chip) |
| `rating` | `{ total?: string }` | Render the field as a rating widget; the value is the filled count, `total` names the modifier holding the max (default `5`) |
| `icon` | `{ group: string }` | Decorate with a leading icon; the field's *value* selects the glyph within `group` |
| `tag` | `string` | Element tag override. Default `span`; use `time` for temporal fields so the engine emits `<time datetime="…">…</time>` |
| `splitOn` | `string` | Treat the value as a delimited collection — split on this character, render one element per item. Used for `tags`-style fields |
| `transform` | `'duration' \| 'uppercase' \| 'capitalize'` | Value transform applied before rendering |

### Legacy `StructureEntry` fields

Runes that haven't migrated to `metaFields` declare metadata inline on `StructureEntry` children (legacy path). The engine continues to render these through the existing slot-based assembly with the universal `.rf-badge` class applied automatically.

| Field | Type | Description |
|-------|------|-------------|
| `metaType` | `'status' \| 'category' \| 'quantity' \| 'temporal' \| 'tag' \| 'id'` | Same semantics as `MetaField.metaType` |
| `sentimentMap` | `Record<string, 'positive' \| 'negative' \| 'caution' \| 'neutral'>` | Same semantics as `MetaField.sentimentMap` |

### How the engine emits them

When a field renders as a chip (`metaType` is `status`, `category`, or `tag`), the engine emits `class="rf-badge"` plus the meta attributes:

```html
<!-- A recipe badge for difficulty="easy" -->
<span class="rf-badge"
      data-meta-type="category"
      data-meta-sentiment="positive">easy</span>
```

For bare values (`id`, `quantity`, `temporal`, `code`, or no `metaType`), the chip class is omitted and only typography hints carry through:

```html
<!-- A complexity value in a def-list <dd> -->
<dd data-meta-type="quantity">moderate</dd>
```

When no `sentimentMap` is provided, or the current value has no mapping, `data-meta-sentiment` is omitted and the value renders neutrally.

### Meta type CSS

Each type gets typography only — monospace for `id` / `code`, tabular-nums for `quantity` / `temporal`, primary color for `id`, nothing else for the rest. Geometry (chip pill, definition list grid, bar row) lives on `[data-zone-layout]` selectors.

```css
[data-meta-type="id"],
[data-meta-type="code"] {
  font-family: var(--rf-font-mono, monospace);
}

[data-meta-type="id"] {
  color: var(--rf-color-primary);
}

[data-meta-type="quantity"],
[data-meta-type="temporal"] {
  font-variant-numeric: tabular-nums;
}
```

The chip primitive (universal `.rf-badge`) supplies the pill shape, sentiment-tinted background, and compact padding. Layout selectors supply the surrounding arrangement (bar row, def-list grid).

### Sentiment CSS

Sentiment maps to color through a `--meta-color` custom property:

```css
[data-meta-sentiment="positive"] { --meta-color: var(--rf-color-success, #10b981); }
[data-meta-sentiment="negative"] { --meta-color: var(--rf-color-danger, #ef4444); }
[data-meta-sentiment="caution"]  { --meta-color: var(--rf-color-warning, #f59e0b); }
[data-meta-sentiment="neutral"]  { --meta-color: var(--rf-color-muted, #64748b); }

/* Colored dot indicator */
[data-meta-sentiment]::before {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--meta-color);
}
```

The `--meta-color` property cascades into the type rules. A status pill with `data-meta-sentiment="positive"` gets a green dot because `--meta-color` resolves to `--rf-color-success`.

### Zone layout CSS

The two layout primitives carry their own geometry:

```css
/* Horizontal flex row of fields, each in its intrinsic shape */
[data-zone-layout="bar"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

/* A field opting into align: 'end' is pushed (with everything after it) right */
[data-zone-layout="bar"] [data-align="end"] {
  margin-left: auto;
}

/* wrap: false keeps the row on one line */
[data-zone-layout="bar"][data-wrap="false"] {
  flex-wrap: nowrap;
}

/* Stacked dt/dd pairs flowing into multi-column at wider widths */
[data-zone-layout="definition-list"] {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem 1.5rem;
}

@media (min-width: 48rem) {
  [data-zone-layout="definition-list"] {
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  }
}
```

See [Blocks & layout](/extend/theme-authoring/blocks-and-layout) for the complete DOM contract each primitive emits.

### Labels

`MetaField` (or legacy `StructureEntry`) entries can include a `label` field. In `definition-list` it becomes the `<dt>`; in a `bar` it's ignored (bar fields are unlabelled, eyebrow-style, by contract). It is also used as the text for `href` links and `icon`-decorated fields.

```typescript
prepTime: { metaType: 'temporal', label: 'Prep', tag: 'time', condition: 'prepTime' }
```

For legacy `StructureEntry`-only paths, `labelHidden: true` makes the label visually hidden but accessible to screen readers — useful when the value is self-explanatory (like an ID badge where "WORK-042" doesn't need a visible "ID:" prefix).

---

## Structural dimensions

### Density

Controls how much detail a rune shows. Three levels:

| Value | Use case | What's visible |
|-------|----------|----------------|
| `full` | Dedicated page | All sections, generous spacing |
| `compact` | Grid cell, card | Descriptions truncated (2 lines), secondary metadata hidden |
| `minimal` | List view, backlog row | Title and primary metadata only |

**Declared on RuneConfig:**

```typescript
Accordion: { block: 'accordion', defaultDensity: 'full' }
Details: { block: 'details', defaultDensity: 'compact' }
Breadcrumb: { block: 'breadcrumb', defaultDensity: 'minimal' }
```

**Resolution order:** author attribute > rendering context > config default > `'full'`

The engine automatically applies context densities: runes inside a Grid or Bento get `compact`; runes inside a backlog or decision-log get `minimal`.

**CSS example:**

```css
[data-density="full"] { --rune-padding: var(--rf-spacing-md); }
[data-density="compact"] { --rune-padding: var(--rf-spacing-sm); }
[data-density="minimal"] { --rune-padding: var(--rf-spacing-xs); }

/* Compact: truncate descriptions */
[data-density="compact"] [data-section="description"] {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Minimal: hide everything except title and primary metadata */
[data-density="minimal"] [data-section="description"],
[data-density="minimal"] [data-section="body"],
[data-density="minimal"] [data-section="footer"] {
  display: none;
}
```

Density interacts with other dimensions — compact hides secondary metadata, minimal hides media slots.

### Sections

Maps structural elements to standard anatomical roles. The engine emits `data-section` on elements whose `data-name` matches a key in the `sections` map.

**Declared on RuneConfig:**

```typescript
Budget: {
  block: 'budget',
  sections: { header: 'header', title: 'title', footer: 'footer' },
}

Hero: {
  block: 'hero',
  sections: {
    preamble: 'preamble',
    headline: 'title',
    blurb: 'description',
    content: 'body',
  },
}
```

**Roles and their CSS:**

| Role | Typical content | Default styling |
|------|----------------|-----------------|
| `header` | Chrome row (badges, status) | Flex wrap, gap |
| `preamble` | Intro block (eyebrow + headline + blurb) | Flex column |
| `title` | Primary heading | 1.5rem, bold, scales with density |
| `description` | Secondary text | Muted color, truncated in compact |
| `body` | Main content | Standard line height |
| `footer` | Actions, links | Flex wrap, top border |
| `media` | Images, video | Standard margin |

```css
[data-section="header"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

[data-section="title"] {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

[data-section="footer"] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rf-spacing-sm);
  border-top: 1px solid var(--rf-color-border);
}
```

### Media slots

Maps image and media elements to treatment types.

**Declared on RuneConfig:**

```typescript
Figure: {
  block: 'figure',
  mediaSlots: { media: 'cover' },
}
```

**Slot types:**

| Value | Treatment | Size |
|-------|-----------|------|
| `portrait` | Circular crop, 1:1 aspect | 5rem default |
| `cover` | Full-width, top-rounded | 100% width |
| `thumbnail` | Small fixed square | 3rem default |
| `hero` | Full-width responsive | 100% width |
| `icon` | Small contained | 2rem default |

```css
[data-media="portrait"] {
  border-radius: var(--rf-radius-full);
  aspect-ratio: 1 / 1;
  object-fit: cover;
  width: var(--media-portrait-size, 5rem);
}

[data-media="cover"] {
  width: 100%;
  object-fit: cover;
  border-radius: var(--rf-radius-md) var(--rf-radius-md) 0 0;
}
```

Density interactions: compact reduces portrait size to 3rem; minimal hides all media.

### Checklist

Detects checkbox markers in list items and styles them.

**Declared on RuneConfig:**

```typescript
Work: { block: 'work', checklist: true }
```

When `checklist: true`, the engine scans `<li>` text for markers and emits `data-checked`:

| Marker | `data-checked` value | Meaning |
|--------|---------------------|---------|
| `[x]` | `checked` | Completed |
| `[ ]` | `unchecked` | Not done |
| `[>]` | `active` | In progress |
| `[-]` | `skipped` | Skipped |

The marker text is stripped from the output. CSS provides visual indicators:

```css
[data-checked]::before {
  content: '';
  position: absolute;
  width: 1rem;
  height: 1rem;
  border-radius: var(--rf-radius-sm);
  border: 2px solid var(--rf-color-border);
}

[data-checked="checked"]::before {
  background: var(--rf-color-success);
  border-color: var(--rf-color-success);
}

[data-checked="active"]::before {
  border-color: var(--rf-color-primary);
  background: var(--rf-color-primary);
}

[data-checked="skipped"] {
  text-decoration: line-through;
  color: var(--rf-color-muted);
}
```

### Sequence

Styles ordered lists with visual indicators.

**Declared on RuneConfig:**

```typescript
Steps: { block: 'steps', sequence: 'connected' }
HowTo: { block: 'howto', sequence: 'numbered' }
```

| Value | Visual treatment |
|-------|-----------------|
| `numbered` | Counter circles to the left of each item |
| `connected` | Vertical line with dots (or horizontal with `data-sequence-direction="horizontal"`) |
| `plain` | No visual indicators |

Optional direction control:

```typescript
Timeline: {
  block: 'timeline',
  sequence: 'connected',
  sequenceDirection: { fromModifier: 'direction', default: 'vertical' },
}
```

### Interactive state

Set by behavior scripts at runtime, not by rune config. The engine doesn't emit these — `@refrakt-md/behaviors` toggles `data-state` on interactive runes.

| Value | Effect |
|-------|--------|
| `open` | Show body/content with expand animation |
| `closed` | Hide body/content |
| `active` | Bottom border + primary color (tabs, toggles) |
| `inactive` | Transparent border + muted color |
| `selected` | Light background overlay + primary outline |
| `disabled` | Faded (0.4 opacity), non-interactive |

```css
[data-state="closed"] > [class*="__body"],
[data-state="closed"] > [class*="__content"] {
  display: none;
}

[data-state="open"] > [class*="__body"],
[data-state="open"] > [class*="__content"] {
  display: block;
  animation: rf-expand 0.2s ease-out;
}
```

### Surface

Surface is theme-only — runes don't declare their surface type. Which runes render as cards, banners, or inline elements is a visual design decision that belongs to the theme.

Lumina groups runes into four surface types:

| Surface | Treatment | Example runes |
|---------|-----------|---------------|
| **Card** | Background, radius, padding | recipe, character, event, api, howto |
| **Inline** | No visual boundary, vertical padding only | hint, details, sidenote, nav, breadcrumb |
| **Banner** | Full-width padding | hero, cta, feature, steps, bento |
| **Inset** | Background, radius, padding | codegroup, mockup, diagram, chart, gallery |

```css
/* Card surface */
.rf-recipe, .rf-character, .rf-event, .rf-api, .rf-howto {
  background: var(--rf-color-surface);
  border-radius: var(--rf-radius-md);
  padding: var(--rune-padding, var(--rf-spacing-md));
}

/* Inline surface */
.rf-hint, .rf-details, .rf-sidenote, .rf-nav {
  padding: var(--rune-padding, var(--rf-spacing-sm)) 0;
}
```

All surfaces consume the `--rune-padding` variable set by the density dimension, so padding automatically scales when density changes.

---

## Dimension interactions

Dimensions compose naturally. Key interactions:

- **Density x Sections** — compact truncates descriptions to 2 lines; minimal hides description, body, and footer
- **Density x Metadata** — compact and minimal can hide a metadata block entirely or collapse a `definition-list` block to a `bar`
- **Density x Media** — compact shrinks portraits; minimal hides all media
- **Density x Sequence** — compact tightens spacing; minimal removes indicators
- **Surface x Density** — surfaces consume `--rune-padding` which density sets
- **Sentiment x Meta type** — sentiment sets `--meta-color` which type rules consume for dot color, border color, etc.

---

## CSS file organization

Dimension CSS lives in a dedicated directory, separate from per-rune CSS:

```
styles/
├── dimensions/
│   ├── metadata.css      # data-meta-type, data-meta-sentiment, data-zone-layout
│   ├── density.css        # data-density
│   ├── sections.css       # data-section
│   ├── state.css          # data-state
│   ├── media.css          # data-media
│   ├── surfaces.css       # Surface type groupings
│   ├── checklist.css      # data-checked
│   └── sequence.css       # data-sequence
└── runes/
    ├── hint.css           # Per-rune overrides (only when needed)
    └── ...
```

Import dimension CSS in your theme's entry point:

```css
/* index.css */
@import './tokens/base.css';
@import './tokens/dark.css';
@import './styles/dimensions/metadata.css';
@import './styles/dimensions/density.css';
@import './styles/dimensions/sections.css';
@import './styles/dimensions/state.css';
@import './styles/dimensions/media.css';
@import './styles/dimensions/surfaces.css';
@import './styles/dimensions/checklist.css';
@import './styles/dimensions/sequence.css';
@import './styles/runes/hint.css';
/* ... per-rune CSS for overrides */
```

The dimension layer handles the generic baseline. Per-rune CSS files only need to cover rune-specific styling that the dimensions don't handle (e.g., Hint's colored left border, Nav's tree layout).

---

## Community package benefits

A plugin author declares dimensions on their rune config and gets themed automatically:

```typescript
// @refrakt-community/wine
WineTasting: {
  block: 'wine-tasting',
  defaultDensity: 'full',
  modifiers: {
    vintage: { source: 'meta' },
    rating: { source: 'meta' },
    varietal: { source: 'meta' },
  },
  metaFields: {
    vintage:  { metaType: 'temporal', label: 'Vintage', tag: 'time' },
    rating:   { metaType: 'quantity', label: 'Rating',
                sentimentMap: { '90+': 'positive', '80-89': 'neutral', '<80': 'caution' } },
    varietal: { metaType: 'tag',      label: 'Varietal' },
  },
  blocks: {
    metadata: { fields: ['vintage', 'rating', 'varietal'], layout: 'definition-list' },
  },
  layout: { root: ['title', 'metadata', 'body'] },
  mediaSlots: { label: 'thumbnail' },
}
```

Without any theme-specific CSS for this rune:
- The vintage renders as bare temporal text (tabular nums) in its `<dd>`
- The rating renders as bare quantity text, tinted by its sentiment color
- The varietal renders as a tag chip (`.rf-badge`)
- Sections get standard layout (header flex-row, title bold, body standard)
- The label image gets thumbnail treatment
- In a grid, density drops to compact automatically

---

## Dark mode

Dimension CSS references design tokens (`--rf-color-success`, `--rf-color-border`, etc.). When dark mode tokens override these values, all dimension styling updates automatically. No dimension-specific dark mode CSS needed.

```css
/* Light mode tokens */
:root {
  --rf-color-success: #10b981;
  --rf-color-danger: #ef4444;
  --rf-color-warning: #f59e0b;
}

/* Dark mode overrides — dimensions adapt automatically */
[data-theme="dark"] {
  --rf-color-success: #34d399;
  --rf-color-danger: #f87171;
  --rf-color-warning: #fbbf24;
}
```
