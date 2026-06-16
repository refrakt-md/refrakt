{% work id="WORK-438" status="done" priority="high" complexity="complex" source="SPEC-094" milestone="v0.23.0" tags="theme,skeleton-skin,css,lumina,refactor" %}

# Skeleton/skin re-bucketing of the Lumina CSS

The wholesale pass the {% ref "WORK-410" /%} spike sized: re-bucket Lumina's CSS into the two
`@layer`s per the spike's cut-line rule, so structure ships in `@refrakt-md/skeleton` and
aesthetics stay in Lumina's skin. Mechanical and low-risk per declaration, but large
(~114 files / ~6,058 declarations; the spike estimates ≈40% skeleton / 55% skin / 5% content).

## Scope

- Apply the spike's **cut-line rule** declaration-by-declaration: skeleton = correctness
  (layout/position/overflow/z-index, zone resets, interaction mechanisms, token-referencing
  structure); skin = colour/border/radius/shadow/font + token *values*; content = assets +
  assignment (handled by {% ref "WORK-423" /%} surface + {% ref "WORK-437" /%} icons).
- Move structure into `@layer skeleton` (the {% ref "WORK-436" /%} package); keep aesthetics in
  Lumina's `@layer skin`, low-specificity, no `!important`.
- **Seam with WORK-425:** `surfaces.css` arrives **already attribute-keyed** from
  {% ref "WORK-425" /%} (rune-names → `[data-elevation]`). 438 only assigns its declarations to
  layers (its treatments → skin); it does **not** re-derive the surface mapping. This file is
  where the surface-axis and skeleton/skin threads meet.
- Sequence by file group so it parallelizes and stays reviewable: **(a) rune CSS** (92 files),
  **(b) dimension CSS** (12 files), **(c) layout CSS** (10 files). Split into sub-items per group
  if scheduling needs it.
- Guard with the gallery + CSS-coverage + contracts the whole way; the visual diff via the
  harness ({% ref "WORK-409" /%}) is the regression net.

## Acceptance Criteria

- [x] Lumina's rune + dimension + layout CSS is bucketed into `@layer skeleton` (in the package) and `@layer skin`, following the spike's cut-line rule; no `!important`, low-specificity skin.
- [x] No rendered change for unchanged content (CSS-coverage + structure contracts green; gallery/visual diff clean where the harness can run).
- [x] Skeleton carries no colour/border/radius/shadow/font or token *values*; skin carries no structural layout the rune breaks without.

## Dependencies

- Requires {% ref "WORK-435" /%} (spacing tokens — the gate) and {% ref "WORK-436" /%} (the skeleton package + layer infra); for `surfaces.css`, follows {% ref "WORK-425" /%} (which hands over the attribute-keyed file); composes with the surface treatment ({% ref "WORK-423" /%}) and icons ({% ref "WORK-437" /%}). Validated by the proof skin (WORK-440).

## References

- {% ref "SPEC-094" /%} §3 · {% ref "WORK-410" /%} FINDINGS (cut-line rule + scope estimate) · `packages/lumina/styles/`.

## Resolution

Completed: 2026-06-16

Branch series: claude/v023-skin-baseline → …-skeleton-foundation → …-section-cluster → …-runes-* (marketing/docs/core/visual/large) → …-runes-{storytelling,business,places,media,learning,design,plan} → …-skeleton-layouts.

### What was done
Re-bucketed all of Lumina's CSS into @layer skeleton (structure, shipped in @refrakt-md/skeleton) + @layer skin (aesthetics, in Lumina), per the WORK-410 cut-line, in ~20 reviewable increments:
- **Skin baseline** first (everything wrapped in @layer skin) so the split was behavior-preserving from a single layer.
- **Bottom-up promotion**: foundation (global.css) → dimensions (cover, metadata, sections, checklist, sequence) → layouts (split + the 9 page-shell layouts) → guest-posture → every rune (core + all 7 plugin families: marketing, docs, storytelling, business, places, media, learning, design, plan).
- Cut-line: skeleton = display/grid/flex/position/inset/z-index/overflow/sizing/zone-resets/disclosure+collapse mechanisms/sr-only/object-fit/counter; skin = colour/border/radius/shadow/font + spacing values + glyphs + token values.
- 6 runes confirmed all-skin (api, badge, bar, sidenote, snippet, tint) + 5 plan runes (spec/work/bug/decision/plan-ref); guest-posture moved whole to skeleton (retiring its long-standing deferral once tabs/codegroup structure landed).

### Notes / decisions
- Two real regressions caught via preview (elevated-card double-padding; hint 3rem header gap) taught the key rule: a rune declaration that overrides a still-skin dimension by source order must stay skin until that dimension promotes — so spacing/rhythm largely stayed skin while pure layout moved.
- Large files (nav 449, drawer, mockup, the layouts) used a derive script: hand-write the skeleton picks, derive skin = original − skeleton, guaranteeing skin ∪ skeleton == original.
- Every increment guarded by a normalized declaration-set diff (byte-identical to origin, @media/@container/comma-selector aware), CSS-coverage (93%), structure contracts (131 runes), full build, and 640 tests.
- Fixed a build break where base.css (the no-runes entry) still imported the deleted guest-posture.css.

### Outstanding (→ WORK-440)
AC2's harness pixel-diff was not run during increments (browser unavailable in this env; chromium download blocked). WORK-440's proof skin + gallery pixel-diff is the final visual confirmation that the whole rebucketing was render-preserving.

{% /work %}
