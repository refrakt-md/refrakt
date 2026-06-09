{% spec id="SPEC-091" status="draft" tags="engine,runes,config,architecture,dx" %}

# Engine config variants: modifier-keyed config deltas

The rune transform was deliberately reduced to **flat, semantic output** — it decides
what each Markdown primitive *means* (a paragraph before a heading → `eyebrow`, an
unordered list → `ingredients`), and nothing else. **Structure** is the engine's job
(the SPEC-081 declarative `layout` assembly from flat slots); **style** is CSS's. But
some runes need their *structure* to vary by a modifier:

- `feature` tiles its definitions as a grid when media is stacked, as a list when media is beside.
- `card` / `recipe` in `media-position="cover"` need a different grouping — `media + header` as an overlay band with the body flowing below — than their normal columns.

Today that variation has nowhere legitimate to live. The **transform** is now forbidden
from conditional structure by the flat-transform decision (yet `feature`'s grid/stack
branch still wrongly lives there). **CSS** can reorder and position but cannot
*restructure* — it can't lift the header out of the `content` wrapper into a media-overlay
band. So the flat-transform decision **creates** a gap. This spec fills it with **engine
config variants**: modifier-keyed config deltas merged over the base config per instance —
the same `mergeThemeConfig` mechanism a theme already uses to restructure a rune, now
gated on a modifier *within* a theme.

## Overview

Structure is the engine's job; a **variant** lets a rune's *static* structure differ by a
modifier without control-flow in the transform or contortion in CSS. The layout primitive
stays static — a variant only selects **which** static config applies.

Modelled on CVA / Tailwind-variants, but with one simplification that falls out of
refrakt's design: **the variant axis is an existing modifier**, so selection rides the
modifier system — no predicate DSL, and no separate `defaultVariants` (the modifier's own
`default` already provides the active value).

## Design

### 1. Shape

```ts
// on RuneConfig
variants?: Record<string /* modifier (axis) */, Record<string /* value */, Partial<RuneConfig>>>;
```

The outer key is a **declared modifier name** (the axis); the inner key is a modifier
**value**; the payload is a **partial `RuneConfig`** merged over base. Recipe's cover
variant:

```ts
variants: {
  'media-position': {
    cover: {
      layout: {
        root: ['cover-band', 'body'],
        'cover-band': { tag: 'div', children: ['media', 'preamble'] },
        body:         { tag: 'div', children: ['metadata', 'ingredients', 'steps', 'tips'] },
      },
    },
  },
},
```

### 2. Selection rides the modifier system

Per instance, the engine already resolves each modifier's value (with `default`
fallback). For each variant axis it looks up `variants[axis][value]`; if present, the
delta is merged. So:

- **No separate condition language** — the modifier *is* the selector.
- **No `defaultVariants`** — the modifier's `default` already determines the active value (CVA needs it because its props have no inherent default; refrakt modifiers do).
- **Validation:** a `variants` key with no matching `modifiers` entry is a **config error** — every axis must be a declared modifier.

### 3. Merge and resolution

- Effective config = base, then each matching axis delta in `variants` **declaration order**, reusing `mergeThemeConfig`'s by-key semantics: a delta's `layout.root` *replaces* the array; new wrapper keys (`cover-band`, `body`) are added; base keys the variant no longer references (`content`) simply go unused.
- Resolution is **per-instance and happens before layout assembly**; the assembler itself is unchanged. The static layout primitive is untouched — variants only choose the config fed to it.

### 4. What a delta may override

A delta may override the **assembly/decoration** fields — `layout`, `structure`,
`styles`, `contentWrapper`, `staticModifiers`, `autoLabel`, `editHints` — but **not
identity** fields (`block`, the `modifiers` axis definitions, `sections` keys). A variant
restructures/redecorates a rune; it cannot redefine it. (Exact allow-list to be settled in
implementation.)

### 5. `compoundVariants` — deferred

Cross-axis deltas (e.g. `media-position="cover"` *and* `density="compact"`) are left as a
documented future extension; the shape is reserved but **not** built — nothing needs it
yet:

```ts
// future, not implemented
compoundVariants?: Array<Record<string, string> & { config: Partial<RuneConfig> }>;
```

### 6. Themes extend variants

Variants are part of `RuneConfig`, so `mergeThemeConfig` already merges them — a theme can
add or override a rune's variants, consistent with "themes restructure via config." A
theme could, for example, give its `card` a `media-position="cover"` variant the base
theme doesn't ship.

## Implications

- **Structure contracts become per-variant.** A rune now has N structures (one per active variant). `refrakt contracts` / `structures.json` and the CSS-coverage tests must enumerate variants.
- **`refrakt inspect` selects a variant by the modifier value.** `inspect` already takes attributes, so `refrakt inspect recipe --media-position=cover` naturally renders the cover variant — no new flag needed.
- **Reclaims a wart.** `feature`'s grid-vs-stack conditional (currently in its *transform*) migrates to a `feature` `media-position` variant, removing a flat-transform violation — independent justification for the primitive.

## Acceptance Criteria

- [ ] `RuneConfig.variants?: Record<modifier, Record<value, Partial<RuneConfig>>>` exists; each outer key must be a **declared modifier**, validated at config load (error otherwise).
- [ ] Selection rides the modifier system: per instance the engine resolves modifier values (with `default` fallback) and merges `variants[axis][value]` deltas over base **before** assembly; there is no separate condition language and no `defaultVariants`.
- [ ] Merge reuses `mergeThemeConfig` by-key semantics (delta `layout.root` replaces; new wrapper keys add) applied in `variants` declaration order; the layout assembler is unchanged.
- [ ] A delta may override assembly/decoration fields (`layout`/`structure`/`styles`/`contentWrapper`/`staticModifiers`/`autoLabel`/`editHints`) but not identity fields (`block`/modifier axes/`sections` keys).
- [ ] `compoundVariants` is documented as a reserved future extension, not implemented.
- [ ] Themes can add/override a rune's variants via `mergeThemeConfig`.
- [ ] `refrakt contracts` / `structures.json` enumerate per-variant structures and CSS-coverage covers them; `refrakt inspect` renders a variant by passing the selecting modifier value.
- [ ] `feature`'s grid/stack conditional is migrated from its transform to a `media-position` variant; `recipe`/`card` cover ({% ref "SPEC-089" /%}) is a variant consumer.

## Work breakdown (provisional)

1. **Type + validation** — `variants` on `RuneConfig`; axis-must-be-a-declared-modifier validation.
2. **Per-instance resolution + merge** — resolve modifier values, merge matching deltas over base (`mergeThemeConfig`) ahead of assembly.
3. **Tooling** — per-variant structure contracts + coverage; `inspect` variant selection via modifier attributes.
4. **Migrate consumers** — `feature` grid/stack → variant; wire `recipe`/`card` cover variants (with {% ref "SPEC-089" /%}).
5. **Docs** — theme-authoring "variants" section.

## References

- Flat transform + declarative layout assembly: {% ref "SPEC-081" /%}.
- First consumer (cover): {% ref "SPEC-089" /%}.
- Merge mechanism: `mergeThemeConfig` in `packages/transform/src/merge.ts`; `LayoutEntry`/`RuneConfig` in `packages/transform/src/types.ts`.
- Existing transform-side conditional to reclaim: `plugins/marketing/src/tags/feature.ts` (grid vs stack).
- Prior art: class-variance-authority / Tailwind-variants (`variants` / `defaultVariants` / `compoundVariants`).

{% /spec %}
