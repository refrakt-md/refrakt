{% spec id="SPEC-138" status="draft" tags="runes,collection,aggregate,data,query,plugins,seam" %}

# Pluggable query engines for the `field:value` grammar

The {% ref "SPEC-070" /%} `field:value` grammar is the single query language in
refrakt. Seven call sites share it, one parser implements it, and an author who
learns it once can read every query on a plan site. That uniformity is worth
protecting.

It is also the reason six ordinary questions cannot be asked at all. This spec
adds a **seam** under the grammar so a plugin can contribute a richer engine,
without core growing a second vocabulary and without the default changing for
anyone who does not opt in.

## Problem

The grammar's semantics are fixed by `packages/runes/src/field-match.ts`: clauses
AND across distinct fields and OR within a repeated one (`:132`), values are
stringified and comma-split (`:126`), field lookup is a flat `entity.data[field]`
(`:94`), and the operator is chosen by value shape — exact, glob, or regex
(`:111`). That fixes six limits:

| Gap | Status |
|---|---|
| Numeric / date comparison | impossible — everything is a string, no `>` |
| OR across *different* fields | impossible — different fields always AND |
| Nested field access on entities | impossible — flat lookup, no dotted paths |
| AND over array members | impossible — a repeated field is OR |
| Existence / absence / size | impossible — no `$exists`, no `$size` |
| Cross-field comparison | impossible — no expression evaluation |
| Negation | reachable as `status:/^(?!done$).+/` — evidence of the gap, not a fix |

These are not hypothetical. The workarounds are already in the tree:
`plan-history` carries a bespoke `since="7d"` attribute
(`plugins/plan/src/tags/plan-history.ts:26`) that exists solely because the
shared grammar cannot compare dates. Left alone, that pattern repeats one rune
at a time.

### Seven call sites, not three

| Site | Where |
|---|---|
| `collection` `filter` | `packages/runes/src/collection-resolve.ts:278` |
| `aggregate` `filter` + `value` | `packages/runes/src/aggregate-resolve.ts:231`, `:236` |
| `data` `where` | `packages/runes/src/data-projection.ts:125` |
| Data-bound sandbox ({% ref "SPEC-093" /%}) | `packages/runes/src/data-resolve.ts:136` |
| `entityRoutes.filter` ({% ref "SPEC-069" /%}) | `packages/content/src/entity-routes.ts:10` |
| plan `backlog`, `decision-log`, `plan-progress` | `plugins/plan/src/tags/` |

Adding an `engine=` attribute per rune would mean eight integrations and eight
places to document. Putting the seam under the *grammar* gives every consumer
the capability at once, including plugin runes nobody has written yet. That is
the actual consistency win, and it is what this spec specifies.

## What the spike settled

`spike/query-engines` ran three candidate libraries against 742 real plan
entities, with a hand-written predicate as ground truth per query. Full write-up
in `spike/query-engines/FINDINGS.md`.

**liqe is ruled out**, despite being the obvious fit on paper — Lucene-ish,
155 KB, and SPEC-070 already borrows its `field:value` / `*` / `/regex/` token
shapes. Three structural failures:

1. Default matching is substring and case-insensitive where SPEC-070 is exact
   and case-sensitive. On real tags, `tags:data` returns 31 rows where 12 are
   correct — 19 false positives, every one of them the tag `metadata`. No error
   is raised; the page simply shows rows the author did not ask for.
2. The only exact-match escape is a regex literal, and **two regexes in one
   query do not parse** (nearley grammar ambiguity, `liqe/dist/src/parse.js:47`).
   Two exact clauses is the commonest query shape in this repo.
3. Comparison operators are numeric-only, so a date window over ISO strings
   cannot be written.

The diagnosis generalises, and belongs in this spec because it is the criterion
for judging any future engine: **liqe is a search-box language** — forgiving,
substring, built for ranking human queries — **where SPEC-070 is a selector**.
A selector decides what renders on a page, so it must be exact and
deterministic. Shared surface syntax is not shared semantics.

mingo and JSONata each passed all six predicate queries and matched the
aggregation tier exactly.

## Architecture

### Dispatch on query shape, not on a new attribute

`field-match.ts` gains one resolve entry point that every call site already
routes through, and picks the engine from the query's *shape*:

- **string** → the SPEC-070 grammar, unchanged, forever the default.
- **object / array** → the registered structured engine.

No core rune declares a new attribute, so nothing MongoDB- or JSONata-shaped
appears in `refrakt inspect`, in `contracts/structures.json`, or in the
attribute tables {% ref "SPEC-128" /%} generates. Core never names an operator.

`entityRoutes.filter` benefits first and most cheaply: it already lives in
`refrakt.config.json`, so an object query is native there with no channel work
at all.

### Plugins contribute the engine, core consults it

A `theme.queryEngines` field on `Plugin`, collected exactly the way
`buildPreprocessHookSets` already collects `theme.orderings` ({% ref "SPEC-072" /%})
and `metaFields.*.sentimentMap` ({% ref "SPEC-076" /%}) — `packages/content/src/site.ts:155-175`.
Core hooks run first and a plugin cannot intercept them, but it does not need
to: it contributes declaratively and core calls it. This is the third instance
of an established pattern, not a new mechanism.

### Core owns the result contract, the plugin owns the language

The remaining leak is what an engine hands back. Core defines the shapes; the
plugin's adapter maps its language's output into one of them:

| Result | Accepted by |
|---|---|
| **entities** (identity-preserving) | `collection`, `relationships`, `aggregate` |
| **measure rows** `{ key, measures: Record<string, number> }` | `aggregate` |
| **table** `{ headers, rows }` | `data` |

So core's resolvers never learn what `$group` is, and `collection` rejecting a
reshaped result becomes a contract check rather than an engine-specific rule.

That check matters. `projectItem` (`packages/runes/src/collection-helpers.ts:149`)
binds `$item` as `{ id, identifier, type, url, data, sentiment, … }`, and
helpers like `titleLink`/`entityUrl` expect a real `EntityRegistration`. A
grouped result is a synthetic document with no id and no URL — `backlog`'s
default table body (`$item.url`, `$item.identifier`, `$item.data.status`) would
render empty rows rather than fail. Silent, so it must be rejected at build
time with a message naming the offending stage.

### Capability gaps go in core; language gaps go in plugins

This is the rule that keeps the seam from becoming an excuse.

**`aggregate` can only count.** `$item` exposes `count`, `value`, `percent` and
`total` (`aggregate-resolve.ts:288-360`), where `value` is itself a second
filter's count. There is no sum, average, min or max over a field, at any level
of query cleverness. That is a missing capability, not a missing vocabulary, and
it is fixed in core:

```
{% aggregate type="work" group="milestone" measure="sum:points" /%}
```

`measure="<kind>:<field>"` (`sum` | `avg` | `min` | `max`) is native idiom — the
same `kind:value` shape as the rest of the grammar — and binds `$item.measure`
alongside the existing projection, leaving {% ref "SPEC-072" /%} domain ordering
and the percent semantics untouched. If installing a plugin were the only way to
total a column, core's `aggregate` would stay crippled for everyone else.

**Grouping by a multi-value field is likewise core's.** {% ref "BUG-025" /%}:
`group="tags"` keys on the joined comma-string, producing 659 groups for 742
entities. MongoDB's `$unwind` is the general form of that operation, and
discovering that its single most compelling use case was a core defect is the
clearest evidence for this rule. Core fans out multi-value fields natively;
what is left for an engine is the general case on the `data` rune.

## Prerequisite: `Plugin.extends.schema` is collected and dropped

A structured engine that wants to add an attribute to a core rune — an
aggregation `pipeline` on `aggregate`, say — must do it through
`Plugin.extends`, so that core neither declares nor documents it.

That mechanism exists in the types (`packages/types/src/package.ts:79`, typed at
`:40-43` as "Additional attributes to accept on the core rune") and does not
work. `mergePlugins` collects `Plugin.extends[rune].schema`
(`packages/runes/src/plugins.ts:307-318`), `refract-loader.ts:197` passes it to
`assembleThemeConfig` cast `as any`, and `applyRuneExtensions`
(`packages/transform/src/merge.ts:346-375`) reads only `.modifiers` and
`.structure`. Two structurally unrelated types share the name "extension";
the cast is what lets them meet. `packages/runes/test/plugins.test.ts:336`
asserts only that the merge collects them, and no shipped plugin uses `extends`
— which is why nobody has noticed.

This is worth fixing on its own merits: it is the documented path for any plugin
extending a core rune, and today it fails silently. It should be filed as a bug
and landed before any engine needs it.

## Open: which engine ships first

The seam is engine-agnostic and this spec does not need the answer to proceed.
Recording the trade so the work item can decide it:

- **JSONata** (854 KB, zero deps, MIT) — a *string*, so it rides the existing
  meta-tag channel untouched (`tags/collection.ts:85`, `tags/aggregate.ts:107`
  stash the filter via `String(attrs.filter ?? '')`). No Markdoc `Object`
  attribute, no JSON round-trip, no dependency on the `extends` fix. Covers both
  tiers with one package. Against: a real language with a learning curve, and
  it ships `$eval` plus function definitions — taken whole or not at all.
- **mingo** (1.14 MB, zero deps, MIT) — *data-shaped*, so it composes in
  frontmatter, generates programmatically and validates before it runs. Its
  per-operator subpath exports let a curated operator set be enforced by the
  module graph rather than a policy note. Against: needs the full channel
  plumbing above.

Either way the operator set is curated, and the exclusions are of two kinds.
**Security**: `$where`, `$function`, `$accumulator` and JSONata's `$eval` — never
registered. **Coherence**: `$out` and `$merge` write to a collection that does
not exist; `$lookup`/`$graphLookup` duplicate {% ref "SPEC-072" /%} relationships
with none of its domain ordering; and **`$sample` must be banned outright**,
because nondeterministic output would break the build reproducibility that
`contracts/structures.json` and `contracts/seo-baseline/baseline.json` are
diffed against.

## Sequencing

1. **Fix `Plugin.extends.schema`** — independent, and a prerequisite for any
   engine that contributes an attribute.
2. **Fix {% ref "BUG-025" /%}** — multi-value grouping, core, no engine needed.
3. **`measure` on `aggregate`** — the numeric gap, core, no engine needed.
4. **The seam** — shape dispatch in `field-match.ts`, `theme.queryEngines`, the
   result contract, and the rejection path for reshaped results.
5. **First engine plugin** — registers a predicate engine; gets all seven call
   sites at once.
6. **Aggregation tier** — via `Plugin.extends`, on `aggregate` and `data` only.

Steps 2 and 3 deliver user-visible value with no plugin installed, which is the
test of whether the split in *Capability gaps go in core* was drawn correctly.

## Non-goals

- **Replacing the SPEC-070 grammar.** It stays the documented default at every
  call site and is not deprecated. An engine is the escape hatch for what the
  grammar provably cannot express. If anyone reaches for one to write
  `status:done`, the seam has failed.
- **Engine-driven sort or grouping on `collection`/`relationships`.**
  {% ref "SPEC-072" /%} domain ordering, {% ref "SPEC-095" /%} group ordering and
  {% ref "SPEC-076" /%} sentiment maps carry project semantics no general engine
  can know. Engines supply the predicate; the existing pipeline keeps ordering,
  grouping and rendering.
- **Shipping an engine in core.** {% ref "SPEC-103" /%}'s "a query language of
  our own" non-goal holds, and is not satisfied by importing someone else's
  vocabulary into a core rune's attribute surface.
- **Client-side querying.** Everything here is build-time; `datatable` remains
  the runtime layer.

## Acceptance Criteria

- [ ] A single resolve entry point in `packages/runes/src/field-match.ts`
  dispatches on query shape — string to the SPEC-070 grammar, object/array to a
  registered engine — and every one of the seven call sites routes through it.
- [ ] With no engine registered, behaviour at every call site is byte-identical
  to today, evidenced by the existing suites passing unchanged.
- [ ] `Plugin.theme.queryEngines` is collected across plugins in
  `buildPreprocessHookSets` alongside `orderings` and `sentiments`, and is
  reachable by the core resolvers.
- [ ] Core defines the three result shapes (entities / measure rows / table);
  `collection` and `relationships` reject a non-entity result at build time with
  a message naming the stage that produced it, rather than rendering empty rows.
- [ ] `aggregate` accepts `measure="<sum|avg|min|max>:<field>"` and binds
  `$item.measure`, with no engine installed and with SPEC-072 ordering intact.
- [ ] No core rune's attribute surface gains an engine-specific attribute —
  verified by `refrakt contracts --check` and the {% ref "SPEC-128" /%} attribute
  tables being unchanged by this work.
- [ ] Docs state when to reach for an engine and when the grammar suffices, and
  the curated operator set with the reasoning for each exclusion (security,
  coherence, determinism).
- [ ] Unit tests cover shape dispatch, engine registration and collision, the
  result-contract rejection path, and `measure` for each kind.

## References

- {% ref "SPEC-070" /%} — the `field:value` grammar this seams under;
  `packages/runes/src/field-match.ts`.
- {% ref "SPEC-072" /%} — domain-aware ordering the seam must not bypass, and
  the `theme.orderings` contribution pattern the engine registry copies.
- {% ref "SPEC-076" /%} — `aggregate`'s count/percent semantics and the
  `sentimentMap` contribution pattern.
- {% ref "SPEC-103" /%} — the `data` rune, and the "a query language of our own"
  non-goal this spec is careful not to violate.
- {% ref "SPEC-128" /%} — generated rune attribute tables, which are why an
  engine attribute must not land on a core rune.
- {% ref "BUG-025" /%} — multi-value grouping; core's half of the `$unwind`
  story.
- `spike/query-engines/FINDINGS.md` — the measurements behind the liqe
  rejection and the JSONata/mingo trade.

{% /spec %}
