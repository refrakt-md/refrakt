{% bug id="BUG-013" status="confirmed" severity="minor" tags="runes,media,schema-org,seo" %}

# A podcast playlist is published as a music playlist

`playlist` accepts `type="album | podcast | audiobook | series | mix"` and emits
`MusicPlaylist` for all five, with every item typed `MusicRecording`.

So a podcast is published as a music playlist whose episodes are music
recordings, and an audiobook as one whose chapters are songs. The rune already
knows better — the author told it.

## Expected

The schema type follows the `type` the author declared:

| `type` | schema.org | Items | Track property |
|--------|-----------|-------|----------------|
| `album` | `MusicAlbum` | `MusicRecording` | `track` |
| `mix` | `MusicPlaylist` | `MusicRecording` | `track` |
| `podcast` | `PodcastSeries` | `PodcastEpisode` | `hasPart` |
| `audiobook` | `Audiobook` | `Chapter` | `hasPart` |
| `series` | `CreativeWorkSeries` | `CreativeWork` | `hasPart` |

## Actual

`MusicPlaylist` with `MusicRecording` items, for every value of `type`.

```ts
// plugins/media/src/tags/playlist.ts
const playlistTypeValue = (attrs.type as string) ?? 'album';   // 98  — read
const trackAttrs = { typeof: 'MusicRecording' };               // 153 — ignored
schemaOrgType: 'MusicPlaylist'                                 // 237 — ignored
```

`type` reaches the meta tag and the BEM modifier. It never reaches the schema.

## Steps to reproduce

```markdoc
{% playlist type="podcast" %}
# The Sunday Show

- Episode 1
- Episode 2
{% /playlist %}
```

The page's JSON-LD carries `"@type": "MusicPlaylist"` with `MusicRecording`
tracks.

## Why this is `minor` rather than `major`

It is wrong, but it is wrong *quietly* and only for non-`album` playlists, of
which refrakt's own site has none. No page is broken and nothing is invalid —
`MusicPlaylist` is a real type with real properties, just not this content's.
The cost is search engines being told something false about a podcast.

## Note on the default

Even `type="album"` is imprecise. `MusicAlbum` is a **subtype** of
`MusicPlaylist`, so narrowing is safe — `track` and `byArtist` are inherited —
and the more specific type is simply left on the table.

## Two emitters

`MusicRecording` is stamped in two places: playlist's own `<li>` items
(line 153) and the standalone `track` rune (`track.ts:96`). A fix has to reach
both, or a podcast's inline items become `PodcastEpisode` while its
`{% track %}` children stay `MusicRecording` — a mix that is worse than the
current consistent wrongness.

## Acceptance Criteria
- [ ] Each `type` emits the schema.org type in the table above
- [ ] Item types follow — a podcast's episodes are not `MusicRecording`
- [ ] The track collection uses the property the emitted type actually defines (`track` vs `hasPart`)
- [ ] Inline `<li>` items and `{% track %}` children agree, rather than one following the mapping and the other not
- [ ] `type="album"` narrows to `MusicAlbum` rather than staying generic
- [ ] A test asserts the JSON-LD per type, not just the HTML attributes
- [ ] The mapping is stated in one place, not repeated between the two emitters

## Approach

**This is {% ref "SPEC-130" /%}'s driving example**, and fixing it imperatively
first is reasonable: the mapping is five rows, and writing them into the
transform now makes the config-shaped version a mechanical move later rather
than a design exercise.

Resist adding a `schema` attribute here. `type` already carries the fact; a
second attribute would let an author state it twice and disagree with
themselves. See SPEC-130's derive / override / suppress layering.

**The mappings are curated, not derived.** Nothing validates that
`PodcastEpisode` belongs under `PodcastSeries`; refrakt ships no schema.org
ontology. Five rows is small enough to review by hand, which is the point at
which that trade is still the right one.

## References

- {% ref "SPEC-130" /%} — the declarative mapping this motivates
- {% ref "WORK-552" /%} — `schema="none"`, the suppression half of the same story

{% /bug %}
