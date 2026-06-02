{% work id="WORK-319" status="in-progress" priority="medium" complexity="complex" source="SPEC-080" tags="runes,plugins,migration,blocks,layout,storytelling,marketing,business,places,media,design,core" milestone="v0.17.0" %}

# Migrate remaining rune packages to blocks/layout

Once api proves the model (`WORK-318`), migrate the remaining meta-bearing
runes to {% ref "SPEC-080" /%} blocks/layout: storytelling (re-migrate
faction / realm / character + lore / plot / others), marketing, business,
places, media, design, and core runes (e.g. budget).

Supersedes `WORK-310` (places), `WORK-311` (media), and `WORK-312` (core
budget) — those targeted SPEC-079 `zones`; migrate straight to blocks/layout
instead. May be split into per-package sub-items during execution.

## Acceptance Criteria

- [ ] **storytelling** re-migrated `zones` → blocks/layout (faction / realm /
  character built on this branch, plus lore / plot / storyboard / bond).
- [ ] **places, media, business, marketing, design** meta-bearing runes on
  blocks/layout.
- [ ] **core runes** (budget, and any other meta-bearing core rune) on
  blocks/layout.
- [ ] **`WORK-310`, `WORK-311`, `WORK-312` marked superseded.**
- [ ] All plugin tests + `css-coverage` pass; structure contracts regenerated.

## Approach

Package-by-package, following the recipe / faction / api patterns. Split
into per-package work items if the umbrella proves too large to land
cleanly.

## Dependencies

- {% ref "WORK-318" /%} — api proof.

## References

- {% ref "SPEC-080" /%}, {% ref "SPEC-079" /%}.
- Supersedes `WORK-310`, `WORK-311`, `WORK-312` (SPEC-079 migrations).

{% /work %}
