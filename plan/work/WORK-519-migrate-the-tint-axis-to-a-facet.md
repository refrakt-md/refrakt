{% work id="WORK-519" status="ready" priority="high" complexity="moderate" source="SPEC-122" tags="engine, transform, refactor, tint" milestone="v0.30.0" %}

# Migrate the tint axis to a facet

Move {% ref "SPEC-053" /%} tint resolution — preset lookup, inline token overrides, `lockMode`, dark-mode tokens, the `--tinted` modifier and the `--tint-*` custom properties — out of step 1d of `transformRune` into a `tint` facet. Tint goes before background because bg's scrim polarity checks whether tint already claimed `data-color-scheme`; migrating tint first turns that from a seeded read into a real facet dependency.

## Acceptance Criteria

- [ ] `tint` is a facet owning `TINT_TOKENS`; step 1d is gone from `engine.ts`
- [ ] The facet emits `data-tint`, `data-color-scheme`, `data-tint-dark`, the `--tinted` BEM modifier, and `--tint-*` / `--tint-dark-*` custom properties, all unchanged
- [ ] It claims its meta fields via `consumes`; the `tintMetaProps` set is gone
- [ ] `color-scheme` is published as facet state (or an axis, whichever matches its emission) so the `color-scheme` seed entry can be dropped, and any consumer reads it via `ctx.axis()`
- [ ] Inline token metas continue to override preset values, and `lockMode` continues to resolve mode when the author sets none
- [ ] All 630 pre-existing transform tests pass **unmodified**, including `tint-extends.test.ts` and `scoped-tint-stylesheet.test.ts`
- [ ] Unit tests cover preset resolution, inline override precedence, `lockMode`, and dark-token emission
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

Tint is a large but self-contained block: it reads `tint` / `tint-mode` metas plus six `tint-<token>` and six `tint-dark-<token>` metas, resolves a named definition from `theme.tints`, and merges inline overrides on top. It has one outward coupling — `data-color-scheme` — which both the bg scrim and cover's foreground polarity consult.

Style ordering matters: the `--tint-*` declarations currently land after `config.styles` and before anything facet-supplied. Keep them in that relative position when they move into the resolution's `styles` list, and verify with a rune that sets both a tint and a `config.styles` entry.

## Blocked by
- {% ref "WORK-518" /%}

## Blocks
- {% ref "WORK-520" /%}

## References

- {% ref "SPEC-122" /%} — facet registry (the spec this work item realizes)
- {% ref "SPEC-053" /%} — tint shape alignment and the six-token vocabulary
- {% ref "SPEC-052" /%} — per-page and per-subtree tint cascade

{% /work %}
