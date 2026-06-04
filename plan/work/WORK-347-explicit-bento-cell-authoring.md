{% work id="WORK-347" status="draft" priority="medium" complexity="moderate" source="SPEC-085" milestone="v0.19.0" tags="bento,marketing,authoring" %}

# Explicit bento-cell authoring

Make `{% bento-cell %}` a first-class authoring path for full per-tile control
(the dashboard use case), alongside the existing heading sugar. Today the
`bento-cell` tag is registered but `convertHeadings` would swallow a hand-authored
cell into the preceding heading's content, so explicit authoring doesn't actually
work.

## Acceptance Criteria
- [ ] A `bento` whose children include `{% bento-cell %}` tags uses them directly as cells, **short-circuiting** heading conversion (no mixing within one grid — out of scope by decision).
- [ ] An explicit cell accepts `size`, `span`, `media-position`, `href`, and a `---`-split media zone (the SPEC-085 / WORK-345 contract).
- [ ] When no explicit cells are present, heading sugar behaves exactly as today.
- [ ] A grid that mixes headings and explicit cells is handled deterministically (explicit cells win / headings ignored) and documented; it is not a supported authoring pattern.
- [ ] Tests cover: an all-explicit grid, an all-heading grid (unchanged), and the mixed-input fallback behavior.

## Approach
In `bento`'s `processChildren` / transform, detect explicit `bento-cell` tag nodes
up front; if any exist, bypass `convertHeadings` and pass the cells through.
Otherwise run the existing heading conversion. Keep the cell transform identical
for both paths so structure is uniform.

## References
- `plugins/marketing/src/tags/bento.ts` (convertHeadings, bento transform), `plugins/marketing/src/index.ts` (bento-cell registration)
- Substrate {% ref "SPEC-085" /%}; cell zones {% ref "WORK-345" /%}

{% /work %}
