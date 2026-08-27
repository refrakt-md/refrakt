{% work id="WORK-523" status="done" priority="medium" complexity="complex" source="SPEC-124" tags="engine, transform, refactor" milestone="v0.30.1" pr="refrakt-md/refrakt#584" %}

# Migrate the config-modifier loop and retire seedAxes

Make step 1's generic config-modifier resolution — plus `contextModifiers` (1b) and `staticModifiers` (1c) — facets, and delete `FacetInput.seedAxes` once nothing needs it. This is the last structural migration and the one that removes the migration scaffolding: every `after` reference resolves to a real facet, and the registry's dependency graph becomes complete rather than partly seeded.

## Acceptance Criteria

- [x] `modifiers`, `context-modifiers` and `static-modifiers` are facets; steps 1, 1b and 1c are gone from `transformRune`
- [x] `valueMap` / `mapTarget` / `noBemClass` and the present-but-empty (`renderWhenEmpty`) case all behave unchanged
- [x] `attrModifierNames` — used to strip attribute-source modifiers from pass-through output — is carried by the facet resolution rather than a local
- [x] Every axis previously seeded (`media-position`, `content-place`, `color-scheme`) is supplied by a facet; consumers are unchanged because a facet value already shadows the seed
- [x] `FacetInput.seedAxes`, the `seeded` option on `orderFacets`, and `SEEDED_AXES` are deleted
- [x] `{% ref "SPEC-091" /%}` config variants still resolve before the facet pass, since they rewrite the config the facets read
- [x] Class-string order and `modifierValues` key insertion order are unchanged
- [x] All 630 pre-existing transform tests pass **unmodified**, including `value-mapping`, `variants`, `fields` and `context-modifiers`
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

This is the riskiest single migration in the spec: every rune goes through the modifier loop, and its edge cases (value mapping, mapped targets, suppressed BEM classes, present-but-empty values) are subtle. It is scheduled last for exactly that reason — by this point the interface is settled and the remaining facets are proven against it.

Ordering is the main hazard. The modifier facets must run first so their axes are available to everything else, and their BEM classes must land at the front of the class string. Registration order handles both, but verify against a rune that combines config modifiers, context modifiers, static modifiers, a tint and a background.

Watch for the interaction with variants: `resolveVariantConfig` rewrites `config` from modifier values *before* the rest of the transform reads it, so it must stay ahead of the facet pass rather than becoming a facet itself.

## Blocked by
- {% ref "WORK-519" /%}
- {% ref "WORK-520" /%}
- {% ref "WORK-521" /%}
- {% ref "WORK-522" /%}

## Blocks
- {% ref "WORK-525" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)
- {% ref "SPEC-091" /%} — config variants, resolved ahead of the facet pass
- {% ref "SPEC-082" /%} — the typed field-data channel the modifier loop reads

## Resolution

Completed: 2026-08-27

Branch: `claude/transform-package-refactor-7mxi8a`

### What was done

- `packages/transform/src/facets/modifiers.ts` — `modifiers` (the generic `config.modifiers` loop), `context-modifiers` and `static-modifiers`.
- `packages/transform/src/facets/types.ts` — added `FacetResult.stripAttrs` and `FacetContext.fields`; removed `FacetInput.seedAxes`.
- `packages/transform/src/facets/driver.ts` — removed the `seeded` option and the seed lookup in `ctx.axis()`.
- `packages/transform/src/facets/index.ts` — `modifiers` family registered first; `SEEDED_AXES` deleted.
- `packages/transform/src/facets/{cover,content-place}.ts` — `after` repointed from the seed names to `modifiers`.
- `packages/transform/src/engine.ts` — steps 1, 1b and 1c gone, along with `mappedValues`, `attrModifierNames` and both `seedAxes` blocks. `isCover` now reads the cover facet's state. Down to 1391 lines from 2223 before the facet work began.
- `packages/transform/test/facets/modifiers.test.ts` — 41 tests covering `valueMap` in-place vs `mapTarget`, the BEM class landing on the raw value rather than the mapped one, `noBemClass`, the present-but-empty case, and attribute claiming.

### Notes

**The seeding scaffolding is retired.** `modifiers` registers first, so its axes reach every other facet through `ctx.axis()`. That removes the last two seeded values and the whole mechanism with them — `seedAxes`, the `seeded` option, `SEEDED_AXES`. Every `after` now names a real registered facet, which is what seeding existed to defer: it was introduced in WORK-518 purely so incremental migration would not be all-or-nothing.

**`stripAttrs` was the one new channel.** Author *attribute* names a facet consumed, distinct from `consumes`, which claims `<meta data-field>` children. The config-modifier facet needs it because its attribute names come from the rune's own config.

Four of my own facet tests failed on the first run, all asserting seeding behaviour that had just been deleted — updated, with no pre-existing test touched. One further test of mine was simply wrong: it asserted that an attribute-sourced modifier resolving to nothing returns `null`, when it correctly returns `{ stripAttrs: [name] }`, because the attribute must be stripped regardless of whether the modifier resolved.

### Residue, filed rather than absorbed

The engine still strips a **fixed list** of eight facet-owned attribute names from pass-through output, so adding an axis with a fixed attribute name still means editing `engine.ts`. Generalising it needs a static `Facet.attributes` declaration — `stripAttrs` cannot carry it, since those attributes must be stripped even when the facet resolves to nothing (`width="content"`). Filed as {% ref "WORK-526" /%} and marked with a NOTE at the site, rather than widening the riskiest migration in the milestone.

All 630 pre-existing transform tests pass unmodified, including the value-mapping, variants, fields and context-modifier suites.

{% /work %}
