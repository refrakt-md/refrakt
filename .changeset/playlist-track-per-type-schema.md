---
"@refrakt-md/media": minor
"@refrakt-md/runes": minor
"@refrakt-md/cli": patch
---

Per-type schema for `playlist` and `track` — BUG-013 (WORK-569, SPEC-130)

Both runes declared an enum of kinds and then published one type for all of
them. `{% playlist type="podcast" %}` announced a podcast as a `MusicPlaylist`
whose episodes were `MusicRecording`s, and `{% track type="episode" %}` did the
same on its own. Each rune already knew what its content was and emitted the
wrong schema anyway.

Each now keys off the attribute its author already set, with its own table —
neither rune declares anything about the other:

| `playlist type` | now publishes                                   |
|-----------------|-------------------------------------------------|
| `album`         | `MusicAlbum` with `track` (was `MusicPlaylist`)  |
| `mix`           | `MusicPlaylist` with `track` — unchanged         |
| `podcast`       | `PodcastSeries` with `hasPart` `PodcastEpisode`s |
| `audiobook`     | `Audiobook` with `hasPart` `Chapter`s            |
| `series`        | `CreativeWorkSeries` with `hasPart` `CreativeWork`s |

`track`'s five kinds map to `MusicRecording`, `PodcastEpisode`, `Chapter`,
`CreativeWork` and `VideoObject`.

**A child row carries a property map, not just a type.** Retyping an item and
leaving its stamps would put `byArtist` on a `PodcastEpisode`, which does not
have that property — worse than the `MusicRecording` it replaced, which was at
least coherently wrong. A parent that retypes a child now owns that child's
mapping, and anything it does not name is dropped. A type the *author* stated is
the exception and survives: a `{% track type="song" %}` inside a podcast stays a
song, with its own properties.

**Breaking for consumers of this data.** Four of the five playlist kinds change
type, three of them change the property holding their items from `track` to
`hasPart`, and `byArtist` no longer appears on non-music items or on a
`PodcastSeries`. `track`/`hasPart` are also declared lists now, so a one-item
playlist emits an array rather than a bare object.

Also in this change: `refrakt inspect` audits a `children:` row against the
children rather than against the parent, and accepts a stamped property as
evidence that a source resolved — without which every property the applier
rebuilds from the field bag reported as broken, since the identity transform
consumes the bag before the audit reads the tree.
