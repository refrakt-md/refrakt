{% bug id="BUG-030" status="confirmed" severity="major" source="SPEC-003" tags="runes,content-model,emitTag,itemModel,content-loss,playlist" %}

# A mixed `list|tag:x` field with `emitTag` silently drops the authored tags

`resolveSequence`'s emit branch walks the nodes a field collected and skips
anything that is not a list (`packages/runes/src/lib/resolver.ts:194`):

```ts
const listNodes = field.greedy ? (result[field.name] as Node[]) : [result[field.name] as Node];
const tagNodes: Node[] = [];
for (const listNode of listNodes) {
	if (!listNode || (listNode as any).type !== 'list') continue;
	…
}
result[field.name] = tagNodes;      // ← replaces the whole collection
```

The skipped nodes are not merely unconverted — the last line replaces the field
with `tagNodes`, so they are gone. A field declared `match: 'list|tag:track'`
with `emitTag: 'track'` therefore keeps the list-derived tracks and discards
every `{% track %}` the author wrote.

## Steps to Reproduce

Resolve this body against a greedy field matching `list|tag:track`, with an
`itemModel` and `emitTag: 'track'`:

```md
- Song A
- Song B

{% track name="Song C" /%}

- Song D
```

## Expected

Four track tags, in document order: the three list-derived ones and the authored
`Song C`. Both syntaxes are the same thing after conversion, which is the point
of `emitTag`.

## Actual

```
names: [ 'Song A', 'Song B', 'Song D' ]
```

`Song C` is gone. No error, no warning, no build diagnostic.

## Why it matters beyond the immediate loss

This is what stops `playlist` from using the mechanism that already exists.

`cast` (`plugins/business/src/tags/cast.ts:92-116`) gets the dual-syntax
composition almost free — a `members` field matching `list` with
`emitTag: 'cast-member'`, a separate `items` field matching `tag`, and a
three-line merge because both arrive as the same kind of node:

```ts
const allMembers = [...asNodes(resolved.members), ...asNodes(resolved.items)];
```

`playlist` cannot do that. It declares `match: 'list|tag:track'` on one field
*without* `emitTag`, then spends roughly 55 lines
(`plugins/media/src/tags/playlist.ts:316-353`) reconciling two representations
by hand — a `listCursor` consuming `tracksData` by list length, a transform-time
`adoptNestedTrack` to retro-fit the authored tags into the parent's
conventions, and a defensive tail for "a shape the resolver collected but this
loop did not recognise".

Its own content model records the cost:

> `tag:track` alongside `list` so the composition the docs promise works. Greedy
> because the two forms may alternate, and greedy collection is *consecutive*:
> prose between two tracks ends the run and pushes the rest to `body`.

## Notes

- **Severity is `major` because the failure is silent content loss**, the same
  class as {% ref "BUG-028" /%}. A rune that refused the mixed declaration would
  be a smaller problem than one that quietly eats half of it.
- No rune hits this today: `cast`, `audio` and `plot` use `emitTag` on
  `list`-only fields, and `playlist` uses a mixed field without `emitTag`. The
  bug is latent, and it is latent *because* the obvious combination does not
  work — so it has shaped the code around it rather than showing up as a defect.
- The fix looks small: pass a non-list node through into `tagNodes` instead of
  `continue`-ing past it. It is already a tag, so it needs no conversion — only
  to keep its place. That yields a homogeneous, document-ordered array, which is
  strictly better than `cast`'s concatenation (which appends all explicit tags
  after all list-derived ones and so loses interleaving).
- Worth confirming as part of any fix: that an emitted tag and an authored one
  of the same name really are interchangeable downstream — `adoptNestedTrack`
  exists because `playlist` found they were not, and that difference should be
  removed rather than re-encoded.
- Surfaced while considering whether {% ref "SPEC-141" /%}'s per-rune preprocess
  could subsume `emitTag`. It cannot and should not, but the question exposed
  this.

## References

- {% ref "SPEC-003" /%} — the declarative content model this belongs to
- {% ref "BUG-028" /%} — `figure` dropping non-media children; the same silent-content-loss class
- {% ref "BUG-031" /%} — the reference drops `emitTag`, `template` and the whole `itemModel` grammar, so neither half of the dual-syntax contract is visible
- {% ref "SPEC-141" /%} — where the question that exposed this came from

{% /bug %}
