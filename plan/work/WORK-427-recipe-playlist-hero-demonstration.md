{% work id="WORK-427" status="pending" priority="medium" complexity="simple" source="SPEC-107" milestone="v0.23.0" tags="theme,surface,recipe,playlist,docs" %}

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

- [ ] A `recipe` renders as a bordered card by default and as a full-bleed, large-title hero via `elevation="flush" width="full" prominence="display"`, verified in the gallery (light + dark) with no leaked markdown.
- [ ] The card-vs-hero pattern is documented as a worked example.

## Dependencies

- Requires {% ref "WORK-425" /%} (the axes painted in Lumina).

## References

- {% ref "SPEC-107" /%} · `packages/runes/fixtures/` · `plugins/learning` (recipe) · `plugins/media` (playlist).

{% /work %}
