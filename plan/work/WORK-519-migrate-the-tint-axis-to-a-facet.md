{% work id="WORK-519" status="done" priority="high" complexity="moderate" source="SPEC-124" tags="engine, transform, refactor, tint" milestone="v0.30.1" pr="refrakt-md/refrakt#581" %}

# Migrate the tint axis to a facet

Move {% ref "SPEC-053" /%} tint resolution — preset lookup, inline token overrides, `lockMode`, dark-mode tokens, the `--tinted` modifier and the `--tint-*` custom properties — out of step 1d of `transformRune` into a `tint` facet. Tint goes before background because bg's scrim polarity checks whether tint already claimed `data-color-scheme`; migrating tint first turns that from a seeded read into a real facet dependency.

## Acceptance Criteria

- [x] `tint` is a facet owning `TINT_TOKENS`; step 1d is gone from `engine.ts`
- [x] The facet emits `data-tint`, `data-color-scheme`, `data-tint-dark`, the `--tinted` BEM modifier, and `--tint-*` / `--tint-dark-*` custom properties, all unchanged
- [x] It claims its meta fields via `consumes`; the `tintMetaProps` set is gone
- [x] `color-scheme` is published as facet state (or an axis, whichever matches its emission) so the `color-scheme` seed entry can be dropped, and any consumer reads it via `ctx.axis()`
- [x] Inline token metas continue to override preset values, and `lockMode` continues to resolve mode when the author sets none
- [x] All 630 pre-existing transform tests pass **unmodified**, including `tint-extends.test.ts` and `scoped-tint-stylesheet.test.ts`
- [x] Unit tests cover preset resolution, inline override precedence, `lockMode`, and dark-token emission
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

Tint is a large but self-contained block: it reads `tint` / `tint-mode` metas plus six `tint-<token>` and six `tint-dark-<token>` metas, resolves a named definition from `theme.tints`, and merges inline overrides on top. It has one outward coupling — `data-color-scheme` — which both the bg scrim and cover's foreground polarity consult.

Style ordering matters: the `--tint-*` declarations currently land after `config.styles` and before anything facet-supplied. Keep them in that relative position when they move into the resolution's `styles` list, and verify with a rune that sets both a tint and a `config.styles` entry.

## Blocked by
- {% ref "WORK-518" /%}

## Blocks
- {% ref "WORK-520" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)
- {% ref "SPEC-053" /%} — tint shape alignment and the six-token vocabulary
- {% ref "SPEC-052" /%} — per-page and per-subtree tint cascade

## Resolution

Completed: 2026-08-27

Branch: `claude/transform-package-refactor-7mxi8a`

### What was done

- `packages/transform/src/facets/tint.ts` — the SPEC-053 axis, owning `TINT_TOKENS`. Named-definition lookup, inline `tint-<token>` / `tint-dark-<token>` overrides, `lockMode`, the `--tint-*` custom properties, the `--tinted` modifier, and the `data-tint` / `data-color-scheme` / `data-tint-dark` markers.
- `packages/transform/src/facets/cover.ts` — now declares `after: ['tint']` and reads the colour scheme through `ctx.axis()`.
- `packages/transform/src/engine.ts` — step 1d gone, along with `TINT_TOKENS`, the `tintMetaProps` / `tintDataAttrs` / `tintStyleParts` locals and the `color-scheme` seed entry for the resolve pass. Down to 1805 lines from 2223 before the facet work began.
- `packages/transform/test/facets/tint.test.ts` — 19 tests covering preset resolution, inline-override precedence, `lockMode`, dark-token emission, the tinted-marker condition and the state channel.

### Notes

Tint publishes the resolved scheme as facet **state** rather than an emitted axis, since the attribute is set directly and `state` is the channel for cross-facet reads that must not become `data-*`. That retires one seed entry: `cover` reads the scheme from tint instead of from the engine's internal `tintDataAttrs` bag. The background layer keeps its own seeded claim until WORK-520.

Adding `after: ['tint']` to cover immediately failed `cover.test.ts`, whose deliberately-minimal two-facet registry did not include tint — the driver's dangling-dependency guard behaving exactly as designed. Fixed by declaring tint `seeded` in that registry, which is the accurate description of what the test isolates.

**One benign output difference, not byte-identical.** The `--tinted` modifier now follows `--width` / `--spacing` / `--inset` in the class attribute instead of preceding them, because the facet pass runs at a fixed point after those still-inline axes. Class order carries no CSS meaning (no effect on matching or specificity) and no test pinned it — checked before relying on that — but it is an output change and is recorded in the changeset rather than described as byte-identical. It resolves when those axes migrate under WORK-521.

Inline-style declaration order **is** preserved: tint registers first, so its `--tint-*` declarations still lead the style string. That one matters, because CSS duplicate declarations resolve last-wins.

All 630 pre-existing transform tests pass unmodified.

{% /work %}
