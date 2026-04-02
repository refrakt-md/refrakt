{% spec id="SPEC-033" status="draft" tags="transform, themes, architecture" %}

# Structure Slots and Declarative Flexibility

> Extend the identity transform's `StructureEntry` system with named slots, ordered placement, value mapping, and repeated element generation — giving theme developers structural creative freedom without resorting to `postTransform`.

---

## Problem

The identity transform's structure system offers only binary placement: `before: true` (prepend) or append. Theme developers who want to rearrange structural elements — moving an ID badge from a header row to an eyebrow above the title, splitting metadata into distinct visual zones, or reordering sections — cannot do so declaratively. They must either abuse CSS positioning to fake structural changes, or fall back to `postTransform` (which defeats the purpose of a declarative config).

An audit of all `postTransform` usage across community packages reveals that **5 of 9 cases** exist because the declarative system lacks small, well-scoped features. The remaining 4 are genuinely complex (data-driven layout branching, HTML rendering) and are appropriate escape-hatch uses.

### Motivating Scenarios

**Eyebrow placement.** Plan runes display their ID (e.g., `WORK-011`) as a badge inside a header alongside status and priority badges. A theme wanting the ID as a small eyebrow text above the title — a common card design pattern — has no way to place it in a separate structural group from the other badges.

**Multi-zone metadata.** A rune with both "chrome" metadata (ID, status) and "contextual" metadata (duration, difficulty) may want them in visually distinct zones — one as a top bar, one as a sidebar or footer. Today everything with `before: true` merges into one prepend group.

**Star ratings.** The testimonial rune uses `postTransform` solely to generate N star elements from a numeric rating value. No declarative repetition mechanism exists.

**Value mapping.** Two storytelling runes (beat, comparison-row) use `postTransform` solely to map modifier values to data attribute values (e.g., `status: "complete"` → `data-checked: "checked"`). A one-liner in config should handle this.

---

## Design Principles

**Declarative over imperative.** Every feature targets a pattern that currently forces `postTransform`. If it can't eliminate at least one real escape-hatch usage, it doesn't belong here.

**Additive.** Existing configs continue to work unchanged. `before: true` remains valid and maps to a default slot. No migration required.

**Theme-layer control.** Slots are structural positions that the theme defines via `mergeThemeConfig`. A rune package declares *what* structure entries exist; the theme decides *where* they go.

**Small surface area.** Four targeted additions, not a template language. The goal is to eliminate the 80% of `postTransform` cases that are simple, not to handle arbitrarily complex layouts.

---

## Feature 1 — Named Slots with Ordering

### Interface Changes

```ts
// In RuneConfig (packages/transform/src/types.ts)
interface RuneConfig {
  // ... existing fields
  slots?: string[];  // Ordered slot names, e.g. ['eyebrow', 'header', 'content', 'footer']
}

// In StructureEntry
interface StructureEntry {
  // ... existing fields
  slot?: string;   // Which slot this entry occupies (default: first before-slot or last after-slot)
  order?: number;  // Ordering within a slot (default: 0, lower numbers first)
  // `before` is retained for backward compat but deprecated in favor of `slot`
}
```

### Slot Resolution

Slots define ordered insertion points in the output. The engine assembles children by iterating slots in declared order, collecting structure entries assigned to each slot, sorting by `order` within each slot, then placing content children at the `'content'` slot (or after all `before` slots if no explicit `'content'` slot is declared).

```
slots: ['eyebrow', 'header', 'content', 'footer']

Output assembly:
  1. eyebrow slot entries (sorted by order)
  2. header slot entries (sorted by order)
  3. content children (wrapped by contentWrapper if configured)
  4. footer slot entries (sorted by order)
```

### Backward Compatibility

When `slots` is not declared, the engine uses the current behavior: `before: true` entries prepend, others append. When `slots` is declared, `before: true` maps to the first non-content slot and `before: false` maps to the last non-content slot. Explicit `slot` assignments take precedence.

### Example: Plan Rune Eyebrow

Current config (all badges in one header):

```ts
structure: {
  header: {
    tag: 'div', before: true,
    children: [
      { tag: 'span', ref: 'id-badge', metaText: 'id', ... },
      { tag: 'span', ref: 'status-badge', metaText: 'status', ... },
      { tag: 'span', ref: 'priority-badge', metaText: 'priority', ... },
    ],
  },
},
```

Theme override via `mergeThemeConfig` adding slots and reassigning the ID:

```ts
// Theme config override
Work: {
  slots: ['eyebrow', 'header', 'content'],
  structure: {
    eyebrow: {
      tag: 'div', slot: 'eyebrow',
      children: [
        { tag: 'span', ref: 'id-badge', metaText: 'id', metaType: 'id' },
      ],
    },
    header: {
      tag: 'div', slot: 'header',
      children: [
        { tag: 'span', ref: 'status-badge', metaText: 'status', ... },
        { tag: 'span', ref: 'priority-badge', metaText: 'priority', ... },
      ],
    },
  },
}
```

Resulting HTML:

```html
<article class="rf-work">
  <div class="rf-work__eyebrow">
    <span class="rf-work__id-badge">WORK-011</span>
  </div>
  <div class="rf-work__header">
    <span class="rf-work__status-badge" data-meta-sentiment="caution">in-progress</span>
    <span class="rf-work__priority-badge">high</span>
  </div>
  <div class="rf-work__content">
    ...
  </div>
</article>
```

---

## Feature 2 — Value Mapping

### Interface Changes

```ts
// In StructureEntry or in RuneConfig modifiers
interface ModifierConfig {
  // ... existing fields
  valueMap?: Record<string, string>;  // Maps modifier values to output values
  mapTarget?: string;                 // Which data attribute receives the mapped value (default: same modifier)
}
```

### Behavior

When a modifier has a `valueMap`, the engine maps the raw value through the map before emitting the target data attribute. Unmapped values pass through unchanged. This lets rune configs translate domain-specific values into universal theming dimension values.

### Example: Beat Status → Checked State

Current `postTransform` (storytelling/beat):

```ts
postTransform(node) {
  const status = node.attributes['data-status'];
  const map = { complete: 'checked', active: 'active', planned: 'unchecked', abandoned: 'skipped' };
  node.attributes['data-checked'] = map[status] ?? 'unchecked';
}
```

Declarative replacement:

```ts
modifiers: {
  status: {
    source: 'meta',
    default: 'planned',
    valueMap: {
      complete: 'checked',
      active: 'active',
      planned: 'unchecked',
      abandoned: 'skipped',
    },
    mapTarget: 'data-checked',
  },
}
```

### Eliminates postTransform in

- `runes/storytelling/src/config.ts` — Beat rune
- `runes/marketing/src/config.ts` — ComparisonRow rune

---

## Feature 3 — Repeated Elements

### Interface Changes

```ts
// In StructureEntry
interface StructureEntry {
  // ... existing fields
  repeat?: {
    count: string;      // Modifier name that provides the numeric count
    max?: number;       // Cap to prevent runaway generation (default: 10)
    filled?: string;    // Modifier name for how many are "filled" (optional)
    element: StructureEntry;        // Template for each generated element
    filledElement?: StructureEntry; // Template for filled elements (optional)
  };
}
```

### Behavior

When `repeat` is present on a structure entry, the engine generates `count` copies of `element` as children. If `filled` is specified, the first N elements (where N is the filled value) use `filledElement` (or get a `data-filled="true"` attribute), and the rest use `element`.

### Example: Star Rating

Current `postTransform` (marketing/testimonial):

```ts
postTransform(node) {
  const rating = parseInt(node.attributes['data-rating'] ?? '0');
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(makeTag('span', {
      'data-name': 'star',
      'data-filled': i < rating ? 'true' : 'false',
    }));
  }
  // inject stars container...
}
```

Declarative replacement:

```ts
structure: {
  stars: {
    tag: 'div', slot: 'header',
    repeat: {
      count: 'ratingTotal',   // modifier with value "5"
      filled: 'rating',       // modifier with value "3"
      element: { tag: 'span', ref: 'star' },
    },
  },
},
modifiers: {
  rating: { source: 'meta', noBemClass: true },
  ratingTotal: { source: 'meta', noBemClass: true, default: '5' },
},
```

Output:

```html
<div class="rf-testimonial__stars">
  <span class="rf-testimonial__star" data-filled="true"></span>
  <span class="rf-testimonial__star" data-filled="true"></span>
  <span class="rf-testimonial__star" data-filled="true"></span>
  <span class="rf-testimonial__star" data-filled="false"></span>
  <span class="rf-testimonial__star" data-filled="false"></span>
</div>
```

### Eliminates postTransform in

- `runes/marketing/src/config.ts` — Testimonial rune

---

## Feature 4 — Configurable Density Contexts

### Problem

The engine hardcodes two sets of parent rune names that trigger density changes on children:

```ts
const COMPACT_CONTEXTS = new Set(['grid', 'bento', 'gallery', 'showcase', 'split']);
const MINIMAL_CONTEXTS = new Set(['backlog', 'decision-log']);
```

Community packages cannot declare that their runes should trigger density changes without modifying the engine source.

### Interface Changes

```ts
// In RuneConfig
interface RuneConfig {
  // ... existing fields
  childDensity?: 'compact' | 'minimal';  // Density imposed on child runes
}
```

### Behavior

When a rune with `childDensity` is the parent context during identity transform, the engine applies `data-density="{value}"` to child runes, exactly as it does today for the hardcoded sets. The hardcoded sets are replaced by reading `childDensity` from the parent's config.

### Migration

The existing hardcoded sets map directly to config entries:

```ts
// Current core config additions
Grid:      { childDensity: 'compact' },
Bento:     { childDensity: 'compact' },
Gallery:   { childDensity: 'compact' },
Showcase:  { childDensity: 'compact' },
Split:     { childDensity: 'compact' },
Backlog:   { childDensity: 'minimal' },
DecisionLog: { childDensity: 'minimal' },
```

Community packages can then declare their own:

```ts
// In a community package's RunePackage.theme.runes
Dashboard: { childDensity: 'compact' },
```

---

## Out of Scope

### Multi-branch conditional structure

The mockup rune's device-specific structure (notch, bezel, traffic lights, address bar) requires deep conditional branching that would need a template language to express declaratively. This is a legitimate use of `postTransform`.

### Data-driven layout switching

The comparison rune's table-vs-cards layout and the preview rune's HTML rendering both involve inspecting children and building computed structure. These are inherently imperative and belong in `postTransform`.

### Multiple content wrappers

While a valid future need (sidebar + main content zones), this is a larger architectural change that interacts with the layout system (SPEC-025's surface/section model). It should be addressed as a separate spec if demand emerges.

---

## Implementation Order

1. **Value mapping** (Feature 2) — smallest change, eliminates 2 `postTransform` uses, zero risk to existing configs
2. **Configurable density contexts** (Feature 4) — removes hardcoded engine knowledge, enables community packages
3. **Named slots** (Feature 1) — the core structural change, enables the eyebrow scenario and multi-zone metadata
4. **Repeated elements** (Feature 3) — niche but clean, eliminates the testimonial escape hatch

---

## Engine Changes Summary

| File | Change | Size |
|------|--------|------|
| `packages/transform/src/types.ts` | Add `slots`, `slot`, `order`, `repeat`, `childDensity` to interfaces; add `valueMap`, `mapTarget` to `ModifierConfig` | ~25 lines |
| `packages/transform/src/engine.ts` | Slot-based assembly (replace prepend/append with slot collection); value mapping in modifier resolution; repeat loop in `buildStructureElement`; read `childDensity` from parent config instead of hardcoded sets | ~80 lines |
| `packages/transform/src/merge.ts` | Ensure `mergeThemeConfig` merges `slots` arrays and `structure` entries with slot assignments | ~10 lines |

### Contracts and Tooling

- `refrakt inspect` output should show slot assignments when present
- `refrakt contracts` should include slot ordering in structure contracts
- CSS coverage tests need no changes (they test selectors, not DOM order)

---

## Validation

Each feature should be validated by:

1. Converting an existing `postTransform` to the declarative equivalent
2. Verifying identical HTML output via `refrakt inspect` before and after
3. Running CSS coverage tests to confirm no regressions
4. Running the full test suite

The eyebrow scenario (Feature 1) should be validated by applying a theme override to the plan/work rune config via `mergeThemeConfig` and confirming the ID badge moves to its own structural group in the output.

{% /spec %}
