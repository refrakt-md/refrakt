{% work id="WORK-667" status="ready" priority="medium" complexity="simple" source="SPEC-161" tags="transform, metadata, layout, blocks, skeleton, lumina" milestone="v0.44.0" %}

# A stack layout for blocks

A `blocks` entry renders through `bar` (a row) or `definition-list` (a label/value grid).
Neither draws a byline, a lead value with secondary values beneath, which `testimonial` and
`cast` each hand-roll in their CSS ({% ref "SPEC-161" /%} D6).

## Acceptance Criteria

- [ ] `LayoutPrimitive` gains `stack`; a block in it renders its fields in a column as `data-zone-layout="stack"`, with the first field marked `data-lead`
- [ ] Skeleton and Lumina style the lead as emphasised and the rest, by `:not([data-lead])`, as smaller and muted
- [ ] Nothing in the layout sets or reads `data-meta-rank`, so a compact container does not hide the non-lead values ({% ref "BUG-023" /%})
- [ ] The theme-authoring docs list `stack` beside `bar` and `definition-list`
- [ ] The CSS coverage test passes and contracts are regenerated on both copies

## References

- {% ref "SPEC-161" /%}: D6.

{% /work %}
