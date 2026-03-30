---
title: Universal Theming Dimensions
description: Ten semantic data attributes that enable generic cross-rune styling — metadata badges, density, sections, media, state, and more
---

# Universal Theming Dimensions

Traditional theme development requires per-rune CSS for every rune in the ecosystem. A recipe's difficulty badge, a character's status badge, and a work item's priority badge all need separate styles — even though they're conceptually the same thing.

Universal theming dimensions solve this. Ten semantic data attributes describe **what** something is, not **how** it should look. The identity transform emits these attributes automatically from the rune config. A theme writes ~54 generic CSS rules targeting these attributes, and every rune — core, community, or custom — is styled.

## Overview

| Dimension | Attribute | Values | Controls | Declared by |
|-----------|-----------|--------|----------|-------------|
| **Meta type** | `data-meta-type` | `status`, `category`, `quantity`, `temporal`, `tag`, `id` | Badge visual shape | `StructureEntry.metaType` |
| **Sentiment** | `data-meta-sentiment` | `positive`, `negative`, `caution`, `neutral` | Badge color | `StructureEntry.sentimentMap` |
| **Rank** | `data-meta-rank` | `primary`, `secondary` | Badge prominence | `StructureEntry.metaRank` |
| **Density** | `data-density` | `full`, `compact`, `minimal` | Spacing and detail level | `RuneConfig.defaultDensity` + context |
| **Section** | `data-section` | `header`, `preamble`, `title`, `description`, `body`, `footer`, `media` | Structural anatomy | `RuneConfig.sections` |
| **Media** | `data-media` | `portrait`, `cover`, `thumbnail`, `hero`, `icon` | Image treatment | `RuneConfig.mediaSlots` |
| **Checklist** | `data-checked` | `checked`, `unchecked`, `active`, `skipped` | Checkbox list items | `RuneConfig.checklist` |
| **Sequence** | `data-sequence` | `numbered`, `connected`, `plain` | Ordered item indicators | `RuneConfig.sequence` |
| **State** | `data-state` | `open`, `closed`, `active`, `inactive`, `selected`, `disabled` | Interactive states | Behavior scripts |
| **Surface** | (class-based) | `card`, `inline`, `banner`, `inset` | Container treatment | Theme only |

The first three (meta type, sentiment, rank) style metadata badges. The remaining seven style the rune's structure, content, and behavior.

---

## Metadata dimensions

Metadata badges — status indicators, categories, durations, tags — appear across dozens of runes. The metadata system provides three dimensions so themes can style every badge generically.

### Declaring metadata on structure entries

Metadata dimensions are declared inline on `StructureEntry` children, alongside existing fields like `metaText` and `condition`:

```typescript
Recipe: {
  block: 'recipe',
  modifiers: {
    difficulty: { source: 'meta', default: 'medium' },
    prepTime: { source: 'meta' },
    servings: { source: 'meta' },
  },
  structure: {
    meta: {
      tag: 'div', before: true,
      conditionAny: ['prepTime', 'servings', 'difficulty'],
      children: [
        { tag: 'span', ref: 'meta-item', metaText: 'prepTime',
          transform: 'duration', label: 'Prep:', condition: 'prepTime',
          metaType: 'temporal', metaRank: 'primary' },
        { tag: 'span', ref: 'meta-item', metaText: 'servings',
          label: 'Serves:', condition: 'servings',
          metaType: 'quantity', metaRank: 'primary' },
        { tag: 'span', ref: 'badge', metaText: 'difficulty',
          condition: 'difficulty',
          metaType: 'category', metaRank: 'primary',
          sentimentMap: { easy: 'positive', medium: 'neutral', hard: 'caution' } },
      ],
    },
  },
}
```

### StructureEntry fields

| Field | Type | Description |
|-------|------|-------------|
| `metaType` | `'status' \| 'category' \| 'quantity' \| 'temporal' \| 'tag' \| 'id'` | Determines visual shape (pill, chip, monospace, etc.). Emits `data-meta-type` |
| `metaRank` | `'primary' \| 'secondary'` | Controls prominence — size and opacity. Emits `data-meta-rank` |
| `sentimentMap` | `Record<string, 'positive' \| 'negative' \| 'caution' \| 'neutral'>` | Maps specific modifier values to sentiment colors. Emits `data-meta-sentiment` when matched |

### How the engine emits them

When a structure entry has `metaType`, the engine adds data attributes to the generated element:

```html
<!-- A recipe badge with difficulty="easy" -->
<span class="rf-recipe__badge"
      data-meta-type="category"
      data-meta-rank="primary"
      data-meta-sentiment="positive"
      data-difficulty="easy"
      data-name="badge">
  easy
</span>
```

The existing `data-{modifier}` attribute (e.g., `data-difficulty`) is still emitted as before — metadata attributes are additive.

When no `sentimentMap` is provided, or the current value has no mapping, `data-meta-sentiment` is omitted. The theme defaults to neutral styling.

### Meta type CSS

Each type gets a distinct visual treatment. All six share a common pill shape in Lumina but differ in font treatment:

```css
/* Status: bordered pill */
[data-meta-type="status"] {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5em 1.0em;
  border: 1px solid var(--rf-color-border);
  border-radius: 999px;
  font-size: var(--meta-font-size, 0.8125rem);
  font-weight: 500;
}

/* Quantity: tabular numbers for alignment */
[data-meta-type="quantity"] {
  /* ...same pill base... */
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

/* ID: monospace for identifiers */
[data-meta-type="id"] {
  /* ...same pill base... */
  font-family: var(--rf-font-mono, monospace);
}
```

A different theme could make types look completely different — status as a dot indicator, category as an outlined chip, quantity as a bold number. The attribute tells you **what** it is; your CSS decides **how** it looks.

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

### Rank CSS

Rank controls size and opacity through a `--meta-font-size` custom property:

```css
[data-meta-rank="primary"] {
  --meta-font-size: 0.8125rem;
}

[data-meta-rank="secondary"] {
  --meta-font-size: 0.75rem;
  opacity: 0.8;
}
```

The type rules consume `--meta-font-size`. Secondary metadata is slightly smaller and faded regardless of type.

### Labels

Structure entries can include a `label` field that emits a separate `<span data-meta-label>` element:

```typescript
{ tag: 'span', ref: 'meta-item', metaText: 'prepTime',
  label: 'Prep:', metaType: 'temporal', metaRank: 'primary' }
```

Set `labelHidden: true` to make the label visually hidden but accessible to screen readers — useful when the value is self-explanatory (like an ID badge where "WORK-042" doesn't need a "ID:" prefix).

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
- **Density x Metadata** — compact and minimal hide secondary-rank metadata
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
│   ├── metadata.css      # data-meta-type, data-meta-sentiment, data-meta-rank
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

A community package author declares dimensions on their rune config and gets themed automatically:

```typescript
// @refrakt-community/wine
WineTasting: {
  block: 'wine-tasting',
  defaultDensity: 'full',
  sections: { header: 'header', title: 'title', notes: 'body', footer: 'footer' },
  mediaSlots: { label: 'thumbnail' },
  structure: {
    header: {
      tag: 'div', before: true,
      children: [
        { tag: 'span', ref: 'vintage', metaText: 'vintage',
          metaType: 'temporal', metaRank: 'primary' },
        { tag: 'span', ref: 'rating', metaText: 'rating',
          metaType: 'quantity', metaRank: 'primary',
          sentimentMap: { '90+': 'positive', '80-89': 'neutral', '<80': 'caution' } },
        { tag: 'span', ref: 'varietal', metaText: 'varietal',
          metaType: 'tag', metaRank: 'secondary' },
      ],
    },
  },
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
