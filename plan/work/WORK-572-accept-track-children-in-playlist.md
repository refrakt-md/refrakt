{% work id="WORK-572" status="ready" priority="high" complexity="moderate" source="BUG-016" tags="runes,media,content-model,schema-org" milestone="v0.35.0" %}

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

- [ ] `playlist`'s `tracks` field accepts `{% track %}` tags as well as a markdown list, preserving document order across both
- [ ] Nested tracks render inside the `<ol data-name="tracks">` — no `<li>` is emitted outside a list
- [ ] A nested track with **no** explicit `type` takes the playlist's child type; one **with** an explicit `type` keeps it
- [ ] `track` distinguishes an absent `type` from `type="song"`; the `'song'` default becomes the standalone fallback, not a transform-time coalesce
- [ ] A nested track inherits the playlist's `artist` the way a list item does, so the two forms agree on `byArtist`
- [ ] The parent stamps the collection property on nested children, so no detached top-level entity is published
- [ ] **The equivalence is asserted directly**: the same track as a list item and as a `{% track %}` child produce the same JSON-LD for the shared fields
- [ ] Track-only fields (`url`, `position` from `number`) still come through — the fuller form may carry more, it just may not carry less
- [ ] An explicit child type that contradicts its container (`{% track type="song" %}` in a podcast) is honoured, and the decision is written down
- [ ] `/runes/media/track`'s claim that the composition works is true, with a worked example
- [ ] {% ref "BUG-016" /%}'s three symptoms are each covered by a test: the stray `<li>`, the detached entity, and the docs claim

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

{% /work %}
