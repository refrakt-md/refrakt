{% spec id="SPEC-033" status="accepted" tags="transform, themes, architecture" %}

# Structure Slots and Declarative Flexibility

> Extend the identity transform's `StructureEntry` system with named slots, ordered placement, value mapping, repeated element generation, and element projection — giving theme developers structural creative freedom without resorting to `postTransform`.

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

**Small surface area.** Five targeted additions, not a template language. The goal is to eliminate the 80% of `postTransform` cases that are simple, not to handle arbitrarily complex layouts.

**Stable addresses.** Projection operates on `data-name` attributes — stable identifiers that rune schemas define as part of their output contract. Themes reference these addresses declaratively; they don't need to know about DOM positions, child indices, or internal schema logic.

---

## Architectural Layering: Model vs. Authoring Surface

The five features in this spec define a **declarative structural model** — an intermediate representation (IR) that the identity transform engine consumes. This model is the engine's contract: it's what `mergeThemeConfig` merges, what `refrakt contracts` validates, what `refrakt inspect` renders, and what constrains what themes can structurally express.

```
  Authoring surfaces          Declarative model (IR)           Engine
  ─────────────────          ──────────────────────           ──────
  Config objects ──────┐
                       ├───→  RuneConfig                ───→  identityTransform()
  Template syntax ─────┤      (slots, projection,             (tree manipulation)
  (future)             │       repeat, valueMap, etc.)
                       │
  Visual editor ───────┘
  (future)
```

**The model is the constraint boundary.** Any authoring surface — whether it's raw `RuneConfig` objects, a spatial template language, or a drag-and-drop tool — compiles down to this model. If something can't be expressed as a `RuneConfig`, it's out of bounds for declarative theming regardless of how the author writes it. If it compiles to a valid `RuneConfig`, it's legal.

This separation has three consequences:

1. **Multiple authoring surfaces can coexist.** Rune package authors comfortable with TypeScript may prefer raw config objects. Theme developers who think spatially may prefer a template syntax that compiles to the same config. Both are first-class; neither is canonical.

2. **Tooling targets the model, not the syntax.** `refrakt contracts`, `refrakt inspect --audit`, and CSS coverage tests all operate on the compiled `RuneConfig`. They don't need to understand the authoring surface. A template syntax inherits all existing validation for free.

3. **The engine stays simple.** The identity transform consumes `RuneConfig` objects. It never parses templates, evaluates expressions, or handles syntax. Compilation happens before the engine runs — at build time or in `mergeThemeConfig`.

A template authoring surface is a possible future addition, but this spec intentionally defines only the model layer. The authoring surface is a DX concern that should be designed after real theme development experience reveals whether the TypeScript config override path has friction that warrants a dedicated syntax.

### Authoring Surface: Design Exploration

**SPEC-034** (Theme Structural Template Language) explores a spatial template syntax where theme overrides read as wireframes — `@refs` placed in `[slots]`, compiled to the `RuneConfig` model defined here. The key insight: the template would be a **patch language** for small structural adjustments, not a full config replacement.

SPEC-034 is a **design exploration**, not a committed build. The TypeScript config override path (using `slots` + `projection` from Features 1 and 5) is the supported approach. The template syntax is preserved as a ready-to-build design if theme development experience reveals the need.

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

## Feature 5 — Element Projection

### Problem

Features 1–4 give themes control over *structure entries* — elements the theme injects. But rune schemas also produce named elements via `refs` in `createComponentRenderable()`, and these carry `data-name` attributes that form a stable, addressable surface. Today, a theme that wants to relocate, regroup, or suppress a schema-produced element (e.g., move `data-name="caption"` from inline to a header slot, or hide `data-name="meta"` in a minimal density) must use `postTransform` to manually walk the tree.

The `data-name` and `data-field` attributes already give every meaningful element and data value a stable identity. Projection adds a declarative vocabulary for themes to use those addresses for structural reshaping — the complement to slots (which control where *new* elements go) and structure entries (which control *what* gets injected).

### Interface Changes

```ts
// In RuneConfig (packages/transform/src/types.ts)
interface RuneConfig {
  // ... existing fields
  projection?: {
    relocate?: Record<string, {
      into: string;                          // Target data-name or slot name
      position?: 'prepend' | 'append';       // Where within the target (default: 'append')
    }>;
    group?: Record<string, {
      tag: string;                           // Container element tag
      members: string[];                     // data-name values to collect
      slot?: string;                         // Optional slot assignment for the group
    }>;
    hide?: string[];                         // data-name values to suppress
  };
}
```

### Behavior

Projection runs as a distinct pass after BEM class application and recursion (Phase 6) but before meta tag filtering (Phase 7). At this point, all `data-name` elements are fully formed with BEM classes applied, so projection operates on the final structural shape.

**Execution order within the projection pass:**

1. **Hide** — Remove elements matching `hide` entries from the children array. Hidden elements are discarded entirely (not just visually hidden).
2. **Group** — Collect elements matching each group's `members` list, remove them from their current positions, wrap them in a new container element with `data-name` set to the group key, and place the group at the position of the first collected member (or into a named slot if `slot` is specified).
3. **Relocate** — Find each element by `data-name`, remove it from its current position, and insert it into the target (another `data-name` element or a slot) at the specified position.

This order ensures that groups can be relocation targets (group first, then relocate into the group), and that hidden elements don't interfere with grouping or relocation.

### Example: Gallery Caption Relocation

A gallery rune produces `data-name="caption"` as a child of the root element. A card-style theme wants the caption inside the header:

```ts
// Theme config override via mergeThemeConfig
Gallery: {
  projection: {
    relocate: {
      caption: { into: 'header', position: 'append' },
    },
  },
}
```

Before projection:
```html
<figure class="rf-gallery">
  <div class="rf-gallery__header">...</div>
  <div class="rf-gallery__items">...</div>
  <figcaption class="rf-gallery__caption">Photo series</figcaption>
</figure>
```

After projection:
```html
<figure class="rf-gallery">
  <div class="rf-gallery__header">
    ...
    <figcaption class="rf-gallery__caption">Photo series</figcaption>
  </div>
  <div class="rf-gallery__items">...</div>
</figure>
```

### Example: Grouping Chrome Elements

A hint rune produces `data-name="icon"` and `data-name="badge"` as separate children. A theme wants them grouped into a single chrome container:

```ts
Hint: {
  projection: {
    group: {
      chrome: {
        tag: 'div',
        members: ['icon', 'badge'],
      },
    },
  },
}
```

Output:
```html
<section class="rf-hint">
  <div class="rf-hint__chrome">
    <span class="rf-hint__icon">...</span>
    <span class="rf-hint__badge">warning</span>
  </div>
  <div class="rf-hint__body">...</div>
</section>
```

The group container gets `data-name="chrome"` and receives a BEM element class (`rf-hint__chrome`) through the normal `applyBemClasses` flow (the projection pass re-applies BEM to newly created group wrappers).

### Example: Minimal Density Hiding

A theme suppresses metadata in compact contexts:

```ts
Work: {
  projection: {
    hide: ['meta', 'description'],
  },
}
```

This could be combined with density — a theme override applied only at `compact` density could use `hide` to strip elements that don't fit. (Density-conditional projection is a future extension; for now, `hide` applies unconditionally within the config it's declared in, and density variants would use separate config entries merged via `mergeThemeConfig`.)

### Interaction with Other Features

- **Slots (Feature 1):** Projection `relocate` can target slot names, not just `data-name` values. When `into` matches a declared slot name, the element is placed in that slot at the specified position. This lets themes move schema-produced elements into theme-defined structural zones.
- **Structure entries:** Projection operates on the full children array, which includes both schema-produced and structure-injected elements. Theme-injected structure entries can be relocation targets or group members.
- **`postTransform`:** Projection runs before `postTransform`. A rune that uses both gets declarative reshaping first, then the escape hatch for anything projection can't express.
- **Contracts:** `refrakt contracts` should include projection declarations so themes can validate they reference valid `data-name` values. Invalid references (targeting a `data-name` that doesn't exist in the rune's output) should warn at build time.

### Eliminates postTransform in

- Any community package rune that uses `postTransform` solely to reorder or wrap children by `data-name`

---

## Out of Scope

### Multi-branch conditional structure

The mockup rune's device-specific structure (notch, bezel, traffic lights, address bar) requires deep conditional branching that would need a template language to express declaratively. This is a legitimate use of `postTransform`.

### Data-driven layout switching

The comparison rune's table-vs-cards layout and the preview rune's HTML rendering both involve inspecting children and building computed structure. These are inherently imperative and belong in `postTransform`.

### Multiple content wrappers

While a valid future need (sidebar + main content zones), this is a larger architectural change that interacts with the layout system (SPEC-025's surface/section model). Feature 5's `group` partially addresses simpler cases — grouping existing named elements into a wrapper — but true multi-zone content splitting (where *content children* are distributed across zones) remains out of scope and should be addressed separately if demand emerges.

### Conditional projection

Projection declarations apply unconditionally within the config they're declared in. Density-conditional or modifier-conditional projection (e.g., "only hide `meta` at compact density") would require a condition syntax on projection entries. This is deferred — themes can achieve density-specific projection today by providing separate config overrides merged via `mergeThemeConfig` for different density contexts.

---

## Implementation Order

1. **Value mapping** (Feature 2) — smallest change, eliminates 2 `postTransform` uses, zero risk to existing configs
2. **Configurable density contexts** (Feature 4) — removes hardcoded engine knowledge, enables community packages
3. **Named slots** (Feature 1) — the core structural change, enables the eyebrow scenario and multi-zone metadata
4. **Repeated elements** (Feature 3) — niche but clean, eliminates the testimonial escape hatch
5. **Element projection** (Feature 5) — depends on slots (Feature 1) for `relocate` into slot targets; implements hide → group → relocate pass between Phase 6 and Phase 7 in the engine

---

## Engine Changes Summary

| File | Change | Size |
|------|--------|------|
| `packages/transform/src/types.ts` | Add `slots`, `slot`, `order`, `repeat`, `childDensity`, `projection` to interfaces; add `valueMap`, `mapTarget` to `ModifierConfig` | ~40 lines |
| `packages/transform/src/engine.ts` | Slot-based assembly (replace prepend/append with slot collection); value mapping in modifier resolution; repeat loop in `buildStructureElement`; read `childDensity` from parent config instead of hardcoded sets; projection pass (hide → group → relocate) between Phase 6 and Phase 7 | ~130 lines |
| `packages/transform/src/merge.ts` | Ensure `mergeThemeConfig` merges `slots` arrays, `structure` entries with slot assignments, and `projection` objects (theme projection fully replaces base, not deep-merged — theme owns the structural intent) | ~15 lines |

### Contracts and Tooling

- `refrakt inspect` output should show slot assignments when present
- `refrakt inspect` should visualize projection effects (show before/after tree when projection is active)
- `refrakt contracts` should include slot ordering in structure contracts
- `refrakt contracts` should include projection declarations so themes can validate `data-name` references exist in the rune's output contract; invalid references should produce warnings
- CSS coverage tests need no changes (they test selectors, not DOM order)
- Projection `group` entries that create new `data-name` wrappers generate new BEM selectors that themes must style — `refrakt inspect --audit` should flag these

---

## Validation

Each feature should be validated by:

1. Converting an existing `postTransform` to the declarative equivalent
2. Verifying identical HTML output via `refrakt inspect` before and after
3. Running CSS coverage tests to confirm no regressions
4. Running the full test suite

The eyebrow scenario (Feature 1) should be validated by applying a theme override to the plan/work rune config via `mergeThemeConfig` and confirming the ID badge moves to its own structural group in the output.

Feature 5 (projection) should additionally be validated by:

1. Writing a test that applies `hide` to a named element and confirms it's absent from output
2. Writing a test that applies `group` to collect two `data-name` elements into a wrapper and confirms the wrapper exists with both children, correct BEM class, and `data-name`
3. Writing a test that applies `relocate` to move a schema-produced element into a structure-injected container and confirms the element appears inside the target
4. Confirming that `refrakt inspect` shows projection effects and that `refrakt contracts` warns on invalid `data-name` references

{% /spec %}
