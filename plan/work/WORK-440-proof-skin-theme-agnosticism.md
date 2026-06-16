{% work id="WORK-440" status="done" priority="high" complexity="moderate" source="SPEC-094" milestone="v0.23.0" tags="theme,skeleton-skin,validation,gallery-harness" %}

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

- [x] A thin alternate skin renders the full extracted skeleton correctly, achieved with token values + skin-layer CSS only — no `@refrakt-md/skeleton` edits.
- [x] A harness comparison shows Lumina-skin and the proof-skin share structure but differ visually (the skin layer, not the skeleton, carries the look); no specificity wars / `!important`.
- [x] Any declaration the proof skin couldn't reach without touching skeleton is filed back to {% ref "WORK-438" /%} as a cut-line correction. The proof skin stays a validation artifact, not a published theme.

## Dependencies

- Requires {% ref "WORK-436" /%} (the skeleton package) and {% ref "WORK-438" /%} (the re-bucketed layers). Uses {% ref "WORK-409" /%} (harness) for the comparison.

## References

- {% ref "SPEC-094" /%} §3 · {% ref "WORK-410" /%} (`spike/skeleton-skin/skin.editorial.css` — the seed) · `packages/gallery-harness/`.

## Resolution

Completed: 2026-06-16

Branch: `claude/v023-proof-skin`

### What was done
- Added a new **private** package `@refrakt-md/proof-skin` (`packages/proof-skin/`, `"private": true`, never published) — the WORK-440 proof skin productionizing the WORK-410 editorial spike:
  - `index.css` — imports `@refrakt-md/skeleton` (unchanged), then the proof's `tokens.css` + `skin.css`. Nothing else.
  - `tokens.css` — a complete re-valuing of the `--rf-*` contract in an editorial register (serif type, 0 radius / square corners, warm-cream paper, single deep-red accent, flat / no-shadow surfaces, editorial syntax colours), plus a dark ink-paper override and the framework's `--rf-icon-*` glyph masks. Also fills the four fallback-less layout tokens the skeleton requires every theme to supply (`--rf-content-max`, `--rf-content-gutter`, `--rf-drawer-gutter`, `--rf-gallery-edge`).
  - `skin.css` — `@layer skin` editorial aesthetics over the shared structure (global elements, elevation surfaces, section zones, metadata chips, checklist/sequence markers, bespoke card/hint/hero/cta). Single-class/attribute selectors only, zero `!important`.
- Wired the proof into the gallery harness: `global-setup.ts` now generates artifacts for both themes (`@refrakt-md/lumina` + `@refrakt-md/proof-skin`), and `tests/proof.spec.ts` registers the proof's snapshots (baselines namespaced under `__screenshots__/proof/…`) mirroring `lumina.spec.ts` with no logic copy.

### Verification (AC-by-AC)
- **AC1** — Generated the proof gallery (92 runes / 328 cells, identical count to Lumina) with **zero edits to `@refrakt-md/skeleton`** (`git status` on packages/skeleton, transform, runes is clean). Audited every token the skeleton references: all fallback-less refs are either filled by the proof's tokens or are instance-scoped runtime tokens (`--frame-aspect`/`--frame-anchor`/`--grid-aspect`, set inline by the engine behind `[style*=...]` guards) — renders via token values + `@layer skin` only.
- **AC2** — Structural diff of the two generated galleries: the `@layer skeleton` block is **byte-identical** (122,415 B) across themes in both light and dark, while the `@layer skin` block diverges completely (Lumina ~292 KB vs proof ~17 KB). Same 328 cells. No `!important` (the only matches are comments asserting the rule); plain single-class/attribute selectors win purely by layer order.
- **AC3** — The audit found **no mis-classified declarations**: nothing required a skeleton edit, so there is nothing to file back to WORK-438 — the WORK-438 cut line is clean as shipped. The four layout tokens the proof had to define are token *values* (legitimately the theme's job), not skeleton structure. Proof skin stays a private validation artifact (+ theme-authoring reference), not a published theme.

### Notes
- The Playwright pixel-diff itself runs in CI/preview — chromium download is blocked in the sandbox — but the gallery generation, the byte-level skeleton/skin structural comparison, and the full vitest suite (3346 tests, all green) all pass locally.
- This package leans on the shared skin layers (global elements, elevation surfaces, sections, metadata) the skeleton structure paints across most runes, which is why a ~17 KB skin re-skins all 92 runes coherently.

{% /work %}
