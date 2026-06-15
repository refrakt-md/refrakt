{% work id="WORK-440" status="pending" priority="high" complexity="moderate" source="SPEC-094" milestone="v0.23.0" tags="theme,skeleton-skin,validation,gallery-harness" %}

# Proof skin — validate the skeleton is theme-agnostic

The milestone's **exit gate**. The skeleton/skin extraction's goal is "theme #2 is a token
file + layout + skin, not a fork" — but theme #2 is deferred ({% ref "SPEC-094" /%}), so the
extraction would otherwise ship with **no consumer to prove it worked**. The harness
inert-proof only shows *Lumina didn't regress*; it does not show the skeleton is actually
skin-agnostic. A thin proof skin closes that gap.

## Scope

- Productionize the {% ref "WORK-410" /%} spike's editorial re-skin into a **thin, throwaway
  alternate skin** over the extracted skeleton — deliberately **not** theme #2: just enough
  rune coverage to be a meaningful proof, kept as a validation artifact (e.g. under
  `spike/`/test fixtures or a private package), **not** a shipped/published theme.
- It must re-skin using **token values + `@layer skin` CSS only** — zero edits to
  `@refrakt-md/skeleton`. Any skeleton edit needed to make it work is a mis-classified
  declaration to push back into {% ref "WORK-438" /%}.
- Use the harness ({% ref "WORK-409" /%}) to diff Lumina-skin vs the proof-skin and confirm
  the **skin layer is doing the work** (the structure is identical; the look diverges).

## Acceptance Criteria

- [ ] A thin alternate skin renders the full extracted skeleton correctly, achieved with token values + skin-layer CSS only — no `@refrakt-md/skeleton` edits.
- [ ] A harness comparison shows Lumina-skin and the proof-skin share structure but differ visually (the skin layer, not the skeleton, carries the look); no specificity wars / `!important`.
- [ ] Any declaration the proof skin couldn't reach without touching skeleton is filed back to {% ref "WORK-438" /%} as a cut-line correction. The proof skin stays a validation artifact, not a published theme.

## Dependencies

- Requires {% ref "WORK-436" /%} (the skeleton package) and {% ref "WORK-438" /%} (the re-bucketed layers). Uses {% ref "WORK-409" /%} (harness) for the comparison.

## References

- {% ref "SPEC-094" /%} §3 · {% ref "WORK-410" /%} (`spike/skeleton-skin/skin.editorial.css` — the seed) · `packages/gallery-harness/`.

{% /work %}
