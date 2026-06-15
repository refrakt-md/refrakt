{% work id="WORK-431" status="pending" priority="high" complexity="complex" source="SPEC-094" milestone="v0.23.0" tags="theme,skeleton-skin,css,lumina,refactor" %}

# Skeleton/skin re-bucketing of the Lumina CSS

The wholesale pass the {% ref "WORK-410" /%} spike sized: re-bucket Lumina's CSS into the two
`@layer`s per the spike's cut-line rule, so structure ships in `@refrakt-md/skeleton` and
aesthetics stay in Lumina's skin. Mechanical and low-risk per declaration, but large
(~114 files / ~6,058 declarations; the spike estimates ≈40% skeleton / 55% skin / 5% content).

## Scope

- Apply the spike's **cut-line rule** declaration-by-declaration: skeleton = correctness
  (layout/position/overflow/z-index, zone resets, interaction mechanisms, token-referencing
  structure); skin = colour/border/radius/shadow/font + token *values*; content = assets +
  assignment (handled by {% ref "WORK-423" /%} surface + {% ref "WORK-430" /%} icons).
- Move structure into `@layer skeleton` (the {% ref "WORK-429" /%} package); keep aesthetics in
  Lumina's `@layer skin`, low-specificity, no `!important`.
- Sequence by file group so it parallelizes and stays reviewable: **(a) rune CSS** (92 files),
  **(b) dimension CSS** (12 files), **(c) layout CSS** (10 files). Split into sub-items per group
  if scheduling needs it.
- Guard with the gallery + CSS-coverage + contracts the whole way; the visual diff via the
  harness ({% ref "WORK-409" /%}) is the regression net.

## Acceptance Criteria

- [ ] Lumina's rune + dimension + layout CSS is bucketed into `@layer skeleton` (in the package) and `@layer skin`, following the spike's cut-line rule; no `!important`, low-specificity skin.
- [ ] No rendered change for unchanged content (CSS-coverage + structure contracts green; gallery/visual diff clean where the harness can run).
- [ ] Skeleton carries no colour/border/radius/shadow/font or token *values*; skin carries no structural layout the rune breaks without.

## Dependencies

- Requires {% ref "WORK-428" /%} (spacing tokens — the gate) and {% ref "WORK-429" /%} (the skeleton package + layer infra); composes with {% ref "WORK-423" /%} (surface treatment moves to skin) and {% ref "WORK-430" /%} (icons).

## References

- {% ref "SPEC-094" /%} §3 · {% ref "WORK-410" /%} FINDINGS (cut-line rule + scope estimate) · `packages/lumina/styles/`.

{% /work %}
