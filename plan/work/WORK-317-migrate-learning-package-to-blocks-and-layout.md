{% work id="WORK-317" status="done" priority="high" complexity="moderate" source="SPEC-080" tags="learning,plugin,recipe,howto,migration,blocks,layout" milestone="v0.17.0" %}

# Migrate `learning` package to blocks/layout

Re-migrate recipe + howto from the SPEC-079 zones model
(`WORK-308` plus this branch's recipe/howto work) to the
{% ref "SPEC-080" /%} blocks/layout model. These runes already build
`content` + `media` trees and nest the metadata def-list via `zoneHost` /
`zoneHostPlacement`, so they map almost directly.

## Acceptance Criteria

- [x] **recipe + howto configs use `blocks` + `layout`.** Remove `zones`,
  `zoneLayouts`, `zoneHost`, `zoneHostPlacement`.
- [x] **Metadata placement via `layout`.** The def-list-above-preamble
  ordering (recipe + howto) is expressed as block order in the `content`
  container's `layout` list — replacing `zoneHostPlacement: 'before'`.
- [x] **No visual change.** Steps / ingredients / tools rendering and the
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

## Resolution

Completed: 2026-06-02

Branch: claude/spec-079-implementation

### What was done
- Migrated recipe + howto from zones/zoneLayouts/zoneHost/zoneHostPlacement to blocks/layout. Config-only — both transforms already build a content wrapper with a preamble header, so no transform changes.
- Each: blocks.metadata (definition-list) + layout { content: ['metadata','preamble'] } — metadata nests in the content column above the header (replacing zoneHostPlacement:'before'); recipe's root stays [media, content] as the transform emits it (no root key needed).

### Notes
- No visual change: the metadata fields render identically under intrinsic shape (difficulty category+sentiment -> chip; prep/cook/serves temporal/quantity -> bare) — same as the old sentiment-based def-list.
- recipe/howto carry no structure-contract entries that model zones/blocks, so no contract regen. Full suite green (3079).

{% /work %}
