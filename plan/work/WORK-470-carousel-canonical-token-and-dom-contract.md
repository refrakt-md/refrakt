{% work id="WORK-470" status="ready" priority="high" complexity="simple" source="SPEC-100" milestone="v0.26.0" tags="carousel,layout,contract,runes,docs" %}

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

- [ ] `carousel` is added to the canonical layout const and importable by adopting runes.
- [ ] A documented shared carousel DOM contract exists: host `data-layout="carousel"` + track `[data-name="items"]` + items `[data-name="item"]` (gallery's tokens reused unchanged).
- [ ] The contract is documented once in rune-authoring, including the scoped-query expectation.

## Dependencies

- {% ref "WORK-466" /%} — the canonical const must exist before `carousel` is added to it.

## References

- Spec: {% ref "SPEC-100" /%} Phase A.1–A.2 + Design notes (keep `items`/`item`). Decision: {% ref "ADR-018" /%} (graduation rule).
- `packages/runes/src/tags/gallery.ts`, `packages/runes/src/config.ts` (`Gallery`).

{% /work %}
