{% work id="WORK-517" status="in-progress" priority="high" complexity="moderate" source="SPEC-124" tags="engine, transform, architecture, refactor" milestone="v0.31.0" %}

# Facet registry foundation and first universal axes

Realize the foundation of {% ref "SPEC-124" /%}: the facet interface, the driver, and the first two axes migrated out of `transformRune`. `elevation` and `prominence` are chosen deliberately as the *easy* case — both are independent scalars with no cross-axis dependency — so the foundation lands against low-risk axes before {% ref "WORK-518" /%} tests it against the hardest one.

## Acceptance Criteria

- [ ] `packages/transform/src/facets/types.ts` defines `Facet`, `FacetContext`, `FacetInput`, `FacetResult`, `FacetWarning`, `FacetLayer`
- [ ] `facets/driver.ts` provides `orderFacets` (deterministic topological sort, registration order preserved for independents), `runFacets` (merge into a `FacetResolution`), and `WarningCollector` (per-key dedupe, immediate emission)
- [ ] `orderFacets` throws on a dependency cycle, a dangling `after`, or a duplicate facet name — at import, via a module-level `ORDERED_FACETS`, not per transform
- [ ] `elevation` and `prominence` are facets owning their own vocabularies (`ELEVATION_VALUES`, `PROMINENCE_VALUES`, `HEADER_SECTION_ROLES`); the inline blocks and their stranded constants are gone from `engine.ts`
- [ ] The engine wires all merge sinks — axes, classes, `dataAttrs`, `styles`, `consumes` — so migrating a further axis needs no engine change
- [ ] Registry order preserves `modifierValues` key insertion order, so output attribute order is unchanged
- [ ] Warning strings are byte-identical and emitted at the same point in the run
- [ ] All 630 pre-existing transform tests pass **unmodified**
- [ ] New unit tests cover facets in isolation and the driver's failure modes (cycle, dangling `after`, duplicate name), which have no counterpart today
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

Both axes are pure `attribute ?? config default → data-*` scalars, so the migration is mechanical. The care goes into two things.

**Ordering fidelity.** Registration order must match the order these axes resolved inline, because `modifierValues` key insertion order determines `data-*` attribute order in the serialized output. Keep the facet pass at the same point in `transformRune` that the inline blocks occupied.

**Warning fidelity.** Neither axis dedupes today — both warn per instance — so their `FacetWarning`s carry no `dedupeKey`. Ten test files spy on `console.warn` and assert on message text, so the collector must still print, with the same strings, at the same point. Converting those spies into assertions on returned `FacetWarning[]` is deliberately *not* part of this item; it belongs with {% ref "WORK-524" /%}, after the refactor has proven itself.

Note `ELEVATION_VALUES` was dead code before this — declared, never read. The engine performs no validation on `elevation`; the closed set is enforced only at parse time by the schema's `matches`. Preserve that (unknown values pass through); do not add validation as a drive-by.

## Blocks
- {% ref "WORK-518" /%}

## References

- {% ref "SPEC-124" /%} — facet registry (the spec this work item realizes)
- {% ref "SPEC-107" /%} — elevation & prominence, the axes migrated here

{% /work %}
