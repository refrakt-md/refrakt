# Metadata System — Specification

> **Status:** Design proposal
> **Scope:** Semantic metadata attributes for consistent cross-rune styling
> **Package:** Core (identity transform and base CSS)
> **Related:** Layout Specification, Tint Rune Specification, Theme-Extensible Presets Specification

-----

## Problem

Runes across all packages emit metadata badges — status indicators, categories, durations, tags, quantities. Today these are styled per-rune: the recipe’s difficulty badge has its own CSS, the character’s role badge has its own CSS, the work item’s status badge has its own CSS. They all look slightly different because each theme author styles them independently.

This creates two problems. Theme authors must write CSS for every rune’s metadata individually — a theme supporting 30 runes needs dozens of rune-specific badge rules. And the visual language is inconsistent — a “status” concept looks different on a character card than on a work item, even though both are lifecycle states that should feel the same.

-----

## Solution

Three semantic dimensions describe any piece of rune metadata. The rune config declares them. The identity transform emits them as data attributes. The theme styles them generically. A theme author writes roughly 18 CSS rules and every metadata badge across every rune in the ecosystem is handled.

### The Three Dimensions

|Dimension    |Attribute            |Question it answers                    |Values                                                   |
|-------------|---------------------|---------------------------------------|---------------------------------------------------------|
|**Type**     |`data-meta-type`     |What kind of information is this?      |`status`, `category`, `quantity`, `temporal`, `tag`, `id`|
|**Sentiment**|`data-meta-sentiment`|Is this positive, negative, or neutral?|`positive`, `negative`, `caution`, `neutral`             |
|**Rank**     |`data-meta-rank`     |How prominent should this be?          |`primary`, `secondary`                                   |

**Type** determines the fundamental visual treatment — pill, chip, inline metric, icon-prefixed value, flat text, monospace. It answers “what shape should this be?”

**Sentiment** determines colour. It answers “what feeling should this convey?” A positive sentiment maps to the theme’s success colour. A negative sentiment maps to the danger colour. The theme defines what those colours are. The rune declares which values are positive, negative, or cautionary.

**Rank** determines visual prominence. It answers “how important is this?” Primary metadata is full-size and prominent. Secondary metadata is smaller and muted. The theme defines what those size/opacity levels are.

-----

## Rune Config Declaration

Each metadata ref in the rune config declares its type, rank, and optionally a sentiment map:

```typescript
interface MetaRefConfig {
  metaType: 'status' | 'category' | 'quantity' | 'temporal' | 'tag' | 'id';
  metaRank: 'primary' | 'secondary';
  sentimentMap?: Record<string, 'positive' | 'negative' | 'caution' | 'neutral'>;
}
```

The `sentimentMap` maps specific attribute values to sentiments. Not all metadata has sentiment — categories like “protagonist” or temporal values like “30 min” are sentiment-neutral by default.

### Examples

**Recipe:**

```typescript
Recipe: {
  block: 'recipe',
  refs: {
    prepTime: { metaType: 'temporal', metaRank: 'primary' },
    cookTime: { metaType: 'temporal', metaRank: 'primary' },
    difficulty: {
      metaType: 'category',
      metaRank: 'primary',
      sentimentMap: { easy: 'positive', medium: 'neutral', hard: 'caution' },
    },
    servings: { metaType: 'quantity', metaRank: 'primary' },
    tags: { metaType: 'tag', metaRank: 'secondary' },
  },
}
```

**Character:**

```typescript
Character: {
  block: 'character',
  refs: {
    role: { metaType: 'category', metaRank: 'primary' },
    status: {
      metaType: 'status',
      metaRank: 'primary',
      sentimentMap: {
        alive: 'positive',
        dead: 'negative',
        unknown: 'neutral',
        missing: 'caution',
      },
    },
  },
}
```

**Work Item:**

```typescript
Work: {
  block: 'work',
  refs: {
    id: { metaType: 'id', metaRank: 'primary' },
    status: {
      metaType: 'status',
      metaRank: 'primary',
      sentimentMap: {
        draft: 'neutral',
        ready: 'neutral',
        'in-progress': 'neutral',
        review: 'caution',
        done: 'positive',
        blocked: 'negative',
      },
    },
    priority: {
      metaType: 'category',
      metaRank: 'primary',
      sentimentMap: {
        critical: 'negative',
        high: 'caution',
        medium: 'neutral',
        low: 'neutral',
      },
    },
    complexity: { metaType: 'quantity', metaRank: 'secondary' },
    milestone: { metaType: 'tag', metaRank: 'secondary' },
    tags: { metaType: 'tag', metaRank: 'secondary' },
  },
}
```

**Decision:**

```typescript
Decision: {
  block: 'decision',
  refs: {
    id: { metaType: 'id', metaRank: 'primary' },
    status: {
      metaType: 'status',
      metaRank: 'primary',
      sentimentMap: {
        proposed: 'neutral',
        accepted: 'positive',
        superseded: 'caution',
        deprecated: 'negative',
      },
    },
    date: { metaType: 'temporal', metaRank: 'secondary' },
    tags: { metaType: 'tag', metaRank: 'secondary' },
  },
}
```

**Event:**

```typescript
Event: {
  block: 'event',
  refs: {
    date: { metaType: 'temporal', metaRank: 'primary' },
    location: { metaType: 'category', metaRank: 'primary' },
    register: { metaType: 'tag', metaRank: 'secondary' },
  },
}
```

**Bond:**

```typescript
Bond: {
  block: 'bond',
  refs: {
    bondType: {
      metaType: 'category',
      metaRank: 'primary',
      sentimentMap: {
        alliance: 'positive',
        rivalry: 'negative',
        mentor: 'positive',
        romance: 'positive',
        distrust: 'caution',
      },
    },
    status: {
      metaType: 'status',
      metaRank: 'secondary',
      sentimentMap: {
        active: 'positive',
        broken: 'negative',
        dormant: 'neutral',
      },
    },
  },
}
```

**HowTo:**

```typescript
HowTo: {
  block: 'howto',
  refs: {
    time: { metaType: 'temporal', metaRank: 'primary' },
    difficulty: {
      metaType: 'category',
      metaRank: 'primary',
      sentimentMap: { beginner: 'positive', intermediate: 'neutral', advanced: 'caution' },
    },
  },
}
```

**API Endpoint:**

```typescript
Api: {
  block: 'api',
  refs: {
    method: {
      metaType: 'category',
      metaRank: 'primary',
      sentimentMap: {
        GET: 'positive',
        POST: 'neutral',
        PUT: 'neutral',
        PATCH: 'caution',
        DELETE: 'negative',
      },
    },
    auth: { metaType: 'status', metaRank: 'secondary' },
  },
}
```

**Track:**

```typescript
Track: {
  block: 'track',
  refs: {
    artist: { metaType: 'category', metaRank: 'primary' },
    duration: { metaType: 'temporal', metaRank: 'secondary' },
    date: { metaType: 'temporal', metaRank: 'secondary' },
  },
}
```

**Stat:**

```typescript
Stat: {
  block: 'stat',
  refs: {
    value: { metaType: 'quantity', metaRank: 'primary' },
    label: { metaType: 'tag', metaRank: 'primary' },
    trend: {
      metaType: 'category',
      metaRank: 'secondary',
      sentimentMap: { up: 'positive', down: 'negative', flat: 'neutral' },
    },
    change: { metaType: 'quantity', metaRank: 'secondary' },
  },
}
```

-----

## Identity Transform

The identity transform reads the meta config and emits data attributes on each metadata element.

### Input

A recipe with `difficulty="easy"`, `prepTime="30 min"`, `cookTime="1 hr"`, `servings="4"`:

### Output

```html
<div class="rune-recipe__header">
  <span class="rune-recipe__prep-time"
        data-meta-type="temporal"
        data-meta-rank="primary">
    30 min
  </span>
  <span class="rune-recipe__cook-time"
        data-meta-type="temporal"
        data-meta-rank="primary">
    1 hr
  </span>
  <span class="rune-recipe__difficulty"
        data-meta-type="category"
        data-meta-rank="primary"
        data-meta-sentiment="positive"
        data-value="easy">
    Easy
  </span>
  <span class="rune-recipe__servings"
        data-meta-type="quantity"
        data-meta-rank="primary"
        data-value="4">
    4 servings
  </span>
</div>
```

The `data-meta-sentiment` attribute is only present when the ref config has a `sentimentMap` and the current value has a mapping. Fields without sentiment maps (like `prepTime`) get no sentiment attribute — the theme treats them as neutral by default.

The `data-value` attribute carries the raw value for conditional styling. It’s present on all metadata elements.

### Character Example

```html
<div class="rune-character__badges">
  <span class="rune-character__role"
        data-meta-type="category"
        data-meta-rank="primary"
        data-value="antagonist">
    Antagonist
  </span>
  <span class="rune-character__status"
        data-meta-type="status"
        data-meta-rank="primary"
        data-meta-sentiment="positive"
        data-value="alive">
    Alive
  </span>
</div>
```

### Work Item Example

```html
<div class="rune-work__header">
  <span class="rune-work__id"
        data-meta-type="id"
        data-meta-rank="primary"
        data-value="RF-142">
    RF-142
  </span>
  <span class="rune-work__status"
        data-meta-type="status"
        data-meta-rank="primary"
        data-meta-sentiment="neutral"
        data-value="in-progress">
    In Progress
  </span>
  <span class="rune-work__priority"
        data-meta-type="category"
        data-meta-rank="primary"
        data-meta-sentiment="caution"
        data-value="high">
    High
  </span>
  <span class="rune-work__complexity"
        data-meta-type="quantity"
        data-meta-rank="secondary"
        data-value="moderate">
    ●●●○
  </span>
  <span class="rune-work__milestone"
        data-meta-type="tag"
        data-meta-rank="secondary"
        data-value="v0.5.0">
    v0.5.0
  </span>
</div>
```

-----

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

A work item’s “High” priority badge has:

- `data-meta-type="category"` → outlined chip shape
- `data-meta-sentiment="caution"` → `--meta-color` set to warning colour
- `data-meta-rank="primary"` → full size

The chip gets a warning-coloured border and text, at primary size. No rune-specific CSS needed — the three dimensions compose through the `--meta-color` and `--meta-font-size` custom properties.

-----

## Dark Mode

Sentiment colours adapt to the colour scheme through the theme’s colour token definitions:

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

Inside a tinted section with `data-color-scheme="dark"`, the theme’s dark colour tokens apply to the metadata badges within that section. The tint and metadata systems compose naturally through the CSS cascade.

-----

## Inspector Audit

The inspector verifies metadata configuration:

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

-----

## Community Package Benefits

A community package author declares metadata dimensions on their rune’s refs and gets themed metadata badges for free:

```typescript
// @refrakt-community/wine
WineTasting: {
  block: 'wine-tasting',
  refs: {
    vintage: { metaType: 'temporal', metaRank: 'primary' },
    region: { metaType: 'category', metaRank: 'primary' },
    rating: {
      metaType: 'quantity',
      metaRank: 'primary',
      sentimentMap: { '90+': 'positive', '80-89': 'neutral', '<80': 'caution' },
    },
    varietal: { metaType: 'tag', metaRank: 'secondary' },
    price: { metaType: 'quantity', metaRank: 'secondary' },
  },
}
```

The wine tasting rune’s vintage renders as a temporal marker. Its region renders as a category chip. Its rating renders as a quantity with sentiment-based colour. No theme CSS needed for this specific rune — the existing meta type, sentiment, and rank rules handle it.

This means community runes look consistent with core runes and official package runes from day one. The visual language is shared across the entire ecosystem.

-----

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

-----

## Migration

Existing rune configs that declare refs without meta dimensions continue to work. The identity transform emits metadata elements without the `data-meta-*` attributes. Existing per-rune CSS styles them as before.

Migration is per-rune:

1. Add `metaType`, `metaRank`, and optionally `sentimentMap` to each metadata ref in the rune config
1. Verify the identity transform emits the correct data attributes
1. The theme’s generic meta CSS takes over — per-rune metadata CSS can be removed

Runes can be migrated incrementally. A partially migrated project has some runes using the metadata system and others using per-rune CSS. Both coexist because the metadata data attributes are additive — they don’t change the BEM classes that existing CSS targets.