{% work id="WORK-435" status="done" priority="high" complexity="complex" source="SPEC-094" milestone="v0.23.0" tags="theme,tokens,spacing,css,skeleton-skin" %}

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

- [x] The token contract defines a spacing scale (+ needed facets) with typed `--rf-*` tokens, generated into Lumina's token CSS.
- [x] Lumina's hardcoded spacing magnitudes are refactored onto the tokens with no visual change (CSS-coverage + contracts green).
- [x] An audit confirms no stray hardcoded spacing remains in the slice the re-bucketing will touch first (card / hint / surfaces), and a documented residue list for the rest.

## Dependencies

- Builds on the token-contract work ({% ref "WORK-404" /%}/{% ref "WORK-405" /%}/{% ref "WORK-406" /%}). Gates the re-bucketing (WORK-438).

## References

- {% ref "SPEC-094" /%} (Tier 1 tokens) · {% ref "WORK-410" /%} FINDINGS §1/§7 (the prerequisite) · `packages/types/src/token-contract.ts`.

## Resolution

Completed: 2026-06-15

Branch: `claude/v023-batch1-foundations` (Batch 1). Approach per review: **densify + rationalize**, scoped to the **slice + residue list**.

### What was done
- Densified the spacing scale: added `snug` (0.75rem) + `cozy` (1rem) to the token contract (`packages/types/src/token-contract.ts`) and Lumina (`packages/lumina/src/tokens.ts`), filling the empty `sm`(0.5)→`md`(1.5) component-padding band. Generated → `--rf-spacing-snug` / `--rf-spacing-cozy`.
- Tokenized the slice (`card.css`, `hint.css`, `surfaces.css`) onto the scale, rationalizing hand-tuned values (0.375→xs, 0.625→sm, 0.875→snug, 1.25→cozy; exact for 0.5/0.75/1/1.5). Nudges ≤4px (mostly ≤2px). No stray spacing literals remain in the slice.
- Residue inventory written to `spike/skeleton-skin/spacing-residue.md` for WORK-438: **~726 literals across 93 files**, with the rationalization map + heaviest offenders (nav 50, blog 33, …). WORK-438 folds spacing tokenization into each file's re-bucketing pass.

### Notes
- The rationalization is a deliberate sub-2px-to-4px nudge (review-approved), **not** strictly pixel-identical, and is not verifiable here — the WORK-409 harness needs a browser. Confirm via capture-then-compare when a browser env is available.
- css-coverage (176) + the full transform/lumina suites (778) green.
- Non-spacing literals (icon glyph sizes, font-size/line-height) left as-is — typography is a separate token concern.

{% /work %}
