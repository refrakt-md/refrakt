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

## Two emitters — independent, not shared

**Corrected.** An earlier revision of this bug said a fix "has to reach both, or
a podcast's inline items become `PodcastEpisode` while its `{% track %}`
children stay `MusicRecording`". That reasoning assumed a `{% track %}` inside a
`{% playlist %}` is one of its tracks. It is not — it renders in the body zone
and publishes a detached entity ({% ref "BUG-016" /%}), so the mix it warns
about cannot occur.

`MusicRecording` is stamped in two places — playlist's own `<li>` items
(`playlist.ts:153`) and the standalone `track` rune (`track.ts:96`) — but they
never populate the same collection, so nothing has to be kept in step.

What they *do* share is this defect. `track` has its own five-value enum —
`song | episode | chapter | talk | video` (`track.ts:15`) — and emits
`MusicRecording` for all five, exactly as `playlist` ignores its own `type`:

```markdoc
{% track type="episode" artist="Acme" duration="42:30" %}
## Episode Two
{% /track %}
```
```json
{ "@type": "MusicRecording", "name": "Episode Two" }
```

So this bug is two runes each ignoring the type its author declared, fixed the
same way in each: a `by: 'type'` table over its own attribute. See
{% ref "SPEC-130" /%} D9.

## Acceptance Criteria
- [ ] Each `type` emits the schema.org type in the table above
- [ ] Item types follow — a podcast's episodes are not `MusicRecording`
- [ ] The track collection uses the property the emitted type actually defines (`track` vs `hasPart`)
- [ ] The standalone `track` rune honours its own `type` too — `type="episode"` is not a `MusicRecording`
- [ ] `type="album"` narrows to `MusicAlbum` rather than staying generic
- [ ] A test asserts the JSON-LD per type, for both runes, not just the HTML attributes
- [ ] Each rune's mapping is stated once, on the rune, keyed off the attribute the author already set

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

- {% ref "SPEC-130" /%} — the declarative mapping this motivates; D9 settles the two-emitter question
- {% ref "BUG-016" /%} — why the two emitters are independent
- {% ref "WORK-552" /%} — `schema="none"`, the suppression half of the same story

{% /bug %}
