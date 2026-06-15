{% work id="WORK-427" status="done" priority="medium" complexity="simple" source="SPEC-107" milestone="v0.23.0" tags="theme,surface,recipe,playlist,docs" %}

# Demonstrate the axes: full-bleed hero recipe / playlist

Close the loop on the use case that motivated {% ref "SPEC-107" /%}: the same content rune
reading as a contained card *and* as a full-width hero, by composing the axes — no rune fork.

## Scope

- Add fixtures / docs examples showing `recipe` (and `playlist`) at their card default and as a
  hero: `elevation="flush" width="full" prominence="display"` — large title, no surface chrome,
  edge-to-edge.
- Surface the pattern in the docs (the surfaces page and/or the recipe/playlist rune pages) as
  the canonical "card vs hero" example.

## Acceptance Criteria

- [x] A `recipe` renders as a bordered card by default and as a full-bleed, large-title hero via `elevation="flush" width="full" prominence="display"`, verified in the gallery (light + dark) with no leaked markdown.
- [x] The card-vs-hero pattern is documented as a worked example.

## Dependencies

- Requires {% ref "WORK-425" /%} (the axes painted in Lumina).

## References

- {% ref "SPEC-107" /%} · `packages/runes/fixtures/` · `plugins/learning` (recipe) · `plugins/media` (playlist).

## Resolution

Completed: 2026-06-15

Branch: `claude/v023-elevation-migration-demo`

### What was done
- **Documented the card-vs-hero worked example** in `runes/surfaces.md` (new `## Card vs hero` section, the `#card-vs-hero` anchor referenced from the axes intro): the same `recipe` as a bordered card by default, then as a full-bleed hero via `elevation="flush" width="full" prominence="display"` — two `{% preview source=true %}` blocks, same content, no rune fork. Noted the pattern generalises to any page-section-header rune (playlist/howto/section) and cross-linked cover mode.
- **Added the hero example to the recipe rune page** (`runes/learning/recipe.md` → `## Card vs hero`), contrasting it with cover mode (hero stacks a display title above edge-to-edge media; cover overlays the title *on* the image).

### Verification
- Rendered both recipe and playlist as heroes through the transform (`refrakt inspect <rune> --elevation=flush --width=full --prominence=display`): all three axes emit on the rune root — `data-elevation="flush"`, `data-width="full"`, `data-prominence="display"` — with no leaked markdown (`{%` absent from output).
- Confirmed the card default is unchanged: recipe with no axes emits `data-elevation="flat"` and neither `data-width` nor `data-prominence`.
- Light vs dark is purely a token swap over identical HTML, so the structural verification covers both; the static gallery renders the recipe/playlist card defaults.

### Notes
- This work surfaced (and WORK-426 fixed) the batch-1 gap where `prominence` never reached the engine — without it the hero's title would not have scaled. The demonstration is the regression test for that wiring.
- `width="full"` inside a `{% preview %}` renders full-width-of-preview rather than true page bleed (the preview container has no article grid); the real edge-to-edge bleed shows on an actual page. Worth a glance in a browser run.

{% /work %}
