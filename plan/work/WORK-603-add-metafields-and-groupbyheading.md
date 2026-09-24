{% work id="WORK-603" status="ready" priority="medium" complexity="moderate" milestone="v0.38.0" source="SPEC-140" tags="runes,transform,dx" %}

# Add `metaFields` and `groupByHeading`

The two utilities with actual design in them, as opposed to the spellings in
{% ref "WORK-602" /%}.

**`metaFields(attrs, spec)`** collapses the declare-then-name-again cycle into
one declaration, returning a `Record<string, Tag>` usable directly as
`properties`. `plugins/plan/src/tags/work.ts` goes from 36 lines of plumbing to
about 13:

```ts
properties: metaFields(attrs, {
  id: '', status: 'draft', priority: 'medium', complexity: 'unknown',
  assignee: '', milestone: '', source: '', supersedes: '', pr: '', tags: '',
  created:  () => attrs.created  || fileVars?.created  || '',
  modified: () => attrs.modified || fileVars?.modified || '',
}),
```

A string value is the default for a missing attribute; a function is a computed
default, which is what the 12 `fileVars`-derived metas need.

**`groupByHeading(nodes, onItem)`** — the "walk children; a heading sets the
running group; list items become entries" loop, written seven times:
`tint.ts:39`, `map.ts:138`, `palette.ts:132` and `:282`, `spacing.ts:85` and
`:230`, `bento.ts:311`.

## Acceptance Criteria

- [ ] `metaFields` handles a computed default, so the 12 `fileVars`-derived metas are expressible
- [ ] A property-and-ref name collision is still rejected with the {% ref "ADR-008" /%} error when the properties object comes from `metaFields`
- [ ] `metaFields` is adopted where a rune's metas are all plain `attrs` reads mapped into `properties`; runes needing a meta outside `properties`, or conditionally, keep the explicit form
- [ ] `groupByHeading` is adopted at the seven loop sites, with each rune's per-item parser left rune-specific
- [ ] No lint rule or contract assertion makes either utility mandatory
- [ ] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [ ] `npm test` passes unchanged

## Approach

`metaFields` writes into the same flat key space as `refs` ({% ref "ADR-008" /%}),
so the collision check has to keep working against a computed object rather than
a literal — worth a test, since the current check reads `Object.keys` of both and
a generated object is the case nobody has exercised.

Key order matters for `data-rune-fields`, which is `JSON.stringify`d: iterate the
spec in declaration order so the bag's key order stays stable and the contracts
diff stays empty.

`groupByHeading` shares only the traversal. `parseColorEntry`, `parseNameValue`,
`parseFontEntry` and `parseLocationItem` stay where they are — the loop is the
duplication, not the parsing.

## Blocked by

- {% ref "WORK-598" /%} — `metaFields` produces the `properties` object, so it lands after the children emission is gone rather than having to reproduce it

## References

- {% ref "SPEC-140" /%} — Tier 3, D5
- {% ref "ADR-008" /%} — the flat namespace `properties` and `refs` share

{% /work %}
