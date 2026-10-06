{% work id="WORK-604" status="done" priority="high" complexity="simple" milestone="v0.38.0" source="SPEC-003" tags="runes,content-model,emitTag,content-loss" pr="refrakt-md/refrakt#658" %}

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

- [x] A greedy `list|tag:x` field with `emitTag` yields both the emitted and the authored tags, in document order
- [x] A regression test covers the interleaved case — list, authored tag, list — and asserts document order, not just count
- [x] A `list`-only field with `emitTag` is unchanged (`cast`, `audio`, `plot`)
- [x] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [x] `npm test` passes unchanged

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

## Resolution

Completed: 2026-10-06

Branch: `claude/v0-37-post-release-plan-dc3va1`

### What was done
- `packages/runes/src/lib/resolver.ts`: the `emitTag` branch of `resolveSequence` passes a non-list node through into `tagNodes` in place instead of `continue`-ing past it, so a `list|tag:x` field resolves to one document-ordered array of tags.
- `packages/runes/test/resolver.test.ts`: three tests — the bug report's interleaved input (list / authored `{% track %}` / list) asserting order, a list-only field unchanged, and a non-greedy field whose single match is a tag. The first and third fail without the fix.
- `site/content/extend/rune-authoring/content-models.md`: the `emitTag` row states the mixed-field behaviour.

### Notes
- Latent: no built-in rune declared this combination, so rendered output is byte-identical (inspect over every rune × variant on both sites).
- BUG-030 can close with this.

{% /work %}
