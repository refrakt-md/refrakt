{% work id="WORK-518" status="in-progress" priority="high" complexity="moderate" source="SPEC-124" tags="engine, transform, architecture, refactor" milestone="v0.31.0" %}

# Migrate the cover/scrim coupling — two-phase facets and seeded dependencies

Test the facet interface against the engine's hardest cross-axis dependency: {% ref "SPEC-089" /%} cover mode, whose `isCover` branch has seven call sites spanning ~600 lines of `transformRune`. Migrating `cover` and `content-place` is the real trial of whether declared `after` ordering can replace ordering-by-statement-adjacency — and it is expected to *correct* the interface from {% ref "WORK-517" /%}, not merely consume it.

## Acceptance Criteria

- [ ] `cover` and `content-place` are facets; the inline `content-place` block, the cover foreground block, and the cover scrim-consume block are gone from `engine.ts`
- [ ] `FacetResult.state` carries cross-facet values that are never emitted, so cover mode does not leak a `data-cover` attribute
- [ ] `FacetResult.styles` is an ordered `[prop, value]` pair list, preserving the duplicate `--cover-scrim-dir` declaration that CSS last-wins depends on
- [ ] `Facet.postAssemble` runs against assembled children; cover's foreground-polarity flip on the `content` overlay happens there
- [ ] `FacetInput.seedAxes` + `orderFacets(facets, { seeded })` let a facet declare `after` on an axis still resolved inline; seeded values are readable but never emitted, and a facet-supplied value shadows the seed it replaces
- [ ] `cover` declares `after: ['media-position', 'content-place']`, encoding the explicit-direction-overrides-derived-direction rule the code previously stated only in a comment
- [ ] All 630 pre-existing transform tests pass **unmodified**, including `cover.test.ts`
- [ ] New unit tests cover the state channel, duplicate style declarations, both phases, seeding, and seed shadowing
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

The cover axis splits across three points in `transformRune`: the scrim-reroute decision during bg resolution, the scrim-meta consume, and — 500 lines later — the cover foreground and data attributes. The last of these mutates the assembled `content` overlay, which is why `resolve` alone cannot express the axis.

Leave the ~200-line bg block inline; it is {% ref "WORK-520" /%}'s job. `bg` continues to read `isCover` locally, which stays correct because the facet's state is derived from the same seeded `media-position`.

Two incidental findings surfaced while reading this code; record but do not fix them here.

- The cover block guards on `!bgDataAttrs['data-color-scheme']`, but the only assignment to that key requires `!isCover` — inside cover mode the condition can never be false. Preserve the behaviour exactly (seed from both bags) rather than acting on the analysis.
- `findByName` and `findDeepByDataName` in `engine.ts` are the same recursive lookup written twice, 1200 lines apart. Consolidate the one the facet needs into `helpers.findNodeByDataName` rather than adding a third copy; the other remains.

## Blocked by
- {% ref "WORK-517" /%}

## Blocks
- {% ref "WORK-519" /%}
- {% ref "WORK-521" /%}
- {% ref "WORK-522" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)
- {% ref "SPEC-089" /%} — cover layout, `content-place`, and the scrim reroute
- {% ref "SPEC-088" /%} — the scrim vocabulary this axis reroutes

{% /work %}
