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
| **Zone layout** | `data-zone-layout` | `split`, `chip-row`, `definition-list` | Geometric shape of a meta zone (chip pill, two-slot row, dt/dd grid) | Theme picks via `zoneLayouts` (SPEC-079) |
| **Density** | `data-density` | `full`, `compact`, `minimal` | Spacing and detail level | `RuneConfig.defaultDensity` + context |
| **Section** | `data-section` | `header`, `preamble`, `title`, `description`, `body`, `footer`, `media` | Structural anatomy | `RuneConfig.sections` |
| **Media** | `data-media` | `portrait`, `cover`, `thumbnail`, `hero`, `icon` | Image treatment | `RuneConfig.mediaSlots` |
| **Checklist** | `data-checked` | `checked`, `unchecked`, `active`, `skipped` | Checkbox list items | `RuneConfig.checklist` |
| **Sequence** | `data-sequence` | `numbered`, `connected`, `plain` | Ordered item indicators | `RuneConfig.sequence` |
| **State** | `data-state` | `open`, `closed`, `active`, `inactive`, `selected`, `disabled` | Interactive states | Behavior scripts |
| **Surface** | (class-based) | `card`, `inline`, `banner`, `inset` | Container treatment | Theme only |

The first three style metadata content. **Meta type** and **sentiment** describe the field itself; **zone layout** describes the geometric shape around groups of fields. The remaining dimensions style the rune's structure, content, and behavior.

> **Type-vs-layout split (SPEC-079).** `data-meta-type` is *typography only* — it controls monospace for `id`, tabular nums for `quantity` / `temporal`, and nothing else. The geometric shape (chip pill, plain text, def-list cell) comes from `data-zone-layout` and the universal `.rf-badge` class. The same field can appear as primary-color plain text in an eyebrow and as a sentiment-tinted chip inside a `<dd>` without any per-field config change.

---

## Metadata dimensions

Metadata badges — status indicators, categories, durations, tags — appear across dozens of runes. The metadata system provides three dimensions so themes can style every badge generically.

### Declaring metadata — `metaFields` (SPEC-079, preferred)

New runes declare their meta-bearing fields via the `metaFields` manifest on `RuneConfig`. Each entry is pure data — no rendering hints — and the layout primitive chosen per zone owns the geometry. See [Header zones + layout primitives](/extend/theme-authoring/header-zones) for the full model.

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
  zones: {
    metadata: { fields: ['prepTime', 'servings', 'difficulty'] },
    tags:     { fields: ['tags'] },
  },
  contentSlots: { title: 'title', body: 'body' },
  order: ['eyebrow', 'title', 'blurb', 'metadata', 'tags', 'body'],
  zoneLayouts: { tags: 'chip-row' },
}
```

### MetaField fields

| Field | Type | Description |
|-------|------|-------------|
| `metaType` | `'status' \| 'category' \| 'quantity' \| 'temporal' \| 'tag' \| 'id'` | Typography hint. Emits `data-meta-type` |
| `sentimentMap` | `Record<string, 'positive' \| 'negative' \| 'caution' \| 'neutral'>` | Maps the field's resolved value to a sentiment. Emits `data-meta-sentiment` when matched. Presence also triggers chip rendering in layouts that switch on it (split right-slot, def-list `<dd>`) |
| `label` | `string` | Human-readable label. Rendered as `<dt>` (def-list) or inline `<span data-meta-label>` (chip-row); ignored by `split` |
| `condition` | `string` | Field renders only when the named modifier has a truthy value |
| `tag` | `string` | Element tag override. Default `span`; use `time` for temporal fields so the engine emits `<time datetime="…">…</time>` |
| `splitOn` | `string` | Treat the value as a delimited collection — split on this character, render one chip per item. Used for `tags`-style fields |

### Legacy `StructureEntry` fields

Runes that haven't migrated to `metaFields` declare metadata inline on `StructureEntry` children (legacy path). The engine continues to render these through the existing slot-based assembly with the universal `.rf-badge` class applied automatically.

| Field | Type | Description |
|-------|------|-------------|
| `metaType` | `'status' \| 'category' \| 'quantity' \| 'temporal' \| 'tag' \| 'id'` | Same semantics as `MetaField.metaType` |
| `sentimentMap` | `Record<string, 'positive' \| 'negative' \| 'caution' \| 'neutral'>` | Same semantics as `MetaField.sentimentMap` |

### How the engine emits them

When a SPEC-079 zone resolves to a chip (sentiment-mapped field in `split` / `definition-list`, or every field in `chip-row`), the engine emits `class="rf-badge"` plus the meta attributes:

```html
<!-- A recipe badge for difficulty="easy" -->
<span class="rf-badge"
      data-meta-type="category"
      data-meta-sentiment="positive">easy</span>
```

For plain-text values (non-sentiment fields in def-list cells, eyebrow left slot), the chip class is omitted and only typography hints carry through:

```html
<!-- A complexity value in a def-list <dd> -->
<dd data-meta-type="quantity">moderate</dd>
```

When no `sentimentMap` is provided, or the current value has no mapping, `data-meta-sentiment` is omitted and the value renders neutrally.

### Meta type CSS

Each type gets typography only — monospace for `id`, tabular-nums for `quantity` / `temporal`, nothing else for the rest. Geometry (chip pill, definition list grid, eyebrow row) lives on `[data-zone-layout]` selectors.

```css
[data-meta-type="id"] {
  font-family: var(--rf-font-mono, monospace);
}

[data-meta-type="quantity"],
[data-meta-type="temporal"] {
  font-variant-numeric: tabular-nums;
}
```

The chip primitive (universal `.rf-badge`) supplies the pill shape, sentiment-tinted background, and compact padding. Layout selectors supply the surrounding arrangement (split row, chip-row wrap, def-list grid).

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

The three layout primitives carry their own geometry:

```css
/* Eyebrow's two-slot row */
[data-zone-layout="split"] {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

/* Wrapping row of chips */
[data-zone-layout="chip-row"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
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

See [Header zones + layout primitives](/extend/theme-authoring/header-zones) for the complete DOM contract each primitive emits.

### Labels

`MetaField` (or legacy `StructureEntry`) entries can include a `label` field. In `definition-list` it becomes the `<dt>`; in `chip-row` it becomes an inline `<span data-meta-label>` inside the chip; in `split` it's ignored (eyebrow slots are unlabelled by contract).

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
- **Density x Metadata** — compact and minimal can hide the metadata zone entirely or collapse it to chip-row
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
  zones: {
    metadata: { fields: ['vintage', 'rating', 'varietal'] },
  },
  contentSlots: { title: 'title', body: 'body' },
  mediaSlots: { label: 'thumbnail' },
}
```

Without any theme-specific CSS for this rune:
- The vintage renders as a temporal pill
- The rating renders as a quantity pill with sentiment color
- The varietal renders as a secondary tag (smaller, faded)
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
