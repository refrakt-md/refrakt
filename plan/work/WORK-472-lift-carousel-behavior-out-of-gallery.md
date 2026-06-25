{% work id="WORK-472" status="ready" priority="high" complexity="moderate" source="SPEC-100" milestone="v0.26.0" tags="carousel,behaviors,gallery,lumina,css,tests" %}

# Lift the carousel behavior out of gallery (block-agnostic)

Generalise `gallery`'s `setupCarousel` into a standalone, contract-bound behavior bound on
`[data-layout="carousel"]`, leaving gallery's rendered output unchanged. Per
{% ref "SPEC-100" /%} Phase A.3.

## Scope

- Extract `setupCarousel` (`packages/behaviors/src/behaviors/gallery.ts`) into a standalone
  block-agnostic carousel behavior dispatched via {% ref "WORK-471" /%} on
  `[data-layout="carousel"]` (not `[data-rune="gallery"]`).
- It finds the track via the shared contract ({% ref "WORK-470" /%}); tighten queries to
  `:scope >` where possible so nested non-slide `[data-name="item"]`s aren't matched.
- **Mount nav relative to the track/items container, not the host root** — `el.appendChild` only
  works in gallery because host ≈ track; multi-region runes (e.g. `feature`) would misposition.
- Move nav chrome classes from `rf-gallery__nav` to shared `rf-carousel__*`; the CSS for those
  lives in a shared carousel stylesheet (imported once), not per-rune.
- `gallery` keeps its lightbox and now consumes the shared carousel behavior for its carousel
  layout; its rendered markup semantics are unchanged.
- **Behavior tests**: prev/next, keyboard nav, and cleanup for the generalised behavior.

## Acceptance Criteria

- [ ] The carousel behavior is block-agnostic — bound on `[data-layout="carousel"]`, not `[data-rune="gallery"]` — and uses shared `rf-carousel__*` (not `rf-gallery__nav`) chrome.
- [ ] Nav chrome mounts relative to the track/items container (not the host root), so multi-region hosts position correctly.
- [ ] `gallery` consumes the shared behavior, keeps its lightbox, and its rendered output/markup semantics are unchanged.
- [ ] Behavior tests cover prev/next, keyboard nav, and cleanup for the generalised behavior.

## Dependencies

- {% ref "WORK-470" /%} — the shared DOM contract the behavior queries.
- {% ref "WORK-471" /%} — the attribute-triggered dispatch that mounts it.

## References

- Spec: {% ref "SPEC-100" /%} Phase A.3 + Design notes (nav mount point, scoped queries).
- `packages/behaviors/src/behaviors/gallery.ts` (`galleryBehavior`, `setupCarousel`, `setupLightbox`).

{% /work %}
