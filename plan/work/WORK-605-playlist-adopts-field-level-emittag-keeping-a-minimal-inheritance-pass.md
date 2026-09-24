{% work id="WORK-605" status="ready" priority="medium" complexity="moderate" milestone="v0.38.0" source="SPEC-003" tags="runes,playlist,media,emitTag" %}

# `playlist` adopts field-level `emitTag`, keeping a minimal inheritance pass

With {% ref "WORK-604" /%} landed, `playlist`'s `tracks` field can declare
`emitTag: 'track'` and receive one homogeneous, document-ordered array instead of
a mix of `list` nodes and `track` tags.

That deletes the interleaving machinery at
`plugins/media/src/tags/playlist.ts:316-353` — the `listCursor` consuming
`tracksData` by list length, and the defensive tail for "a shape the resolver
collected but this loop did not recognise".

**It does not delete `adoptNestedTrack`.** See below.

## Acceptance Criteria

- [ ] `playlist`'s `tracks` field declares `emitTag: 'track'` with its existing `itemModel`
- [ ] The `listCursor` merge loop and its defensive tail are gone
- [ ] A list-derived track and an authored `{% track %}` render identically apart from what inheritance supplies, and interleaved order is preserved
- [ ] `type` inheritance still works: a track in a `podcast` presents as an episode, in an `audiobook` as a chapter, and an author-stated type still wins
- [ ] `artist` inheritance still works: a playlist `artist` reaches a track that omits its own, and does not override one that has its own
- [ ] The three seo-baseline playlist fixtures (`playlist.album`, `playlist.series`, `playlist.mix`) report no drift
- [ ] `refrakt contracts --check` reports no drift
- [ ] `npm test` passes unchanged

## Approach

**The inheritance is the part that survives, and it is why the saving is ~20
lines rather than ~55.** `adoptNestedTrack` does two parent→child jobs, neither
expressible through `emitAttributes`:

1. defaults the child's `type` from the playlist's (`CHILD_KIND`: album→song, podcast→episode, audiobook→chapter) when `TYPE_IMPLICIT` says the author did not state one;
2. appends the playlist's `artist` when `hasArtist(li)` is false.

`emitAttributes` resolves `$field` refs against the **extracted item data** and
treats everything else as a literal. There is no way to reference the parent
rune's attributes, so the emitted tags cannot carry inherited values from the
declaration alone.

One partial route worth trying, and rejecting if it complicates more than it
saves: `contentModel` may be a thunk of `attrs` (`breadcrumb`, `bento` and
`symbol` already do this), so `playlist` could compute
`emitAttributes: { type: CHILD_KIND[attrs.type ?? 'album'] }` as a literal at
resolve time. That covers list-derived tracks but not authored ones, which never
pass through `emitAttributes` — so the pass is still needed and this may just
split the logic across two places.

**Out of scope:** whether `emitAttributes` should be able to read a parent's
attributes at all. That is {% ref "SPEC-130" /%} D9's question ("each emitter
keys off its own attribute") and is not settled here.

## Blocked by

- {% ref "WORK-604" /%}

## References

- {% ref "BUG-030" /%} — why `playlist` could not use the existing mechanism
- {% ref "SPEC-130" /%} — D9, and the per-type `playlistSchema` table the inheritance feeds

{% /work %}
