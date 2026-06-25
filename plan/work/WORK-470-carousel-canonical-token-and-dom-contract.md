{% work id="WORK-470" status="done" priority="high" complexity="simple" source="SPEC-100" milestone="v0.26.0" tags="carousel,layout,contract,runes,docs" %}

# Carousel canonical token + shared DOM contract

Graduate `carousel` into the canonical pool and define the shared track/item DOM contract every
adopting rune emits. Per {% ref "SPEC-100" /%} Phase A.1–A.2 and {% ref "ADR-018" /%}.

## Scope

- Add `carousel` to the canonical layout const ({% ref "WORK-466" /%}) so adopting runes import
  one token.
- **Define and document the shared carousel DOM contract** that `layout="carousel"` implies:
  - host element carrying `data-layout="carousel"` (already the engine's `layout`-modifier output);
  - a track container `[data-name="items"]` and item elements `[data-name="item"]` — **reuse
    gallery's existing tokens verbatim** (the lightbox also queries `[data-name="item"]`, so
    keeping the names leaves gallery byte-stable).
- Document the contract once alongside the canonical token (rune-authoring) so every adopting rune
  emits the same shape; note the `:scope >` query expectation for adopters.

## Acceptance Criteria

- [x] `carousel` is added to the canonical layout const and importable by adopting runes.
- [x] A documented shared carousel DOM contract exists: host `data-layout="carousel"` + track `[data-name="items"]` + items `[data-name="item"]` (gallery's tokens reused unchanged).
- [x] The contract is documented once in rune-authoring, including the scoped-query expectation.

## Dependencies

- {% ref "WORK-466" /%} — the canonical const must exist before `carousel` is added to it.

## References

- Spec: {% ref "SPEC-100" /%} Phase A.1–A.2 + Design notes (keep `items`/`item`). Decision: {% ref "ADR-018" /%} (graduation rule).
- `packages/runes/src/tags/gallery.ts`, `packages/runes/src/config.ts` (`Gallery`).

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-100-carousel-layout-mode`

### What was done
- `packages/runes/src/layout-vocabulary.ts` — added `LAYOUT.carousel` to the canonical pool; documented the carousel DOM/behavior contract (host `data-layout="carousel"`, track `data-name="items"`, items `data-name="item"`, block-agnostic behavior on `[data-layout="carousel"]`).
- `packages/runes/test/layout-vocabulary.test.ts` — seed-set assertion now expects `carousel`.
- `site/content/extend/rune-authoring/patterns.md` — new "The `carousel` contract" subsection documenting the shape, the zero-behavior-code adoption model, and the `:scope >` query expectation.

### Notes
- Token + contract only — `gallery` keeps its inline `layout` values for now (it migrates onto the const/contract in WORK-472). The behavior dispatch (WORK-471) and the lift-out-of-gallery (WORK-472) build on this.

{% /work %}
