{% work id="WORK-346" status="ready" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,docs" %}

# Rune compositions docs category

The composability investigation surfaced ~25 meaningful rune combinations — far
more than fit in the authoring guide. Create a dedicated **"Compositions"** docs
category, **page-per-pattern**: each page shows the Markdown you write, the
rendered result (via `preview`), and a one-liner on which zone/mechanism makes it
work. Start with **Family A** (a visual rune in a container's media zone), the
set being made first-class this milestone.

## Family A — first batch (visual guest in a media zone)
- map in card media → location card
- chart in card media → metric card
- chart in bento cell → dashboard tile ({% ref "WORK-345" /%})
- gallery in feature/card media → visual feature
- diagram in card/feature media → architecture card
- embed in card media → video / Spotify card
- codegroup in card media → code-sample card
- audio / playlist in card → release card
- swatch / palette / typography / spacing in card → design-token card
- timeline in feature → roadmap feature

### Bento signature compositions (SPEC-085)
- showcase bleed in a bento cell → screenshot/mockup peeking out of a tile
- tinted bento cells → multi-coloured grid (per-cell `tint` / `tint-mode`)
- phone `mockup` in a tall bento tile → centered + auto-scaled out of the box (uniform row tracks + the media-zone container context); `showcase` variant for the capped-at-bottom bleed. Verify mobile collapse keeps it centered with side margins.

## Acceptance Criteria
- [ ] A new "Compositions" category exists under `site/content/` with its own index/landing page explaining the media-zone model (containers adapt the slot; guests are open).
- [ ] Each Family A pattern is its own page: authored Markdown + rendered `preview` + the mechanism note.
- [ ] Only patterns that are actually styled/verified ({% ref "WORK-339" /%}, {% ref "WORK-345" /%}) ship as Family A pages; un-verified families (B/C/D/E) are scaffolded or deferred, not documented as working before they are.
- [ ] The category is linked from the docs nav and cross-referenced from the rune-authoring composability guide ({% ref "WORK-338" /%}).

## Approach
Author as standard site content with the `preview` rune for live results. Keep one
pattern per page so the catalog grows incrementally as later families become
first-class. Family A pages depend on the media-zone work landing first.

## References
- Catalog source: the composability investigation (this milestone's discussion)
- `site/content/` structure; `preview` rune
- Mechanisms: {% ref "WORK-339" /%}, {% ref "WORK-345" /%}; contract {% ref "SPEC-084" /%}

{% /work %}
