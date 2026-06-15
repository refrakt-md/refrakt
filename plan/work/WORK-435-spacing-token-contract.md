{% work id="WORK-435" status="ready" priority="high" complexity="complex" source="SPEC-094" milestone="v0.23.0" tags="theme,tokens,spacing,css,skeleton-skin" %}

# Spacing token contract + Lumina refactor

The prerequisite the {% ref "WORK-410" /%} spike surfaced: a clean skeleton/skin split needs
spacing to be tokenized, exactly as the type split needed {% ref "WORK-404" /%}/{% ref "WORK-405" /%}.
Skeleton references spacing tokens by name; skin owns their values — but today Lumina hardcodes
magnitudes (`0.5rem`, `0.375rem`, `0.8125em`, …), so the skin layer can't retune them without
restating structure. **The gate for the re-bucketing.**

## Scope

- Extend the token contract (`packages/types/src/token-contract.ts`) with a spacing system —
  a named scale (and any rhythm / inset / gap facets the audit shows are needed), mirroring the
  typographic-token shape from {% ref "WORK-404" /%}.
- Refactor Lumina's hardcoded spacing declarations onto the tokens (no visual change), the way
  {% ref "WORK-405" /%} did for type. Drive the audit from the spike's finding (card/hint/surfaces
  hardcodes) outward across the rune + dimension CSS.
- Generate the spacing tokens into Lumina's token CSS (extend the {% ref "WORK-406" /%} generator),
  not a hand-maintained mirror.

## Acceptance Criteria

- [ ] The token contract defines a spacing scale (+ needed facets) with typed `--rf-*` tokens, generated into Lumina's token CSS.
- [ ] Lumina's hardcoded spacing magnitudes are refactored onto the tokens with no visual change (CSS-coverage + contracts green).
- [ ] An audit confirms no stray hardcoded spacing remains in the slice the re-bucketing will touch first (card / hint / surfaces), and a documented residue list for the rest.

## Dependencies

- Builds on the token-contract work ({% ref "WORK-404" /%}/{% ref "WORK-405" /%}/{% ref "WORK-406" /%}). Gates the re-bucketing (WORK-438).

## References

- {% ref "SPEC-094" /%} (Tier 1 tokens) · {% ref "WORK-410" /%} FINDINGS §1/§7 (the prerequisite) · `packages/types/src/token-contract.ts`.

{% /work %}
