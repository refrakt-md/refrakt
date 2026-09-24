{% work id="WORK-604" status="ready" priority="high" complexity="simple" milestone="v0.38.0" source="SPEC-003" tags="runes,content-model,emitTag,content-loss" %}

# Pass authored tags through a mixed `list|tag:x` field with `emitTag`

`resolveSequence`'s emit branch skips anything that is not a list, then replaces
the field with only the emitted nodes (`packages/runes/src/lib/resolver.ts:194`):

```ts
if (!listNode || (listNode as any).type !== 'list') continue;
…
result[field.name] = tagNodes;
```

So a field declared `match: 'list|tag:track'` with `emitTag: 'track'` keeps the
list-derived tracks and **silently discards every `{% track %}` the author
wrote**.

## Acceptance Criteria

- [ ] A greedy `list|tag:x` field with `emitTag` yields both the emitted and the authored tags, in document order
- [ ] A regression test covers the interleaved case — list, authored tag, list — and asserts document order, not just count
- [ ] A `list`-only field with `emitTag` is unchanged (`cast`, `audio`, `plot`)
- [ ] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [ ] `npm test` passes unchanged

## Approach

Pass a non-list node through into `tagNodes` rather than `continue`-ing past it.
It is already a tag and needs no conversion — only to keep its position.

Verified before filing. Given `- Song A`, `- Song B`,
`{% track name="Song C" /%}`, `- Song D` against such a field, the resolver
returns `['Song A', 'Song B', 'Song D']`.

The result is a homogeneous, document-ordered array, which is better than
`cast`'s current shape: `cast` collects list items and explicit tags in two
separate fields and concatenates
(`const allMembers = [...asNodes(resolved.members), ...asNodes(resolved.items)]`),
so all list-derived members land before all explicit ones and interleaving is
lost. `cast` is not changed here, but the option becomes available to it.

## Edge Cases

- A non-greedy field whose single match is a tag rather than a list — the `listNodes` wrapper is `[result[field.name]]`, so the same branch must handle it.
- A field matching `tag:x` where `x` is *not* the `emitTag` name: the node still passes through unconverted, which is correct — the content model said it was acceptable.

## References

- {% ref "BUG-030" /%} — the bug this fixes
- {% ref "BUG-028" /%} — the same silent-content-loss class
- {% ref "SPEC-003" /%} — the declarative content model

{% /work %}
