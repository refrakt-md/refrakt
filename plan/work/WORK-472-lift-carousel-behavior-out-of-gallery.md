{% work id="WORK-472" status="done" priority="high" complexity="moderate" source="SPEC-100" milestone="v0.26.0" tags="carousel,behaviors,gallery,lumina,css,tests" %}

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

- [x] The carousel behavior is block-agnostic — bound on `[data-layout="carousel"]`, not `[data-rune="gallery"]` — and uses shared `rf-carousel__*` (not `rf-gallery__nav`) chrome.
- [x] Nav chrome mounts relative to the track/items container (not the host root), so multi-region hosts position correctly.
- [x] `gallery` consumes the shared behavior, keeps its lightbox, and its rendered output/markup semantics are unchanged.
- [x] Behavior tests cover prev/next, keyboard nav, and cleanup for the generalised behavior.

## Dependencies

- {% ref "WORK-470" /%} — the shared DOM contract the behavior queries.
- {% ref "WORK-471" /%} — the attribute-triggered dispatch that mounts it.

## References

- Spec: {% ref "SPEC-100" /%} Phase A.3 + Design notes (nav mount point, scoped queries).
- `packages/behaviors/src/behaviors/gallery.ts` (`galleryBehavior`, `setupCarousel`, `setupLightbox`).

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-100-carousel-layout-mode`

### What was done
- `packages/behaviors/src/behaviors/carousel.ts` (new) — block-agnostic carousel behavior generalised from gallery's `setupCarousel`. Finds the track via `[data-name="items"]`, scopes slides to `:scope > [data-name="item"]`, mounts nav into the track's container (not the rune root; ensures it's a positioning context), uses `rf-carousel__*` classes, prev/next + arrow-key scroll, full cleanup.
- `packages/behaviors/src/behaviors/gallery.ts` — `setupCarousel` removed; `galleryBehavior` now owns only the lightbox.
- `packages/behaviors/src/index.ts` — registers `carousel` in `layoutModeBehaviors`; exports `carouselBehavior`.
- `packages/skeleton/styles/runes/carousel.css` + `packages/lumina/styles/runes/carousel.css` (new) — shared track scroll-snap mechanics + `rf-carousel__nav` positioning (skeleton) and nav chrome (lumina), keyed on the contract; imported in both `index.css` (entry parity holds).
- `packages/skeleton/styles/runes/gallery.css` / `packages/lumina/styles/runes/gallery.css` — removed the now-shared carousel track + `rf-gallery__nav` rules; gallery keeps only its column-based item width.
- `packages/runes/src/tags/gallery.ts` — `layout` matches migrated onto the const (`layoutMatches([LAYOUT.grid, LAYOUT.carousel], 'masonry')`); same values, ADR-018 hygiene.
- `packages/behaviors/test/carousel.test.ts` (new) — prev/next, keyboard, multi-region nav mount point, cleanup, and the no-track/no-items no-op.

### Notes
- Gallery's markup/output unchanged (same `data-layout`/`data-name` tokens); only the JS-injected nav class changed (`rf-gallery__nav` → `rf-carousel__nav`). 1348 runes/behaviors/lumina tests green incl. contracts + CSS coverage + entry parity. Hardened the position-context guard to also treat an empty computed `position` (jsdom) as non-positioned.

{% /work %}
