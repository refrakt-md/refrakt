{% work id="WORK-345" status="draft" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,marketing,bento,lumina" %}

# Bento cell media zone via explicit split

Bento cells have no media zone — `bento-cell`'s transform only recognizes an
`icon` paragraph as the cell's visual and dumps everything else into one
undifferentiated `body` div (`plugins/marketing/src/tags/bento.ts`). So a
`chart`/`map`/`gallery` in a cell has no structural home and no sizing contract.
Give the cell a real media zone that **mirrors `card`**: an explicit `---` splits
a cell into `[media] / body`, so the same media-zone selector ({% ref "WORK-339" /%})
styles guests in bento and card alike.

## Acceptance Criteria
- [ ] A `bento-cell`'s content splits on a top-level `---` into a `media` zone (`data-section="media"`) and a body, matching the `card` convention.
- [ ] A visual rune (chart/map/gallery/diagram/embed/sandbox) in the media zone is picked up by the WORK-339 media-zone selector and sized to the cell.
- [ ] Media layout is **size-aware**: `full`/`large` cells show media prominently; `small` cells degrade gracefully (compact or media-below-body) rather than overflowing.
- [ ] The existing icon-as-visual path still works; the docstring's promised image/emoji-as-visual is reconciled with the code (either implemented or the doc corrected).
- [ ] Cells authored without a `---` are unchanged (back-compat).
- [ ] Tests cover: a cell with a `---` media split, a media guest sized per cell size, and a legacy `---`-less cell.

## Approach
Because cells are generated from headings (`convertHeadings`), the `---` lands
inside a heading's content run and is available to `bentoCell`'s transform. Split
`bodyNodes` on the top-level `thematicBreak`, label the first part `media`
(`data-section="media"`), keep the rest as body. Reuse `card`'s split logic where
possible. Size-awareness is CSS keyed off the cell's existing `size` data
attribute.

## References
- `plugins/marketing/src/tags/bento.ts` (bentoCell transform, convertHeadings), `plugins/marketing/src/config.ts` (BentoCell)
- `card` media split for reference; media-zone selector from {% ref "WORK-339" /%}
- Contract: {% ref "SPEC-084" /%}

{% /work %}
