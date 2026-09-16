{% work id="WORK-572" status="done" priority="high" complexity="moderate" source="BUG-016" tags="runes,media,content-model,schema-org" milestone="v0.35.0" %}

# Accept track children in playlist

Make the composition the docs already promise actually work. A `{% track %}`
inside a `{% playlist %}` becomes one of that playlist's tracks — in the track
list, in the rendered HTML, and in the structured data.

`track` is useful standalone *and* useful inside a playlist when the list format
is too limited and the author wants full control. This is the escape hatch, and
it should cost the author nothing: **a nested track with no explicit `type`
produces the same schema as the same content written as a list item.**

Resolves {% ref "BUG-016" /%} in the "make it work" direction.

## The rule

Two channels, and they behave differently:

- **`property` — which collection the child joins (`track` vs `hasPart`) — is
  always the parent's.** It describes a relationship, and only the parent knows
  it. Not a policy choice: `collectJsonLd` nests a typed node only when that
  node carries both `typeof` and `property` (`seo.ts:109`), so a child the
  parent does not stamp floats free whatever type it has.
- **`typeof` — what the child *is* — is the child's when declared, else the
  parent's child-row default.**

So the parent is already obliged to touch every nested child for nesting to work
at all; type inheritance rides along free. The child still declares nothing
about its parent, which is {% ref "SPEC-130" /%} D9's rule — this item confirms
it rather than carving an exception.

The vocabularies already agree: `track`'s `episode` and
`playlist[type="podcast"]`'s child row both mean `PodcastEpisode`, so explicit
and inherited give the same answer whenever the author is consistent.

## Two things that block the inheritance today

**The default hides the absence.**

```ts
const typeValue = (attrs.type as string) ?? 'song';   // track.ts:37
```

By transform time, *absent* and *explicit `type="song"`* are the same value, so
"no explicit type → inherit" can never fire. The rune has to test
`attrs.type === undefined`, and the `'song'` default moves out of the transform
into the standalone fallback row. Small, and load-bearing — get it wrong and the
feature silently does nothing.

**Equivalence needs the artist default too.** List form does
`track.artist ?? playlistArtist` (`playlist.ts:127`). The `track` rune has no
such fallback, so `{% playlist artist="Acme" %}` gives list items
`byArtist: "Acme"` and a nested `{% track %}` none at all. "Gains its schema from
the playlist" has to cover attribute defaulting, not only the type, or the two
forms are not equivalent.

## Acceptance Criteria

- [x] `playlist`'s `tracks` field accepts `{% track %}` tags as well as a markdown list, preserving document order across both
- [x] Nested tracks render inside the `<ol data-name="tracks">` — no `<li>` is emitted outside a list
- [x] A nested track with **no** explicit `type` takes the playlist's child type; one **with** an explicit `type` keeps it
- [x] `track` distinguishes an absent `type` from `type="song"`; the `'song'` default becomes the standalone fallback, not a transform-time coalesce
- [x] A nested track inherits the playlist's `artist` the way a list item does, so the two forms agree on `byArtist`
- [x] The parent stamps the collection property on nested children, so no detached top-level entity is published
- [x] **The equivalence is asserted directly**: the same track as a list item and as a `{% track %}` child produce the same JSON-LD for the shared fields
- [x] Track-only fields (`url`, `position` from `number`) still come through — the fuller form may carry more, it just may not carry less
- [x] An explicit child type that contradicts its container (`{% track type="song" %}` in a podcast) is honoured, and the decision is written down
- [x] `/runes/media/track`'s claim that the composition works is true, with a worked example
- [x] {% ref "BUG-016" /%}'s three symptoms are each covered by a test: the stray `<li>`, the detached entity, and the docs claim

## Approach

**The content-model change is the cheap half.** `matchesType` already supports
what is needed — pipe alternatives (`resolver.ts:88`) and `tag:NAME`
(`resolver.ts:107`) — so the `tracks` field goes from `match: 'list'` to
`match: 'list|tag:track'`. Note it must also become greedy to collect more than
one node, and greedy collection is *consecutive*, so prose between two tracks
ends the run and pushes the rest to `body`. Acceptable, but say so in the docs
rather than letting an author discover it.

**The transform is the real work.** It currently has one input shape —
`itemModel`-extracted plain data (`tracksData`) — and builds every `<li>` from
it. Tag children arrive as already-transformed renderables instead. The
transform has to handle both and produce one ordered list. Resist normalising
tag children back into `tracksData` shape: the `{% track %}` form exists
precisely because it carries things the item model cannot express, and
flattening it would throw those away.

**Stamp imperatively here; the table subsumes it later.** This item lands before
{% ref "WORK-569" /%}, so the type and property stamping is written into the
transform in today's style. That is deliberate and follows
{% ref "BUG-013" /%}'s own reasoning: the mapping is five rows, and writing it
imperatively first makes the config-shaped version a mechanical move rather than
a design exercise. {% ref "WORK-569" /%} then replaces both the transform-built
and tag-built stamping with one `children:` mapping covering both shapes.

**Ordering with {% ref "WORK-569" /%} matters and this way round is deliberate.**
Structure first, schema second: if the table is written while tag-built children
are still not children, its `children:` mapping covers half the population and
has to be revised the moment this lands.

`position` is worth a thought but not a requirement here. Nested tracks could
take `position: 'index'` from {% ref "SPEC-130" /%}'s one generator, which would
make them *better* than list items — those carry no position at all today.
Note it for {% ref "WORK-569" /%} rather than building a second mechanism now.

## Blocked by

- {% ref "WORK-562" /%}

## Blocks

- {% ref "WORK-569" /%}

## References

- {% ref "BUG-016" /%} — the defect, measured
- {% ref "SPEC-130" /%} — D9: the parent retypes its children; a child never declares its context
- {% ref "BUG-013" /%} — the per-type mapping this feeds, and the imperative-first precedent
- {% ref "WORK-569" /%} — replaces this item's stamping with the declarative table
- `packages/runes/src/lib/resolver.ts:88,107` — the matcher support already present
- `plugins/media/src/tags/playlist.ts:121-155` — the single-input-shape transform
- `plugins/media/src/tags/track.ts:37` — the default that hides the absence

## Resolution

Completed: 2026-09-16

Branch: `claude/v0.35-parallel-feasibility-eia5le`

### What was done

- `plugins/media/src/tags/playlist.ts` — `tracks` matches `list|tag:track` and is
  greedy; the transform walks the matched nodes in source order, consuming
  `tracksData` by list length, so the two forms interleave correctly rather than
  one block following the other. `trackItems` now points at the merged set, which
  is what `schema: { track }` stamps `property="track"` onto. `adoptNestedTrack`
  retypes implicit children and applies the artist default.
- `plugins/media/src/tags/track.ts` — `explicitType` separated from the `'song'`
  fallback; a `TYPE_IMPLICIT` marker for the parent.
- `packages/runes/src/lib/resolver.ts` — greedy + itemModel (see below).
- `plugins/media/test/playlist-track-children.test.ts` — 11 tests.
- `site/content/runes/media/track.md` — an "Inside a playlist" section with a
  worked mixed-form example, and the two caveats.

### The item's stated approach does not work as written

"It must also become greedy" — but with `greedy`, `result[field.name]` is an
**array**, and the resolver guarded its itemModel extraction on
`'type' in node`. An array has no `type`, so `tracksData` was never populated:
making the field greedy **silently disabled its own extraction and broke the
list form outright**. "Greedy itemModel field" was simply unimplemented.

Fixed in `resolver.ts` by concatenating `resolveListItems` across the collected
lists, in document order, skipping non-list nodes (a greedy `list|tag:x` field
collects both). Shared code, so it is covered by the existing suite plus the new
"keeps the list form working unchanged" test.

### `track` was dropping two of its own fields

`artistMeta` and `durationMeta` were declared in `properties` *and* `schema` but
never pushed into `children`, so they were stamped onto nodes that were not in
the tree. A standalone `{% track artist="Radiohead" duration="4:01" %}`
published its name and nothing else. The visible `track-artist` /
`track-duration` spans carry no `property=`, so `collectProperties` found no
value either.

WORK-562's baseline had recorded this and it went unnoticed at the time. In
scope here because the equivalence criterion cannot hold otherwise.

**Baseline diff: +28 lines, all additions.** `track` and `track.episode` gain
`byArtist` and `duration`. Nothing removed; playlists unchanged.

Separately, `rootAttrs` in `track` was assembled with `data-src` and never
applied — dead code, so `src` reached nothing. Now applied.

### How the inheritance works

Markdoc transforms bottom-up, so a child cannot see its parent: the parent
retypes its children (SPEC-130 D9), and it can only do that if it can tell "no
type stated" from an explicit `type="song"`. `TYPE_IMPLICIT` is an own-property
on the Tag object rather than an attribute — `JSON.parse(JSON.stringify(...))`
at the serialize boundary drops it, so it can never reach the HTML.

`CHILD_TYPEOF` is deliberately **one constant, not a per-type table**: every
playlist type emits `MusicRecording` children today, podcasts included, which is
BUG-013. WORK-569 replaces that constant. Until then the inherited type must be
exactly what the list form produces, or the two forms would disagree — which is
the equivalence this item exists to establish.

`CHILD_KIND` (album/mix → song, podcast/series → episode, audiobook → chapter)
is the *rendered* kind, so a podcast's nested track does not present itself as a
song. That is observable today and is what makes the inheritance criterion
non-vacuous ahead of WORK-569.

### The decision the item asked to be written down

**An explicit child type that contradicts its container is honoured.** A
`{% track type="song" %}` inside a podcast stays a song. The author stated it;
silently overriding would make the attribute a lie. Tested, and documented on
the rune page.

### Notes

- Greedy collection is consecutive, so prose between two tracks ends the run and
  pushes the rest to `body`. Acceptable, and stated on the rune page rather than
  left for an author to hit.
- The `emitTag` / `listToTags` path in the resolver would have converged both
  forms on one code path, which is tempting. Not taken: the list itemModel
  carries `cuePoints`, which `track` has no attribute for, so it would have
  regressed the list form.

### Verification

`npm test` — 368 files, 4498 tests, all passing. `npm run format:check` clean
(run on its own, exit code read directly). `content:check-links` and
`runes:check-docs` clean.

{% /work %}
