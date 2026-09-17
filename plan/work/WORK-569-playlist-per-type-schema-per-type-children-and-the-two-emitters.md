{% work id="WORK-569" status="done" priority="high" complexity="complex" source="SPEC-130" tags="runes,media,schema-org,seo" milestone="v0.35.0" pr="refrakt-md/refrakt#612" %}

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

## The two emitters — settled as D9

{% ref "SPEC-130" /%} left this open, calling it a question it "must answer, not
gloss", and none of D1–D8 resolved it: `MusicRecording` is stamped both by
`playlist`'s own `<li>` items and by the standalone `track` rune, so does a
per-type child mapping have to reach both?

**Settled in D9, measured against the built packages. The premise was false.**
The two emitters never populate the same collection — `playlist` builds its
items exclusively from markdown-list `itemModel` data, and a `{% track %}`
inside a `{% playlist %}` is not one of its tracks at all
({% ref "BUG-016" /%}). So there is nothing to keep in step, and
`contextProperties` is not needed.

Each rune keys off the attribute its author already set:

| Rune | `by:` | Rows |
|------|-------|------|
| `playlist` | its `type` | album, mix, podcast, audiobook, series — plus the child mapping for its transform-built items |
| `track` | its `type` | song, episode, chapter, talk, video |

**So `track` is in scope here too.** It carries its own five-value enum
(`track.ts:15`) and emits `MusicRecording` for all five — the same defect as
`playlist`, in a second rune, and part of {% ref "BUG-013" /%}. Converting it
here rather than leaving it in Group B keeps the pair coherent and the review in
one place.

{% ref "BUG-016" /%} is **not** this item's to fix — it is a content-model
defect, and {% ref "WORK-572" /%} lands it first. What that costs this item is
one widening: `playlist`'s `children:` mapping must match tag-built children as
well as transform-built ones, so the table covers the whole track population
rather than half of it. Still nothing declared on the child.

That ordering is deliberate. A `children:` mapping written while `{% track %}`
children are not yet children would be revised the moment {% ref "WORK-572" /%}
ships.

## Acceptance Criteria

- [x] `playlist` declares a `by: 'type'` table with rows for all five values, and an explicit fallback row for the absent case matching the attribute's own `album` default
- [x] A child row carries its own property map, not just a type name
- [x] `{% playlist type="podcast" %}` publishes `PodcastSeries` / `hasPart` / `PodcastEpisode`, resolving {% ref "BUG-013" /%}
- [x] `byArtist` does not survive onto a `PodcastEpisode` — properties that do not belong to the child's type are dropped, not carried
- [x] `album` narrows to `MusicAlbum`, so the default stops being imprecise
- [x] The standalone `track` rune gains its own `by: 'type'` table over `song | episode | chapter | talk | video`, so `{% track type="episode" %}` stops emitting `MusicRecording`
- [x] No context mechanism is added — neither rune declares anything about the other (D9)
- [x] The `children:` mapping reaches tag-built children as well as transform-built ones, so a `{% track %}` child and a list item get the same row
- [x] The declarative table replaces {% ref "WORK-572" /%}'s imperative stamping on both shapes — not one migrated and one left behind
- [x] A nested track with no explicit `type` still matches its list-item equivalent after the table replaces the imperative form
- [x] The inline track spans resolve by their existing `data-name`s (`track-name`, `track-artist`, `track-duration`) — `playlist` needs no new names
- [x] `playlist`'s image source resolves through the name {% ref "WORK-561" /%} gave it
- [x] Every row is reviewed through `refrakt inspect`'s resolved-table view, per {% ref "WORK-566" /%}
- [x] The diff against {% ref "WORK-562" /%}'s baseline shows exactly the intended change per `type` value — `mix` unchanged, the other four changed

## Approach

**Do `playlist` first among Group C.** It is the rune that needs the least prep —
its inline spans are already addressable — and it exercises `by:`, `children:`
and inline stamps together, so a shape problem in the mechanism surfaces here
rather than after four more runes have been converted against it.

The curation is a human judgement recorded in config, and nothing checks it:
refrakt ships no schema.org ontology (D5). `Chapter` for an `Audiobook` and
`CreativeWork` for a `CreativeWorkSeries` are the two rows worth a second
opinion before they ship — review them in `inspect`'s resolved view, which is
what that view is for. `track`'s `talk` row needs the same attention: there is
no obvious schema.org type for it, and `CreativeWork` may be the honest answer.

**Check the pair's output on one page.** With two independent tables, the
failure mode D9 rules out by construction is still worth asserting once: a page
carrying both a `{% playlist type="podcast" %}` and a standalone
`{% track type="episode" %}` should emit a `PodcastSeries` with
`PodcastEpisode` parts *and* a separate `PodcastEpisode`, each correct on its
own terms.

## Blocked by

- {% ref "WORK-561" /%}
- {% ref "WORK-565" /%}
- {% ref "WORK-566" /%}
- {% ref "WORK-572" /%}

## References

- {% ref "SPEC-130" /%} — "The driving case: playlist", D3, D5, and **D9** which settles the two emitters
- {% ref "BUG-013" /%} — the mistyped playlists *and* tracks this resolves
- {% ref "BUG-016" /%} / {% ref "WORK-572" /%} — land first; they are why the `children:` matcher has to be wider
- **`position`** — {% ref "WORK-572" /%} notes nested tracks could take `position: 'index'`, which list items lack entirely. Decide here, where the one generator lives
- `plugins/media/src/tags/playlist.ts:28,98,153,237` — the enum, the default, the item type, the unconditional parent type
- `plugins/media/src/tags/track.ts:15,96` — `track`'s own enum and its unconditional `MusicRecording`

## Resolution

Completed: 2026-09-16

Branch: `claude/v0.35-parallel-feasibility-eia5le`

### What was done

**Two independent `by: 'type'` tables.** `playlistSchema` has five rows; two are
safe narrowings (`album` → `MusicAlbum`, `mix` unchanged) and three are branch
switches (`podcast` → `PodcastSeries`/`hasPart`/`PodcastEpisode`, `audiobook` →
`Audiobook`/`Chapter`, `series` → `CreativeWorkSeries`/`CreativeWork`).
`trackSchema` has the same shape over its own five-value enum. Neither rune
declares anything about the other — D9 held, and the pair is asserted on one
page rather than trusted.

**Three additions to the mechanism**, each forced by this rune:

- `findChildren` matches `data-rune`, `data-name` *or* `data-field`, for the
  same reason `findByName` is attribute-agnostic. `playlist` builds half its
  track collection itself and receives the rest as `{% track %}` children; both
  populations carry `data-field="track"` and take one row.
- **A parent that retypes a child owns that child's mapping.** `clearProperties`
  strips the child's stamps first, so a property that does not belong to the new
  type disappears rather than lingering. It also removes a rebuilt carrier — a
  `<meta property= content=>` with no name — since stripping its property would
  leave an inert meta in the markup.
- `SCHEMA_TYPE_EXPLICIT` marks a type the *author* stated, which no parent may
  overrule. WORK-572 had this the other way round (`TYPE_IMPLICIT`), because
  `playlist` was its only reader; inverting it keeps D9's default — the parent
  retypes — and makes the marker the narrow exception it should be.

**Six new baseline fixtures** for the kinds nothing covered: `playlist.mix`
(the control), `playlist.audiobook`, `playlist.series`, `track.chapter`,
`track.talk`, `track.video`. The AC asked for per-`type` evidence and the corpus
could not give it.

**The `inspect` audit had two defects this surfaced**, both of the
guard-stops-guarding kind:

- It audited a `children:` row against the *parent's* tree and declared
  attributes, so every child source reported as broken. It now resolves them
  against the children.
- It could not see a source the applier rebuilds from the field bag, because the
  identity transform consumes `data-rune-fields` before the audit reads the
  tree. It now accepts the stamped property as evidence — scoped, so a child's
  stamp cannot cover for a parent's typo when both map to `name`.

Verified by probe: a typo'd child source and a typo'd parent source are each
reported, and the shipped tables are silent.

### Notes

- **`position` is not generated here.** The work item asked for the decision.
  Generating it would put a position on every list item for no consumer benefit,
  and `position` belongs to `ItemList` ordering rather than to an album's tracks.
  An author-stated `number` on a nested `{% track %}` still publishes.
- **`byArtist` is dropped, not relocated**, on every non-music row. `author`
  would fit `CreativeWork`, but it expects a Person or Organization and the value
  is a bare string — a new claim rather than a relocation. Stated in the table
  for a reviewer to disagree with (D5).
- The `playlist` and `track` `defineRune` fixtures gained the fields their rows
  name (a date, a link, a number, a media-zone image), so `refrakt inspect`
  reviews a fully resolved row. Same correction as `symbol` in WORK-567: the
  review surface's input should exercise what the table claims.
- I reverted this file once mid-item with a careless `git checkout` on
  uncommitted work and reconstructed it. No content was lost.

{% /work %}
