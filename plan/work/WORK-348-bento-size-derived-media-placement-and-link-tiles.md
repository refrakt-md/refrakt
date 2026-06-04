{% work id="WORK-348" status="draft" priority="medium" complexity="moderate" source="SPEC-085" milestone="v0.19.0" tags="bento,marketing,lumina" %}

# Bento size-derived media placement and link tiles

Complete the bento foundation: per-cell media placement with sensible defaults,
and clickable tiles for dashboards. Builds on the cell zone contract
({% ref "WORK-345" /%}).

## Acceptance Criteria
- [ ] `media-position` is author-controllable per cell (`top | bottom | start | end`; start/end place media beside the body on wide cells), driving `data-media-position`.
- [ ] The default `media-position` is **derived from cell size**: small cells stack media on top; large/full cells place it prominently / beside. Explicit attribute overrides.
- [ ] An optional `href` makes a whole cell a link (mirrors `card`), with correct focus/hover affordances and accessible markup.
- [ ] CSS keys placement off `data-media-position` + the cell `size` data attribute, reusing the shared split rules where possible.
- [ ] Tests / examples cover each placement value and a link tile; a dashboard example and a marketing example both render (compositions docs).

## Approach
Add the `media-position` and `href` attributes to the cell schema; emit
`data-media-position` (size-derived default) and the link wrapper on the cell
root. Lean on the existing `split.css` / card media rules so bento and card share
placement behavior.

## References
- `plugins/marketing/src/tags/bento.ts`, `plugins/marketing/src/config.ts`
- `card` `href` + `data-media-position`; `split.css`
- Substrate {% ref "SPEC-085" /%}; cell zones {% ref "WORK-345" /%}

{% /work %}
