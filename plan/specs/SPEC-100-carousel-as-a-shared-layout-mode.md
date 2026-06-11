{% spec id="SPEC-100" status="draft" tags="carousel,layout,behaviors,gallery,feature,runes" source="ADR-018" %}

# Carousel as a shared layout mode

Promote `carousel` from a `gallery`-coupled behavior to a **canonical layout
mode** ({% ref "ADR-018" /%}) that any rune can opt into via `layout="carousel"`.
Generalise `gallery`'s carousel into a block-agnostic, contract-bound behavior;
define the shared track/item DOM contract behind the `carousel` token; then adopt
it across the candidate runes, starting with `feature`.

Target: next minor (after {% ref "SPEC-099" /%}).

## Motivation

`carousel` is the first value to **graduate** into the canonical pool under
{% ref "ADR-018" /%}'s rule — it already has 3+ identified consumers (`feature`,
`testimonial`, `pricing`, `cast`, beyond today's `gallery`). A carousel is not a
distinct kind of content; it is the *same* homogeneous items on a scroll-snap
track. That makes it a layout mode, not a wrapper rune — the same shape as
`tabs`/`accordion`/`datatable`: identical content, a progressive-enhancement
behavior layer.

Today the capability exists only in `gallery` and is **coupled to that block**, so
it cannot be reused as-is.

## Current state

`gallery` (`packages/runes/src/tags/gallery.ts`, config in
`packages/runes/src/config.ts` `Gallery`) already:

- accepts `layout` (`grid | carousel | masonry`) and emits `data-layout` via a
  meta modifier;
- emits an items container `[data-name="items"]` holding `[data-name="item"]`
  figures.

The behavior (`packages/behaviors/src/behaviors/gallery.ts`,
`galleryBehavior`) is the part that is **not** shareable:

- it is registered/scoped to `[data-rune="gallery"]`;
- `setupCarousel` triggers on `el.getAttribute('data-layout') === 'carousel'`,
  finds `[data-name="items"]`/`[data-name="item"]`, and injects nav buttons with
  hard-coded `rf-gallery__nav` classes;
- the mechanism itself is small: a CSS scroll-snap track plus two buttons that
  `scrollBy` one item-width, plus arrow-key handling. The heavy lifting is already
  CSS.

So the carousel concept is sound and proven; only its **binding** is
gallery-specific.

## Design

The work has two phases.

### Phase A — generalise the behavior + define the contract

1. **Add `carousel` to the canonical const** ({% ref "ADR-018" /%}), so adopting
   runes import the same token.

2. **Define the shared carousel DOM contract** that `layout="carousel"` implies:
   - a host element carrying `data-layout="carousel"` (already the engine's output
     for a `layout` modifier);
   - a track container marked with an agreed `data-name` (generalise gallery's
     `[data-name="items"]`);
   - item elements marked with an agreed `data-name` (generalise
     `[data-name="item"]`).
   Document this contract alongside the canonical token so every adopting rune
   emits the same shape.

3. **Lift the carousel behavior out of `gallery`** into a standalone,
   block-agnostic behavior bound on `[data-layout="carousel"]` (not
   `[data-rune="gallery"]`). Nav chrome moves to block-relative or shared
   `rf-carousel__*` classes rather than `rf-gallery__nav`. `gallery` keeps its
   lightbox behavior and now consumes the shared carousel behavior for its
   carousel layout, leaving its rendered output unchanged.

4. **Collapse-to-carousel target (CSS-first).** Building on {% ref "SPEC-099" /%}'s
   `collapse` semantics, allow a rune's collapsed (mobile) form to be a carousel
   instead of a stack. The arrangement flip (grid → scroll-snap row at the
   breakpoint) is **CSS-only** and nearly free. The behavior's nav-button chrome
   is **explicit-desktop only** (`layout="carousel"`); the responsive collapse
   path relies on native touch/trackpad scroll and does **not** mount the JS
   affordances. This deliberately avoids a `matchMedia` mount/unmount lifecycle in
   the behavior layer; that complexity is only taken on if a concrete need for
   buttons on the collapsed mobile carousel later appears (a non-goal here).

### Phase B — adopt across runes

5. **`feature` first** — add `carousel` to its `layout` matches (now trivial: the
   axis and the `data-layout` emission exist from {% ref "SPEC-099" /%}; `feature`
   already emits a feature-item collection). Map its item container/items onto the
   shared contract, add CSS for the track, and wire the collapse-to-carousel
   option.

6. **Remaining candidates** — `testimonial`, `pricing`, `cast` (and any other
   rune rendering a homogeneous item band). Each adoption is config + the shared
   contract + CSS, with **zero new behavior code**. Runes adopt incrementally; not
   all need to land in one change.

## Acceptance Criteria

- [ ] `carousel` is added to the canonical layout const ({% ref "ADR-018" /%}) and
  imported by every adopting rune.
- [ ] A documented shared carousel DOM contract exists (host `data-layout="carousel"`
  + agreed track/item `data-name`s); `gallery`'s existing output is migrated onto
  it without changing its rendered markup semantics.
- [ ] The carousel behavior is block-agnostic — bound on `[data-layout="carousel"]`,
  not `[data-rune="gallery"]` — and uses shared `rf-carousel__*` (not
  `rf-gallery__nav`) chrome. `gallery` consumes it and keeps its lightbox.
- [ ] `feature` accepts `layout="carousel"`, emits the shared contract, and styles
  the track; an explicit desktop carousel shows the JS nav affordances.
- [ ] Collapse-to-carousel works as a **CSS-only** arrangement flip at the
  {% ref "SPEC-099" /%} `collapse` breakpoint, with no `matchMedia` mount/unmount
  in the behavior layer and no JS nav chrome mounted on the responsive path.
- [ ] At least one further rune (`testimonial` *or* `pricing` *or* `cast`) adopts
  `layout="carousel"` through config + contract + CSS only, demonstrating zero new
  behavior code per adoption.
- [ ] Behavior tests cover prev/next, keyboard nav, and cleanup for the
  generalised behavior; CSS-coverage passes for the new `[data-layout="carousel"]`
  selectors across adopting runes.
- [ ] Docs: the carousel layout mode and its contract are documented once
  (rune-authoring), and each adopting rune's page notes `layout="carousel"`.

## Non-goals

- A standalone `{% carousel %}` wrapper rune — carousel is a layout *mode* on
  existing runes, not a container you nest foreign items into.
- JS nav affordances on the **collapsed mobile** carousel — the responsive path is
  CSS/touch-scroll only; a `matchMedia`-driven mount/unmount lifecycle is out of
  scope unless a concrete need arises.
- `masonry` or other gallery-local layout values — they remain local
  ({% ref "ADR-018" /%}); only `carousel` graduates here.
- Adopting *every* candidate rune in this spec — `feature` plus one more proves the
  pattern; the rest follow incrementally.

## References

- {% ref "ADR-018" /%} — canonical layout vocabulary; `carousel` graduates under
  its rule.
- {% ref "SPEC-099" /%} — `feature` `layout` axis + `collapse` semantics this
  builds on (the first adopter).
- `packages/behaviors/src/behaviors/gallery.ts` (`galleryBehavior`,
  `setupCarousel`), `packages/runes/src/tags/gallery.ts`,
  `packages/runes/src/config.ts` (`Gallery`).

{% /spec %}
