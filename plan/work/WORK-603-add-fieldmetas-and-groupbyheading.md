{% work id="WORK-603" status="in-progress" priority="medium" complexity="moderate" milestone="v0.38.0" source="SPEC-140" tags="runes,transform,dx" pr="refrakt-md/refrakt#657" %}

# Add `fieldMetas` and `groupByHeading`

The two utilities with actual design in them, as opposed to the spellings in
{% ref "WORK-602" /%}.

**`fieldMetas(attrs, spec)`** collapses the declare-then-name-again cycle into
one declaration, returning a `Record<string, Tag>` usable directly as
`properties`. `plugins/plan/src/tags/work.ts` goes from 36 lines of plumbing to
about 13:

```ts
properties: fieldMetas(attrs, config, {
  id: '', status: 'draft', priority: 'medium', complexity: 'unknown',
  assignee: '', milestone: '', source: '', supersedes: '', pr: '', tags: '',
  created:  { from: ['attrs.created',  'file.created'],  default: '' },
  modified: { from: ['attrs.modified', 'file.modified'], default: '' },
}),
```

**The spec is data, not code.** A bare string is the default for a missing
attribute of the same name — which covers 10 of the 12 entries unchanged. The two
that need a fallback take an ordered list of sources and a literal default,
rather than a closure.

`from` draws on a closed set of roots, not arbitrary paths: `attrs.*` and
`file.*` (`config.variables.file`). That is why the signature gains `config` —
the utility resolves `file.*` itself instead of the rune reading `fileVars` and
passing a closure.

### Why the data form rather than a computed default

An earlier draft of {% ref "SPEC-140" /%} wrote these as functions
(`created: () => attrs.created || fileVars?.created || ''`). That is a closure,
so a properties spec written that way cannot cross a JSON boundary — it can only
ever be written in TypeScript, by someone who can ship code.

That matters beyond tidiness. A spec is in draft (`SPEC-143`, declarative slot
labelling) that would inherit this channel for a rune's properties, and its whole
premise is that a rune definition can be inert data. A closure here would have to
be migrated there, so it is cheaper to ship the data form now than to build the
closure API and then break it. Nothing in this item depends on that spec landing;
the data form is the better shape regardless, and the reference can be added once
it merges.

The pattern is narrow enough to be worth doing properly: exactly five runes read
`config.variables.file` (`work`, `bug`, `decision`, `milestone`, `spec`), all with
the same `attrs.X || file.X || ''` shape.

### Why `fieldMetas` and not `metaFields`

The utility was called `metaFields` in the first draft, which collides head-on with
`RuneConfig.metaFields` — SPEC-080's pure data manifest of meta-bearing fields, the
thing `blocks` references by name and the engine resolves against modifier values
(`packages/transform/src/engine.ts:1395`). They are different objects on different
sides of the pipeline: this one builds `properties` metas *in a transform*, that one
describes *how the engine renders* a field. Two same-named things landing in the same
authoring-guide paragraph is a trap, and it gets worse as a user-facing rune
definition declares `metaFields` in its frontmatter
({% ref "SPEC-145" /%} D7) while the guide also documents a `metaFields()` call.

The config key keeps its name: it is the published surface, referenced by
{% ref "SPEC-080" /%}, {% ref "SPEC-081" /%} and 20 rune configs. The utility is
renamed instead, and `fieldMetas` says what it returns — a `Record<string, Tag>` of
meta tags, keyed by field.

**This constraint applies to `fieldMetas`' spec only, not to
`groupByHeading`.** That takes a per-item callback and is ordinary imperative
helper code called from inside a transform — it is not part of any declaration,
so D9 has nothing to say about it.

**`groupByHeading(nodes, onItem)`** — the "walk children; a heading sets the
running group; list items become entries" loop, written seven times:
`tint.ts:39`, `map.ts:138`, `palette.ts:132` and `:282`, `spacing.ts:85` and
`:230`, `bento.ts:311`.

## Acceptance Criteria

- [x] `fieldMetas`' spec is data: a bare string, or `{ from: [...], default }` — no entry accepts a function
- [x] The spec round-trips through `JSON.parse(JSON.stringify(...))` unchanged
- [x] `from` resolves only the declared roots (`attrs.*`, `file.*`); an unknown root is rejected at call time rather than resolving to empty
- [x] The five runes reading `config.variables.file` express their `created` / `modified` fallback without a closure
- [x] A property-and-ref name collision is still rejected with the {% ref "ADR-008" /%} error when the properties object comes from `fieldMetas`
- [x] `fieldMetas` is adopted where a rune's metas are all plain `attrs` reads mapped into `properties`; runes needing a meta outside `properties`, or conditionally, keep the explicit form
- [ ] `groupByHeading` is adopted at the seven loop sites, with each rune's per-item parser left rune-specific
- [x] No lint rule or contract assertion makes either utility mandatory
- [x] The utility is named `fieldMetas`; nothing in the codebase or docs introduces a second `metaFields`, and `RuneConfig.metaFields` is unchanged
- [x] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [x] `npm test` passes unchanged

## Approach

`fieldMetas` writes into the same flat key space as `refs` ({% ref "ADR-008" /%}),
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

- {% ref "WORK-598" /%} — `fieldMetas` produces the `properties` object, so it lands after the children emission is gone rather than having to reproduce it

## References

- {% ref "SPEC-140" /%} — Tier 3, D5
- {% ref "ADR-008" /%} — the flat namespace `properties` and `refs` share

{% /work %}
