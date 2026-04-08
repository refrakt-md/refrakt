{% spec id="SPEC-024" status="accepted" tags="transform, themes, css, metadata" %}

# Metadata System

> Semantic metadata attributes on structure entries for consistent cross-rune badge styling. Extends the existing `StructureEntry` interface with three dimensions — type, sentiment, and rank — so themes can style every metadata badge generically.

---

## Problem

Runes across all packages emit metadata badges — status indicators, categories, durations, tags, quantities. Today these are styled per-rune: the recipe's difficulty badge has its own CSS, the character's role badge has its own CSS, the work item's status badge has its own CSS. They all look slightly different because each theme author styles them independently.

This creates two problems. Theme authors must write CSS for every rune's metadata individually — a theme supporting 30 runes needs dozens of rune-specific badge rules. And the visual language is inconsistent — a "status" concept looks different on a character card than on a work item, even though both are lifecycle states that should feel the same.

---

## Solution

Three semantic dimensions describe any piece of rune metadata. The rune config declares them on structure entry children. The identity transform emits them as data attributes. The theme styles them generically. A theme author writes roughly 18 CSS rules and every metadata badge across every rune in the ecosystem is handled.

### The Three Dimensions

| Dimension     | Attribute             | Question it answers                     | Values                                                    |
|---------------|-----------------------|-----------------------------------------|-----------------------------------------------------------|
| **Type**      | `data-meta-type`      | What kind of information is this?       | `status`, `category`, `quantity`, `temporal`, `tag`, `id` |
| **Sentiment** | `data-meta-sentiment` | Is this positive, negative, or neutral? | `positive`, `negative`, `caution`, `neutral`              |
| **Rank**      | `data-meta-rank`      | How prominent should this be?           | `primary`, `secondary`                                    |

**Type** determines the fundamental visual treatment — pill, chip, inline metric, icon-prefixed value, flat text, monospace. It answers "what shape should this be?"

**Sentiment** determines colour. It answers "what feeling should this convey?" A positive sentiment maps to the theme's success colour. A negative sentiment maps to the danger colour. The theme defines what those colours are. The rune declares which values are positive, negative, or cautionary.

**Rank** determines visual prominence. It answers "how important is this?" Primary metadata is full-size and prominent. Secondary metadata is smaller and muted. The theme defines what those size/opacity levels are.

---

## Extending StructureEntry

Today, metadata badges are emitted via `modifiers` (to read values from meta tags) and `structure` entries (to inject badge elements with `metaText`, `ref`, `condition`). For example, the current recipe config emits badges like this:

```typescript
// Current pattern — runes/learning/src/config.ts
Recipe: {
  block: 'recipe',
  modifiers: {
    prepTime: { source: 'meta' },
    cookTime: { source: 'meta' },
    servings: { source: 'meta' },
    difficulty: { source: 'meta', default: 'medium' },
  },
  structure: {
    meta: {
      tag: 'div', before: true,
      conditionAny: ['prepTime', 'cookTime', 'servings', 'difficulty'],
      children: [
        { tag: 'span', ref: 'meta-item', metaText: 'prepTime', transform: 'duration',
          textPrefix: 'Prep: ', condition: 'prepTime' },
        { tag: 'span', ref: 'meta-item', metaText: 'cookTime', transform: 'duration',
          textPrefix: 'Cook: ', condition: 'cookTime' },
        { tag: 'span', ref: 'meta-item', metaText: 'servings',
          textPrefix: 'Serves: ', condition: 'servings' },
        { tag: 'span', ref: 'badge', metaText: 'difficulty', condition: 'difficulty' },
      ],
    },
  },
}
```

This spec proposes adding three optional fields to the existing `StructureEntry` interface:

```typescript
// Proposed additions to StructureEntry (packages/transform/src/types.ts)
interface StructureEntry {
  // ... all existing fields (tag, ref, metaText, condition, etc.) ...

  /** Semantic metadata type — determines visual shape (pill, chip, metric, etc.) */
  metaType?: 'status' | 'category' | 'quantity' | 'temporal' | 'tag' | 'id';

  /** Metadata visual prominence */
  metaRank?: 'primary' | 'secondary';

  /** Maps specific modifier values to sentiment colours */
  sentimentMap?: Record<string, 'positive' | 'negative' | 'caution' | 'neutral'>;
}
```

The `sentimentMap` maps specific attribute values to sentiments. Not all metadata has sentiment — categories like "protagonist" or temporal values like "30 min" are sentiment-neutral by default.

When `metaType` is present on a structure entry, the identity transform emits `data-meta-type`, `data-meta-rank`, and optionally `data-meta-sentiment` attributes on the generated element. The engine resolves sentiment by looking up the current modifier value in the `sentimentMap`.

---

## Rune Config Examples

The metadata dimensions are declared inline on structure entry children, alongside the existing `metaText`, `ref`, and `condition` fields.

**Recipe:**

```typescript
Recipe: {
  block: 'recipe',
  modifiers: {
    prepTime: { source: 'meta' },
    cookTime: { source: 'meta' },
    servings: { source: 'meta' },
    difficulty: { source: 'meta', default: 'medium' },
    // ... existing layout modifiers
  },
  structure: {
    meta: {
      tag: 'div', before: true,
      conditionAny: ['prepTime', 'cookTime', 'servings', 'difficulty'],
      children: [
        { tag: 'span', ref: 'meta-item', metaText: 'prepTime', transform: 'duration',
          textPrefix: 'Prep: ', condition: 'prepTime',
          metaType: 'temporal', metaRank: 'primary' },
        { tag: 'span', ref: 'meta-item', metaText: 'cookTime', transform: 'duration',
          textPrefix: 'Cook: ', condition: 'cookTime',
          metaType: 'temporal', metaRank: 'primary' },
        { tag: 'span', ref: 'meta-item', metaText: 'servings',
          textPrefix: 'Serves: ', condition: 'servings',
          metaType: 'quantity', metaRank: 'primary' },
        { tag: 'span', ref: 'badge', metaText: 'difficulty', condition: 'difficulty',
          metaType: 'category', metaRank: 'primary',
          sentimentMap: { easy: 'positive', medium: 'neutral', hard: 'caution' } },
      ],
    },
  },
}
```

**Character:**

```typescript
Character: {
  block: 'character',
  contentWrapper: { tag: 'div', ref: 'content' },
  modifiers: {
    role: { source: 'meta', default: 'supporting' },
    status: { source: 'meta', default: 'alive' },
    aliases: { source: 'meta' },
    tags: { source: 'meta' },
  },
  structure: {
    badge: {
      tag: 'div', before: true,
      children: [
        { tag: 'span', ref: 'role-badge', metaText: 'role',
          metaType: 'category', metaRank: 'primary' },
        { tag: 'span', ref: 'status-badge', metaText: 'status', condition: 'status',
          metaType: 'status', metaRank: 'primary',
          sentimentMap: {
            alive: 'positive',
            dead: 'negative',
            unknown: 'neutral',
            missing: 'caution',
          } },
      ],
    },
  },
}
```

**Work Item (plan package):**

```typescript
Work: {
  block: 'work',
  modifiers: {
    id: { source: 'meta' },
    status: { source: 'meta', default: 'draft' },
    priority: { source: 'meta', default: 'medium' },
    complexity: { source: 'meta' },
    milestone: { source: 'meta' },
    tags: { source: 'meta' },
  },
  structure: {
    header: {
      tag: 'div', before: true,
      children: [
        { tag: 'span', ref: 'id-badge', metaText: 'id', condition: 'id',
          metaType: 'id', metaRank: 'primary' },
        { tag: 'span', ref: 'status-badge', metaText: 'status',
          metaType: 'status', metaRank: 'primary',
          sentimentMap: {
            draft: 'neutral',
            ready: 'neutral',
            'in-progress': 'neutral',
            review: 'caution',
            done: 'positive',
            blocked: 'negative',
          } },
        { tag: 'span', ref: 'priority-badge', metaText: 'priority',
          metaType: 'category', metaRank: 'primary',
          sentimentMap: {
            critical: 'negative',
            high: 'caution',
            medium: 'neutral',
            low: 'neutral',
          } },
        { tag: 'span', ref: 'complexity-badge', metaText: 'complexity', condition: 'complexity',
          metaType: 'quantity', metaRank: 'secondary' },
        { tag: 'span', ref: 'milestone-badge', metaText: 'milestone', condition: 'milestone',
          metaType: 'tag', metaRank: 'secondary' },
      ],
    },
  },
}
```

**Decision (plan package):**

```typescript
Decision: {
  block: 'decision',
  modifiers: {
    id: { source: 'meta' },
    status: { source: 'meta', default: 'proposed' },
    date: { source: 'meta' },
    tags: { source: 'meta' },
  },
  structure: {
    header: {
      tag: 'div', before: true,
      children: [
        { tag: 'span', ref: 'id-badge', metaText: 'id', condition: 'id',
          metaType: 'id', metaRank: 'primary' },
        { tag: 'span', ref: 'status-badge', metaText: 'status',
          metaType: 'status', metaRank: 'primary',
          sentimentMap: {
            proposed: 'neutral',
            accepted: 'positive',
            superseded: 'caution',
            deprecated: 'negative',
          } },
        { tag: 'span', ref: 'date-badge', metaText: 'date', condition: 'date',
          metaType: 'temporal', metaRank: 'secondary' },
      ],
    },
  },
}
```

**Bond (storytelling package):**

```typescript
Bond: {
  block: 'bond',
  modifiers: {
    bondType: { source: 'meta' },
    status: { source: 'meta', default: 'active' },
    bidirectional: { source: 'meta', default: 'true' },
  },
  structure: {
    badge: {
      tag: 'div', before: true,
      children: [
        { tag: 'span', ref: 'type-badge', metaText: 'bondType', condition: 'bondType',
          metaType: 'category', metaRank: 'primary',
          sentimentMap: {
            alliance: 'positive',
            rivalry: 'negative',
            mentor: 'positive',
            romance: 'positive',
            distrust: 'caution',
          } },
        { tag: 'span', ref: 'status-badge', metaText: 'status',
          metaType: 'status', metaRank: 'secondary',
          sentimentMap: {
            active: 'positive',
            broken: 'negative',
            dormant: 'neutral',
          } },
      ],
    },
  },
}
```

**HowTo (learning package):**

```typescript
HowTo: {
  block: 'howto',
  contentWrapper: { tag: 'div', ref: 'content' },
  modifiers: {
    estimatedTime: { source: 'meta' },
    difficulty: { source: 'meta', default: 'medium' },
  },
  structure: {
    meta: {
      tag: 'div', before: true,
      conditionAny: ['estimatedTime', 'difficulty'],
      children: [
        { tag: 'span', ref: 'meta-item', metaText: 'estimatedTime', transform: 'duration',
          textPrefix: 'Estimated time: ', condition: 'estimatedTime',
          metaType: 'temporal', metaRank: 'primary' },
        { tag: 'span', ref: 'meta-item', metaText: 'difficulty',
          textPrefix: 'Difficulty: ', condition: 'difficulty',
          metaType: 'category', metaRank: 'primary',
          sentimentMap: { beginner: 'positive', intermediate: 'neutral', advanced: 'caution' } },
      ],
    },
  },
}
```

**API Endpoint (docs package):**

```typescript
Api: {
  block: 'api',
  modifiers: {
    method: { source: 'meta', default: 'GET' },
    auth: { source: 'meta' },
    // ... existing modifiers
  },
  structure: {
    header: {
      tag: 'div', before: true,
      children: [
        { tag: 'span', ref: 'method-badge', metaText: 'method',
          metaType: 'category', metaRank: 'primary',
          sentimentMap: {
            GET: 'positive',
            POST: 'neutral',
            PUT: 'neutral',
            PATCH: 'caution',
            DELETE: 'negative',
          } },
        { tag: 'span', ref: 'auth-badge', metaText: 'auth', condition: 'auth',
          metaType: 'status', metaRank: 'secondary' },
      ],
    },
  },
}
```

---

## Identity Transform

The identity transform reads `metaType`, `metaRank`, and `sentimentMap` from structure entry children and emits data attributes on the generated elements.

### Recipe Output

A recipe with `difficulty="easy"`, `prepTime="30 min"`, `cookTime="1 hr"`, `servings="4"`:

```html
<div class="rf-recipe__meta" data-name="meta">
  <span class="rf-recipe__meta-item"
        data-meta-type="temporal"
        data-meta-rank="primary"
        data-name="meta-item">
    Prep: 30 min
  </span>
  <span class="rf-recipe__meta-item"
        data-meta-type="temporal"
        data-meta-rank="primary"
        data-name="meta-item">
    Cook: 1 hr
  </span>
  <span class="rf-recipe__meta-item"
        data-meta-type="quantity"
        data-meta-rank="primary"
        data-name="meta-item">
    Serves: 4
  </span>
  <span class="rf-recipe__badge"
        data-meta-type="category"
        data-meta-rank="primary"
        data-meta-sentiment="positive"
        data-difficulty="easy"
        data-name="badge">
    easy
  </span>
</div>
```

The `data-meta-sentiment` attribute is only present when the structure entry has a `sentimentMap` and the current modifier value has a mapping. Fields without sentiment maps (like `prepTime`) get no sentiment attribute — the theme treats them as neutral by default.

The existing `data-{modifier-name}` attribute (e.g., `data-difficulty="easy"`) is still emitted by the engine as it does today — the metadata attributes are additive.

### Character Output

```html
<div class="rf-character__badge" data-name="badge">
  <span class="rf-character__role-badge"
        data-meta-type="category"
        data-meta-rank="primary"
        data-role="antagonist"
        data-name="role-badge">
    antagonist
  </span>
  <span class="rf-character__status-badge"
        data-meta-type="status"
        data-meta-rank="primary"
        data-meta-sentiment="positive"
        data-status="alive"
        data-name="status-badge">
    alive
  </span>
</div>
```

### Work Item Output

```html
<div class="rf-work__header" data-name="header">
  <span class="rf-work__id-badge"
        data-meta-type="id"
        data-meta-rank="primary"
        data-id="WORK-142"
        data-name="id-badge">
    WORK-142
  </span>
  <span class="rf-work__status-badge"
        data-meta-type="status"
        data-meta-rank="primary"
        data-meta-sentiment="neutral"
        data-status="in-progress"
        data-name="status-badge">
    in-progress
  </span>
  <span class="rf-work__priority-badge"
        data-meta-type="category"
        data-meta-rank="primary"
        data-meta-sentiment="caution"
        data-priority="high"
        data-name="priority-badge">
    high
  </span>
  <span class="rf-work__complexity-badge"
        data-meta-type="quantity"
        data-meta-rank="secondary"
        data-complexity="moderate"
        data-name="complexity-badge">
    moderate
  </span>
  <span class="rf-work__milestone-badge"
        data-meta-type="tag"
        data-meta-rank="secondary"
        data-milestone="v0.5.0"
        data-name="milestone-badge">
    v0.5.0
  </span>
</div>
```

---

## Theme CSS

A complete metadata system for a theme is roughly 18 rules. These handle every metadata badge across every rune.

### Meta Types

```css
/* === Status: coloured pill with dot indicator === */
[data-meta-type="status"] {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.75rem;
  border-radius: 999px;
  font-size: var(--meta-font-size, 0.8125rem);
  font-weight: 500;
  background: color-mix(in oklch, var(--meta-color, var(--color-text-muted)) 12%, transparent);
  color: var(--meta-color, var(--color-text-muted));
}

[data-meta-type="status"]::before {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--meta-color, var(--color-text-muted));
}

/* === Category: outlined chip === */
[data-meta-type="category"] {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.625rem;
  border: 1px solid var(--meta-color, var(--color-border));
  border-radius: 0.25rem;
  font-size: var(--meta-font-size, 0.8125rem);
  font-weight: 500;
  color: var(--meta-color, var(--color-text));
}

/* === Quantity: bold value === */
[data-meta-type="quantity"] {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: var(--meta-font-size, 0.8125rem);
  color: var(--meta-color, var(--color-text));
}

/* === Temporal: value with time association === */
[data-meta-type="temporal"] {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--meta-font-size, 0.8125rem);
  font-variant-numeric: tabular-nums;
  color: var(--meta-color, var(--color-text-muted));
}

/* === Tag: flat muted label === */
[data-meta-type="tag"] {
  font-size: calc(var(--meta-font-size, 0.8125rem) * 0.9);
  color: var(--color-text-muted);
}

/* === ID: monospace identifier === */
[data-meta-type="id"] {
  font-family: var(--font-mono, monospace);
  font-size: var(--meta-font-size, 0.8125rem);
  font-weight: 500;
  color: var(--color-text-muted);
}
```

### Sentiment

```css
/* === Sentiment → colour mapping === */
[data-meta-sentiment="positive"] { --meta-color: var(--color-success, #10b981); }
[data-meta-sentiment="negative"] { --meta-color: var(--color-danger, #ef4444); }
[data-meta-sentiment="caution"]  { --meta-color: var(--color-warning, #f59e0b); }
[data-meta-sentiment="neutral"]  { --meta-color: var(--color-text-muted); }
```

The `--meta-color` custom property cascades into the type styles above. A status pill with `data-meta-sentiment="positive"` gets a green dot and green-tinted background because `--meta-color` resolves to `--color-success`, which the type CSS uses for the dot, the background tint, and the text colour.

### Rank

```css
/* === Rank → prominence === */
[data-meta-rank="primary"] {
  --meta-font-size: 0.8125rem;
}

[data-meta-rank="secondary"] {
  --meta-font-size: 0.75rem;
  opacity: 0.8;
}
```

The `--meta-font-size` custom property is consumed by the type styles. Secondary metadata is slightly smaller and slightly faded regardless of type.

### Combined Example

A work item's "High" priority badge has:

- `data-meta-type="category"` → outlined chip shape
- `data-meta-sentiment="caution"` → `--meta-color` set to warning colour
- `data-meta-rank="primary"` → full size

The chip gets a warning-coloured border and text, at primary size. No rune-specific CSS needed — the three dimensions compose through the `--meta-color` and `--meta-font-size` custom properties.

---

## Dark Mode

Sentiment colours adapt to the colour scheme through the theme's colour token definitions:

```css
:root {
  --color-success: #10b981;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-success: #34d399;
    --color-danger: #f87171;
    --color-warning: #fbbf24;
  }
}
```

The sentiment rules reference these tokens. When the colour scheme changes, all sentiment colours update automatically. No metadata-specific dark mode CSS needed.

Inside a tinted section with `data-color-scheme="dark"`, the theme's dark colour tokens apply to the metadata badges within that section. The tint and metadata systems compose naturally through the CSS cascade.

---

## Inspector Audit

The inspector gains a new `--audit-meta` flag to verify metadata configuration:

```bash
$ refrakt inspect --audit-meta

  Meta types in use:
  status     8 runes    (character, work, bug, decision, bond, ...)
  category   12 runes   (character, recipe, work, bond, api, howto, ...)
  quantity   5 runes    (recipe, work, stat, ...)
  temporal   6 runes    (recipe, event, decision, track, howto, ...)
  tag        7 runes    (recipe, work, decision, ...)
  id         3 runes    (work, bug, decision)

  Sentiment coverage:
  status fields:    8/8 have sentiment maps  ✓
  category fields:  9/12 have sentiment maps
    ⚠ character.role — no sentiment map (neutral by default)
    ⚠ event.location — no sentiment map
    ⚠ track.artist — no sentiment map

  Theme coverage:
  [data-meta-type="status"]     ✓ styled
  [data-meta-type="category"]   ✓ styled
  [data-meta-type="quantity"]   ✓ styled
  [data-meta-type="temporal"]   ✓ styled
  [data-meta-type="tag"]        ✓ styled
  [data-meta-type="id"]         ✓ styled
  [data-meta-sentiment]         ✓ all 4 sentiments styled
  [data-meta-rank]              ✓ both ranks styled
```

The audit checks that the theme provides CSS for all meta types and sentiments in use. Missing rules are flagged — if a rune uses `metaType: 'temporal'` but the theme has no `[data-meta-type="temporal"]` rule, the inspector warns.

---

## Community Package Benefits

A community package author declares metadata dimensions on their rune's structure entries and gets themed metadata badges for free:

```typescript
// @refrakt-community/wine
WineTasting: {
  block: 'wine-tasting',
  modifiers: {
    vintage: { source: 'meta' },
    region: { source: 'meta' },
    rating: { source: 'meta' },
    varietal: { source: 'meta' },
    price: { source: 'meta' },
  },
  structure: {
    meta: {
      tag: 'div', before: true,
      conditionAny: ['vintage', 'region', 'rating', 'varietal', 'price'],
      children: [
        { tag: 'span', ref: 'meta-item', metaText: 'vintage', condition: 'vintage',
          metaType: 'temporal', metaRank: 'primary' },
        { tag: 'span', ref: 'meta-item', metaText: 'region', condition: 'region',
          metaType: 'category', metaRank: 'primary' },
        { tag: 'span', ref: 'badge', metaText: 'rating', condition: 'rating',
          metaType: 'quantity', metaRank: 'primary',
          sentimentMap: { '90+': 'positive', '80-89': 'neutral', '<80': 'caution' } },
        { tag: 'span', ref: 'meta-item', metaText: 'varietal', condition: 'varietal',
          metaType: 'tag', metaRank: 'secondary' },
        { tag: 'span', ref: 'meta-item', metaText: 'price', condition: 'price',
          metaType: 'quantity', metaRank: 'secondary' },
      ],
    },
  },
}
```

The wine tasting rune's vintage renders as a temporal marker. Its region renders as a category chip. Its rating renders as a quantity with sentiment-based colour. No theme CSS needed for this specific rune — the existing meta type, sentiment, and rank rules handle it.

This means community runes look consistent with core runes and official package runes from day one. The visual language is shared across the entire ecosystem.

---

## Metadata Without Sentiment

Not every metadata field needs a sentiment map. Fields where no value is inherently better or worse than another — character role, event location, track artist, recipe servings — simply omit the `sentimentMap`. The identity transform emits no `data-meta-sentiment` attribute. The theme defaults to neutral styling:

```css
/* When no sentiment is declared, meta-color falls through to the default */
[data-meta-type="category"]:not([data-meta-sentiment]) {
  --meta-color: var(--color-text);
  border-color: var(--color-border);
}
```

This is the common case. Sentiment is the exception — it applies to statuses, difficulties, severities, trends, and other fields where values carry inherent valence. Most categorical and temporal fields are sentiment-neutral.

---

## Rune Metadata Map

The table below maps every rune field that appears as a metadata badge (emitted via `structure` entries with `metaText` or `ref` containing badge/meta-item semantics) to proposed `metaType`, `metaRank`, and `sentimentMap` values.

| Package | Rune | Field | metaType | metaRank | sentimentMap |
|---------|------|-------|----------|----------|--------------|
| **core** | Budget | currency | `category` | `primary` | — |
| **core** | Budget | travelers | `quantity` | `primary` | — |
| **core** | Budget | duration | `temporal` | `secondary` | — |
| **docs** | Api | method | `category` | `primary` | `GET: positive, POST: neutral, PUT: neutral, PATCH: caution, DELETE: negative` |
| **docs** | Api | path | `id` | `primary` | — |
| **docs** | Api | auth | `status` | `secondary` | — |
| **docs** | Symbol | kind | `category` | `primary` | — |
| **docs** | Symbol | lang | `category` | `secondary` | — |
| **docs** | Symbol | since | `temporal` | `secondary` | — |
| **docs** | Symbol | deprecated | `status` | `primary` | `(any truthy value): negative` |
| **learning** | HowTo | estimatedTime | `temporal` | `primary` | — |
| **learning** | HowTo | difficulty | `category` | `primary` | `beginner: positive, intermediate: neutral, advanced: caution` |
| **learning** | Recipe | prepTime | `temporal` | `primary` | — |
| **learning** | Recipe | cookTime | `temporal` | `primary` | — |
| **learning** | Recipe | servings | `quantity` | `primary` | — |
| **learning** | Recipe | difficulty | `category` | `primary` | `easy: positive, medium: neutral, hard: caution` |
| **storytelling** | Character | role | `category` | `primary` | — |
| **storytelling** | Character | status | `status` | `primary` | `alive: positive, dead: negative, unknown: neutral, missing: caution` |
| **storytelling** | Realm | realmType | `category` | `primary` | — |
| **storytelling** | Realm | scale | `category` | `secondary` | — |
| **storytelling** | Lore | category | `category` | `primary` | — |
| **storytelling** | Faction | factionType | `category` | `primary` | — |
| **storytelling** | Faction | alignment | `category` | `primary` | `good: positive, neutral: neutral, evil: negative, chaotic: caution, lawful: neutral` |
| **storytelling** | Faction | size | `quantity` | `secondary` | — |
| **storytelling** | Plot | plotType | `category` | `primary` | — |
| **storytelling** | Plot | structure | `category` | `secondary` | — |
| **storytelling** | Bond | bondType | `category` | `primary` | `alliance: positive, rivalry: negative, mentor: positive, romance: positive, distrust: caution` |
| **storytelling** | Bond | status | `status` | `secondary` | `active: positive, broken: negative, dormant: neutral` |
| **media** | Playlist | type | `category` | `primary` | — |
| **places** | Event | date | `temporal` | `primary` | — |
| **places** | Event | endDate | `temporal` | `secondary` | — |
| **places** | Event | location | `category` | `primary` | — |
| **plan** | Spec | id | `id` | `primary` | — |
| **plan** | Spec | status | `status` | `primary` | `draft: neutral, review: caution, accepted: positive, superseded: caution, deprecated: negative` |
| **plan** | Spec | version | `tag` | `secondary` | — |
| **plan** | Spec | supersedes | `id` | `secondary` | — |
| **plan** | Work | id | `id` | `primary` | — |
| **plan** | Work | status | `status` | `primary` | `draft: neutral, ready: neutral, in-progress: neutral, review: caution, done: positive, blocked: negative` |
| **plan** | Work | priority | `category` | `primary` | `critical: negative, high: caution, medium: neutral, low: neutral` |
| **plan** | Work | complexity | `quantity` | `secondary` | — |
| **plan** | Work | assignee | `tag` | `secondary` | — |
| **plan** | Work | milestone | `tag` | `secondary` | — |
| **plan** | Bug | id | `id` | `primary` | — |
| **plan** | Bug | status | `status` | `primary` | `reported: neutral, confirmed: caution, in-progress: neutral, fixed: positive, wontfix: neutral, duplicate: neutral` |
| **plan** | Bug | severity | `category` | `primary` | `critical: negative, major: caution, minor: neutral, trivial: neutral` |
| **plan** | Bug | assignee | `tag` | `secondary` | — |
| **plan** | Bug | milestone | `tag` | `secondary` | — |
| **plan** | Decision | id | `id` | `primary` | — |
| **plan** | Decision | status | `status` | `primary` | `proposed: neutral, accepted: positive, superseded: caution, deprecated: negative` |
| **plan** | Decision | date | `temporal` | `secondary` | — |
| **plan** | Decision | supersedes | `id` | `secondary` | — |
| **plan** | Milestone | name | `id` | `primary` | — |
| **plan** | Milestone | status | `status` | `primary` | `planning: neutral, active: positive, complete: positive` |
| **plan** | Milestone | target | `temporal` | `secondary` | — |

### Edge Cases and Notes

**Bond and Beat runes** (storytelling) declare modifiers with semantic meaning (`bondType`, `status`, `id`, `track`) but currently lack `structure` entries in their config — they render via other mechanisms. When migrating, structure entries with badge children would need to be added alongside the metadata annotations.

**Symbol.deprecated** is a boolean-like field (presence indicates deprecation). The sentimentMap would need a convention for boolean fields — mapping any truthy value (e.g., a version string like `"v2.0"`) to `negative`. This is unlike enum fields where each value maps individually.

**Event.location** is free-text (city names, venue names) with no inherent valence, so it receives `category` type with no sentimentMap. The same applies to Realm.scale, Faction.size, and similar open-ended fields.

**Faction.alignment** values are proposed here as `good/neutral/evil/chaotic/lawful` based on typical RPG conventions, but the actual valid values depend on what authors write. The sentimentMap should cover the most common values; unrecognized values default to no sentiment (neutral styling).

**Assignee and milestone fields** across plan runes are typed as `tag` rather than `category` because they are cross-referencing labels (linking to people or release targets) rather than classifying the item.

---

## Migration

Existing rune configs that use `structure` entries without `metaType` continue to work. The identity transform emits metadata elements without the `data-meta-*` attributes. Existing per-rune CSS styles them as before.

Migration is per-rune, per-structure-entry:

1. Add `metaType`, `metaRank`, and optionally `sentimentMap` to each badge's structure entry child
1. Verify the identity transform emits the correct data attributes via `refrakt inspect`
1. The theme's generic meta CSS takes over — per-rune metadata CSS can be removed

Runes can be migrated incrementally. A partially migrated project has some runes using the metadata system and others using per-rune CSS. Both coexist because the metadata data attributes are additive — they don't change the BEM classes or `data-name` attributes that existing CSS targets.

{% /spec %}
