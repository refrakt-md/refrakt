---
'@refrakt-md/media': minor
'@refrakt-md/transform': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/lumina': minor
'@refrakt-md/behaviors': patch
---

`track` declares its artist, running time and date as `metaFields` with a `details` block, so the engine renders them instead of the rune building spans (SPEC-156 D7). The row form is unchanged in Lumina, and a new `meta="byline"` sets the details beneath the track's name. It is a `variants` entry, which a theme can restyle. `playlist` takes `meta` too, for every track it lists.

A playlist's list-form tracks are now `track` items, rendered through the same config as a nested `{% track %}`, so the two forms produce the same markup. A playlist's tracks are rows of its listing, so they are `flush` rather than cards. A nested track also shows the playlist's artist, as a list item always did. Chapters and lyrics in a list-form track now take the track's cue-point styling.

The engine gains a `clock` meta-field transform (`3:36`, `1:02:03`). `bar` and `lead` block values now carry `data-field`, as definition-list rows do.

**For theme authors:** `rf-track__track-artist`, `rf-track__track-duration` and `rf-track__track-meta` are gone. Style `.rf-track__details > [data-field="artist" | "duration" | "date"]`, and the byline under `.rf-track[data-meta="byline"]`. Playlist list items now carry `rf-track`. The JSON-LD is unchanged. In the RDFa, a list item's `byArtist` and `datePublished` now ride hidden metas, as a nested track's always did.
