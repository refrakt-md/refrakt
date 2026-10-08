{% bug id="BUG-033" status="reported" severity="minor" source="SPEC-130" tags="seo,schema,media" %}

# playlist and track publish byArtist and duration on types that do not define them

Found by {% ref "WORK-628" /%}, which ran `@adobe/structured-data-validator` over the SEO
baseline. These are the only schema.org-layer findings on today's baseline, and every one
of them is real. The baseline never recorded them as defects: SPEC-130 D5 leaves a schema
row to the reviewer, and the rows that carry these properties say in their own comments that
nothing checks them.

## Steps to Reproduce

1. `node scripts/sd-validator-spike.mjs` (see the script header for the scratch install)
2. Read the `[schema.org]` warnings

## Expected

Every property a row publishes is one schema.org defines for that row's type (its
`domainIncludes`, inherited properties included).

## Actual

Checked against schema.org 30.1:

- **`byArtist` on `MusicPlaylist`.** `playlist type="mix"` uses `musicRow('MusicPlaylist')`,
  whose container map carries `artist: 'byArtist'`. `byArtist`'s domain is `MusicAlbum` and
  `MusicRecording` only. The `album` row is fine because it is a `MusicAlbum`. Fixture
  `playlist.mix`, which the baseline treats as the control row.
- **`duration` on `Chapter`.** `playlist type="audiobook"`'s items (`SPOKEN_ITEM`) and
  `track type="chapter"` (`trackCommon`). Fixtures `playlist.audiobook` and `track.chapter`.
- **`duration` on `CreativeWork`.** `playlist type="series"`'s items and `track type="talk"`.
  Fixtures `playlist.series` and `track.talk`.

`duration`'s domain is `Audiobook`, `Episode`, `Event`, `MediaObject`, `Movie`,
`MusicRecording`, `MusicRelease`, `QuantitativeValueDistribution`, `Schedule` and
`ServicePeriod`. `PodcastEpisode` (an `Episode`) and `VideoObject` (a `MediaObject`) are
fine. Both tables already reason this way about `byArtist` (`plugins/media/src/tags/track.ts`,
`playlist.ts`), but the same reasoning was not applied to `duration` or to the mix row.

The same run shows a value defect the validator does not catch, because it does not check
ranges. `track-meta` lands on `datePublished` as `"March 2025"`, which is not an ISO 8601
date (`playlist.podcast`). Fix it here or split it out, but don't lose it.

## Environment

- `@refrakt-md/media` at main, 2026-10-08
- schema.org vocabulary 30.1

{% /bug %}
