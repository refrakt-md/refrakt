{% work id="WORK-518" status="done" priority="high" complexity="moderate" source="SPEC-124" tags="engine, transform, architecture, refactor" milestone="v0.30.1" pr="refrakt-md/refrakt#579" %}

# Migrate the cover/scrim coupling — two-phase facets and seeded dependencies

Test the facet interface against the engine's hardest cross-axis dependency: {% ref "SPEC-089" /%} cover mode, whose `isCover` branch has seven call sites spanning ~600 lines of `transformRune`. Migrating `cover` and `content-place` is the real trial of whether declared `after` ordering can replace ordering-by-statement-adjacency — and it is expected to *correct* the interface from {% ref "WORK-517" /%}, not merely consume it.

## Acceptance Criteria

- [x] `cover` and `content-place` are facets; the inline `content-place` block, the cover foreground block, and the cover scrim-consume block are gone from `engine.ts`
- [x] `FacetResult.state` carries cross-facet values that are never emitted, so cover mode does not leak a `data-cover` attribute
- [x] `FacetResult.styles` is an ordered `[prop, value]` pair list, preserving the duplicate `--cover-scrim-dir` declaration that CSS last-wins depends on
- [x] `Facet.postAssemble` runs against assembled children; cover's foreground-polarity flip on the `content` overlay happens there
- [x] `FacetInput.seedAxes` + `orderFacets(facets, { seeded })` let a facet declare `after` on an axis still resolved inline; seeded values are readable but never emitted, and a facet-supplied value shadows the seed it replaces
- [x] `cover` declares `after: ['media-position', 'content-place']`, encoding the explicit-direction-overrides-derived-direction rule the code previously stated only in a comment
- [x] All 630 pre-existing transform tests pass **unmodified**, including `cover.test.ts`
- [x] New unit tests cover the state channel, duplicate style declarations, both phases, seeding, and seed shadowing
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

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

## Resolution

Completed: 2026-08-27

Branch: `claude/transform-package-refactor-7mxi8a`

### What was done

- `packages/transform/src/facets/cover.ts` — the SPEC-089 cover axis. `resolve` publishes cover as non-emitted `state`, claims the scrim metas unconditionally (the media well consumes them even when no bg layer was built), and emits the scrim data attributes. `postAssemble` flips the assembled `content` overlay's colour scheme.
- `packages/transform/src/facets/content-place.ts` — the overlay anchor, with the radial-scrim handling for a centred overlay and the warn-once outside cover mode.
- `packages/transform/src/engine.ts` — the inline `content-place` block, the cover foreground block and the cover scrim-consume block removed; `runPostAssemble` wired after children are assembled.
- `packages/transform/src/helpers.ts` — added `findNodeByDataName`.
- `packages/transform/test/facets/` — 39 further unit tests (87 total), covering the state channel, duplicate style declarations, both phases, seeding and seed shadowing.

### Notes

The interface from WORK-517 was **corrected in four ways** by this migration, which is the main outcome:

1. **`FacetResult.state`** — emitted `axes` become `data-*` attributes, so publishing cover mode through them would have invented a `data-cover` attribute on every cover rune. Emitted output and internal resolution state are different channels sharing one reader (`ctx.axis()`).
2. **`FacetResult.styles` is an ordered `[prop, value]` list, not a `Record`** — `cover` deliberately re-declares `--cover-scrim-dir` after `content-place` sets it, relying on CSS last-wins. A keyed map collapsed the two declarations into one and changed rendered output, with no test covering it.
3. **`Facet.postAssemble`** — cover's foreground-polarity flip mutates the assembled `content` overlay, which does not exist when `resolve` runs. A single axis can contribute at two pipeline phases.
4. **`FacetInput.seedAxes` + `orderFacets(facets, { seeded })`** — `media-position` comes from the still-inline modifier loop, so without a declared seed surface no facet could depend on an un-migrated producer and incremental migration would have been all-or-nothing.

`cover` declares `after: ['media-position', 'content-place']`, so the explicit-direction-overrides-derived-direction rule that two comments described in prose is now a registry constraint.

Two findings recorded but deliberately not fixed:

- The cover block's `!bgDataAttrs['data-color-scheme']` guard can never be false inside cover mode (the only assignment to that key requires `!isCover`). Behaviour preserved exactly by seeding from both bags rather than acting on the analysis.
- `findByName` and `findDeepByDataName` in `engine.ts` were the same recursive lookup written twice. Consolidated the one the facet needed into `helpers.findNodeByDataName` rather than adding a third copy; the other remains.

All 630 pre-existing transform tests pass unmodified, including `cover.test.ts`.

{% /work %}
