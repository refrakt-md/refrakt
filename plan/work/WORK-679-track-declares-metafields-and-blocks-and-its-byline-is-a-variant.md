{% work id="WORK-679" status="in-progress" priority="low" complexity="moderate" source="SPEC-156" tags="runes, media, track, metadata, blocks, variants, skeleton" milestone="v0.45.0" %}

# Track declares metaFields and blocks, and its byline is a variant

`Track`'s config is `{ block, parent, defaultElevation, editHints }`. Its artist, duration and date
are hand-built spans, and `track.css` hand-writes the row and the duration's push to the end. The
byline form (name above, artist, year and duration beneath) needs no new mechanism, only
adoption ({% ref "SPEC-156" /%} D7).

## Acceptance Criteria

- [x] `Track` declares `metaFields` for its artist, duration and date, and a `blocks` entry rendering them as a `bar`, with the duration `align: 'end'`
- [x] The byline form is a `variants` entry over `layout` ({% ref "SPEC-091" /%}), selectable by a theme
- [x] `track.css`'s hand-written `margin-left: auto` and row flex are deleted in skeleton, and the default row renders unchanged in the gallery
- [x] The playlist's JSON-LD is unchanged, checked with `npm run seo:baseline:check`
- [x] Contracts are regenerated on both copies and the diff reviewed

## References

- {% ref "SPEC-156" /%}: D7, and the variants section.
- {% ref "SPEC-155" /%}: the media audit.

{% /work %}
