{% work id="WORK-569" status="ready" priority="high" complexity="complex" source="SPEC-130" tags="runes,media,schema-org,seo" milestone="v0.35.0" %}

# playlist — per-type schema, per-type children, and the two emitters

The driving case. `playlist` exercises `by:` row selection, per-type `children:`
mappings and inline property stamps at once, and fixes {% ref "BUG-013" /%} in
the process.

It also carries the one design question {% ref "SPEC-130" /%} said it must
answer and did not.

## The defect

```ts
type: { matches: ['album', 'podcast', 'audiobook', 'series', 'mix'] }  // line 28
…
schemaOrgType: 'MusicPlaylist'                                          // line 237, unconditional
const trackAttrs = { typeof: 'MusicRecording' };                        // line 153, unconditional
```

So `{% playlist type="podcast" %}` publishes a podcast as a music playlist whose
episodes are music recordings. The rune **already declares what its content is**
and emits the wrong schema anyway.

| `type` | schema.org | Items | Track property | Relation to `MusicPlaylist` |
|--------|-----------|-------|----------------|------------------------------|
| `album` | `MusicAlbum` | `MusicRecording` | `track` | **subtype** — safe narrowing |
| `mix` | `MusicPlaylist` | `MusicRecording` | `track` | today's emitted type, for every row |
| `podcast` | `PodcastSeries` | `PodcastEpisode` | `hasPart` | **branch switch** |
| `audiobook` | `Audiobook` | `Chapter` | `hasPart` | **branch switch** |
| `series` | `CreativeWorkSeries` | `CreativeWork` | `hasPart` | **branch switch** |

Even the default is imprecise: the attribute defaults to `album`
(`attrs.type ?? 'album'`, line 98), and `MusicAlbum` — a subtype of
`MusicPlaylist` — has been available and unused the whole time.

## A child row is a type *and* a property map

`children: { track: 'PodcastEpisode' }` changes the item's `@type` and nothing
else, and the item's properties are stamped inline as `MusicRecording`
properties. Today's output for `type="podcast"`:

```json
{ "@type": "MusicPlaylist", "name": "The Sunday Show", "byArtist": "Acme",
  "track": [ { "@type": "MusicRecording", "name": "Episode One",
               "byArtist": "Acme", "duration": "PT1800S" } ] }
```

Retyping the item alone leaves `byArtist` on a `PodcastEpisode`, which does not
have that property — worse than `MusicRecording`, which at least was coherently
wrong. So:

```ts
podcast: {
  type: 'PodcastSeries',
  properties: { track: 'hasPart' },
  children: {
    track: {
      type: 'PodcastEpisode',
      properties: { 'track-name': 'name', 'track-duration': 'duration' },
      // `track-artist` is dropped: PodcastSeries carries the publisher, not the item
    },
  },
}
```

## The open question this item has to close

**`MusicRecording` is stamped in two places**: `playlist`'s own `<li>` items
(line 153) and the standalone `track` rune. A per-type child mapping has to
reach both, or a podcast's inline items become `PodcastEpisode` while
`{% track %}` children stay `MusicRecording` on the same page.

{% ref "SPEC-130" /%} names this as a question it "must answer, not gloss" — and
then does not. None of D1–D8 resolves it. It is the same question as contextual
schema (`contextProperties: { 'parent-rune': … }`), because a `{% track %}`
inside a podcast is exactly "a child rune declares what it means inside a given
parent".

Two honest options, and this item picks one:

1. **Include `contextProperties`** — the child declares its type per parent
   rune, mirroring the existing `contextModifiers`. More mechanism, and it
   generalises.
2. **Narrow the criterion to transform-built children** — `playlist`'s inline
   `<li>`s get per-type mappings; `{% track %}` keeps one type; the divergence
   is documented as a known limitation and filed.

Option 2 is defensible and cheaper. What is **not** acceptable is shipping the
per-type table without deciding, because that produces a page where two
adjacent tracks carry different types for no reason an author can see.

## Acceptance Criteria

- [ ] `playlist` declares a `by: 'type'` table with rows for all five values, and an explicit fallback row for the absent case matching the attribute's own `album` default
- [ ] A child row carries its own property map, not just a type name
- [ ] `{% playlist type="podcast" %}` publishes `PodcastSeries` / `hasPart` / `PodcastEpisode`, resolving {% ref "BUG-013" /%}
- [ ] `byArtist` does not survive onto a `PodcastEpisode` — properties that do not belong to the child's type are dropped, not carried
- [ ] `album` narrows to `MusicAlbum`, so the default stops being imprecise
- [ ] The two-emitter question is **closed in writing** — either `contextProperties` ships, or the limitation is documented and filed with a reason
- [ ] The inline track spans resolve by their existing `data-name`s (`track-name`, `track-artist`, `track-duration`) — `playlist` needs no new names
- [ ] `playlist`'s image source resolves through the name {% ref "WORK-561" /%} gave it
- [ ] Every row is reviewed through `refrakt inspect`'s resolved-table view, per {% ref "WORK-566" /%}
- [ ] The diff against {% ref "WORK-562" /%}'s baseline shows exactly the intended change per `type` value — `mix` unchanged, the other four changed

## Approach

**Do `playlist` first among Group C.** It is the rune that needs the least prep —
its inline spans are already addressable — and it exercises `by:`, `children:`
and inline stamps together, so a shape problem in the mechanism surfaces here
rather than after four more runes have been converted against it.

The curation is a human judgement recorded in config, and nothing checks it:
refrakt ships no schema.org ontology (D5). `Chapter` for an `Audiobook` and
`CreativeWork` for a `CreativeWorkSeries` are the two rows worth a second
opinion before they ship — review them in `inspect`'s resolved view, which is
what that view is for.

## Blocked by

- {% ref "WORK-561" /%}
- {% ref "WORK-565" /%}
- {% ref "WORK-566" /%}

## References

- {% ref "SPEC-130" /%} — "The driving case: playlist", "Two emitters, one mapping", D3, D5
- {% ref "BUG-013" /%} — the mistyped playlists this resolves
- `plugins/media/src/tags/playlist.ts:28,98,153,237` — the enum, the default, the item type, the unconditional parent type

{% /work %}
