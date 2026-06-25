{% work id="WORK-474" status="ready" priority="medium" complexity="simple" source="SPEC-100" milestone="v0.26.0" tags="carousel,feature,marketing,layout,lumina,css" %}

# `feature` adopts `layout="carousel"` (first Phase B adopter)

Add `carousel` to `feature`'s `layout` matches and map its feature-item collection onto the shared
carousel contract — the first proof that adoption is config + contract + CSS with zero new behavior
code. Per {% ref "SPEC-100" /%} Phase B.5.

## Scope

- Add `carousel` (from the canonical const) to `feature`'s `layout` matches — trivial now that the
  axis + `data-layout` emission exist ({% ref "WORK-467" /%}).
- Map `feature`'s item container/items onto the shared contract (`[data-name="items"]` /
  `[data-name="item"]`) so the generalised behavior binds with no per-rune behavior code.
- Add CSS for the carousel track on `feature`; wire the collapse-to-carousel option
  ({% ref "WORK-473" /%}).
- An explicit desktop `layout="carousel"` shows the JS nav affordances (via the shared behavior).

## Acceptance Criteria

- [ ] `feature` accepts `layout="carousel"`, emits the shared contract, and styles the track.
- [ ] An explicit desktop carousel shows the JS nav affordances; no new behavior code was added for `feature`.
- [ ] CSS-coverage passes for the new `feature` `[data-layout="carousel"]` selectors.

## Dependencies

- {% ref "WORK-467" /%} — `feature`'s `layout` axis + emission.
- {% ref "WORK-472" /%} — the block-agnostic behavior `feature` binds to.
- {% ref "WORK-473" /%} — the collapse-to-carousel option being wired.

## References

- Spec: {% ref "SPEC-100" /%} Phase B.5. `plugins/marketing/src/tags/feature.ts`, `plugins/marketing/src/config.ts` (`Feature`).

{% /work %}
