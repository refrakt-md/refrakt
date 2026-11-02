{% work id="WORK-679" status="done" priority="low" complexity="moderate" source="SPEC-156" tags="runes, media, track, metadata, blocks, variants, skeleton" milestone="v0.45.0" pr="refrakt-md/refrakt#751" %}

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

## Resolution

Completed: 2026-11-02

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `plugins/media/src/config.ts`: `Track` gains modifiers `meta` (row|byline), `artist`, `duration` and `date`. It declares `metaFields` (duration through `clock`) and a `details` bar block with the duration `align: 'end'`. Layout is `ordinal`, `track-name`, `details`; `variants.meta.byline` adds a `heading` wrapper and reorders the fields.
- `tags/track.ts`: the hand-built spans are gone. A `meta` attribute is added, and the `date` property feeds `datePublished`.
- `tags/playlist.ts`: list-form tracks are `data-rune="track"` items with a field bag and hidden schema metas. The child rows are keyed `artist`/`date`, and a `meta` attribute is added. `adoptNestedTrack` sets `elevation: flush` and passes the playlist's `artist` and `meta` into the bag.
- `packages/transform`: a `clock` NamedTransform. `bar`/`lead` values carry `data-field`.
- Skeleton and Lumina `track.css`/`playlist.css` are retargeted to the details block. Skeleton's duration `margin-left: auto` is removed. Chapters and lyrics wrap.
- `behaviors/audio.ts` reads `[data-field="artist"]`.
- Docs: byline examples on the playlist and track pages; `data-field` in theme-authoring `blocks-and-layout.md`.
- Regenerated: contracts (both copies), `rune-attributes.json`, the SEO baseline.

### Decisions (with the user, 2026-11-02)
- Durations get a new `clock` format, so the visible "3:36" is kept.
- Fields are renamed artist/duration/date. Bar values name their field with `data-field` (the definition-list convention) rather than a BEM class per field.
- List-form tracks emit the same DOM as `{% track %}`, through Track's config.
- The byline is selected by a new `meta` attribute on track and playlist.

### Notes
- JSON-LD is identical for every fixture. In the RDFa, a list item's `byArtist`/`datePublished` now ride metas.
- Visual review: before and after builds, light and dark, desktop and phone. The row form is pixel-identical apart from these intended changes:
  - playlist tracks are flush, and a nested track shows the playlist artist;
  - the chapters example is now well formed;
  - dates use tabular numerals (`temporal`).
- Meta fields read declared modifiers, so a track root now carries `data-artist`/`data-duration`/`data-date`, as playlist's `artist` already did.

{% /work %}
