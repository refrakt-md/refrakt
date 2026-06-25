{% work id="WORK-474" status="done" priority="medium" complexity="simple" source="SPEC-100" milestone="v0.26.0" tags="carousel,feature,marketing,layout,lumina,css" %}

# `feature` adopts `layout="carousel"` (first Phase B adopter)

Add `carousel` to `feature`'s `layout` matches and map its feature-item collection onto the shared
carousel contract — the first proof that adoption is config + contract + CSS with zero new behavior
code. Per {% ref "SPEC-100" /%} Phase B.5.

## Scope

- Add `carousel` (from the canonical const) to `feature`'s `layout` matches — trivial now that the
  axis + `data-layout` emission exist ({% ref "WORK-467" /%}).
- Map `feature`'s item container/items onto the shared contract (`[data-name="items"]` /
  `[data-name="item"]`) so the generalised behavior binds with no per-rune behavior code.
- Add CSS for the carousel track on `feature`; wire the `collapse-to="carousel"` option
  ({% ref "WORK-473" /%}) so `layout="grid" collapse-to="carousel"` gives grid-desktop /
  swipe-row-mobile.
- `layout="carousel"` is an all-viewport carousel (graceful degradation); an explicit desktop
  carousel shows the JS nav affordances (via the shared behavior).

## Acceptance Criteria

- [x] `feature` accepts `layout="carousel"`, emits the shared contract, and styles the track.
- [x] An explicit desktop carousel shows the JS nav affordances; no new behavior code was added for `feature`.
- [x] CSS-coverage passes for the new `feature` `[data-layout="carousel"]` selectors.

## Dependencies

- {% ref "WORK-467" /%} — `feature`'s `layout` axis + emission.
- {% ref "WORK-472" /%} — the block-agnostic behavior `feature` binds to.
- {% ref "WORK-473" /%} — the collapse-to-carousel option being wired.

## References

- Spec: {% ref "SPEC-100" /%} Phase B.5. `plugins/marketing/src/tags/feature.ts`, `plugins/marketing/src/config.ts` (`Feature`).

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-100-carousel-layout-mode`

### What was done
- `plugins/marketing/src/tags/feature.ts` — `layout` matches now include `LAYOUT.carousel`.
- `plugins/marketing/src/config.ts` — `autoLabel` marks the feature-items `dl` as `data-name="items"` (the shared carousel track token; renamed from `definitions`).
- `packages/skeleton/styles/runes/feature.css` + `packages/lumina/styles/runes/feature.css` — `.rf-feature__definitions` → `.rf-feature__items` throughout.
- Shared carousel CSS/behavior (WORK-472) drive feature's carousel with **zero feature-specific behavior code**; slides are the dl's children; default slide width via `--rf-carousel-slide`.
- `plugins/marketing/test/feature.test.ts` — carousel acceptance + collapse-to + slides-as-dl-children. Contracts regenerated.

### Notes
- Track marker reuses `data-name="items"` per the maintainer's decision (feature renamed its container rather than introducing a dedicated attribute).
- The dispatch (WORK-471) mounts the shared `carouselBehavior` on feature's `[data-layout="carousel"]` host, so the desktop JS nav appears with no per-rune code. Follow-on (noted in WORK-471): the adapter behavior-bundle heuristic should also count `[data-layout]` layout-mode behaviors so a carousel-only page ships the bundle.

{% /work %}
