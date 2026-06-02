{% work id="WORK-317" status="ready" priority="high" complexity="moderate" source="SPEC-080" tags="learning,plugin,recipe,howto,migration,blocks,layout" milestone="v0.17.0" %}

# Migrate `learning` package to blocks/layout

Re-migrate recipe + howto from the SPEC-079 zones model
(`WORK-308` plus this branch's recipe/howto work) to the
{% ref "SPEC-080" /%} blocks/layout model. These runes already build
`content` + `media` trees and nest the metadata def-list via `zoneHost` /
`zoneHostPlacement`, so they map almost directly.

## Acceptance Criteria

- [ ] **recipe + howto configs use `blocks` + `layout`.** Remove `zones`,
  `zoneLayouts`, `zoneHost`, `zoneHostPlacement`.
- [ ] **Metadata placement via `layout`.** The def-list-above-preamble
  ordering (recipe + howto) is expressed as block order in the `content`
  container's `layout` list — replacing `zoneHostPlacement: 'before'`.
- [ ] **No visual change.** Steps / ingredients / tools rendering and the
  metadata def-list are unchanged; learning tests pass.

## Approach

The lightest migration — the content/media block trees already exist on
this branch. Mostly a config translation: `zones` → `blocks`,
`zoneHost`(+`Placement`)/`zoneLayouts` → `layout`.

## Dependencies

- {% ref "WORK-314" /%} — engine projection.
- {% ref "WORK-315" /%} — `bar` + field shape.

## References

- {% ref "SPEC-080" /%}; builds on `WORK-308`.

{% /work %}
