{% work id="WORK-667" status="done" priority="medium" complexity="simple" source="SPEC-161" tags="transform, metadata, layout, blocks, skeleton, lumina" milestone="v0.44.0" pr="refrakt-md/refrakt#729" %}

# A lead layout for blocks

A `blocks` entry renders through `bar` (a row) or `definition-list` (a label/value grid).
Neither draws a byline, a lead value with secondary values beneath, which `testimonial` and
`cast` each hand-roll in their CSS ({% ref "SPEC-161" /%} D6).

## Acceptance Criteria

- [x] `LayoutPrimitive` gains `lead`; a block in it renders its fields in a column as `data-zone-layout="lead"`, with the first field marked `data-lead`
- [x] Skeleton and Lumina style the lead as emphasised and the rest, by `:not([data-lead])`, as smaller and muted
- [x] Nothing in the layout sets or reads `data-meta-rank`, so a compact container does not hide the non-lead values ({% ref "BUG-023" /%})
- [x] The theme-authoring docs list `lead` beside `bar` and `definition-list`
- [x] The CSS coverage test passes and contracts are regenerated on both copies

## References

- {% ref "SPEC-161" /%}: D6.

## Resolution

Completed: 2026-10-29

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/transform/src/types.ts`: `LayoutPrimitive` gains `lead`; `BlockDef.layout` is typed as `LayoutPrimitive`.
- `packages/transform/src/engine.ts`: `renderLeadLayout` — fields in their intrinsic shape, `data-zone-layout="lead"`, first present field marked `data-lead`.
- `packages/skeleton/styles/dimensions/metadata.css`: column layout. `packages/lumina/styles/dimensions/metadata.css`: lead emphasised, `:not([data-lead])` smaller and muted.
- Tests in `packages/transform/test/engine-blocks.test.ts`, including that no `data-meta-rank` is emitted.
- `site/content/extend/theme-authoring/blocks-and-layout.md` documents `lead`.

### Notes
- No rune uses `lead` yet (WORK-668's testimonial will), so contracts regenerate unchanged.

{% /work %}
