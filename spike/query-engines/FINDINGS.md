# Query engines for the SPEC-070 call sites — liqe vs mingo vs JSONata

A throwaway spike, run to settle one question with measurements rather than
argument: **if the `field:value` grammar gained a pluggable engine, which
library should the first one use?**

Everything here runs against this repo's own plan content — 742 real entities
from `plan/work`, `plan/bugs` and `plan/specs`, with their real `status`,
`priority`, `tags`, `source`, `milestone` and git-derived `modified` dates.
Ground truth for each query is a hand-written JS predicate; an engine passes
only if its result set matches exactly. A query that runs and returns the wrong
rows is a failure — which is the point, because the decisive finding is silent,
not loud.

```bash
npm install
node extract.mjs     # regenerates entities.json from plan/
node probe.mjs       # why liqe can't host SPEC-070's semantics (no repo data needed)
node compare.mjs     # the predicate + aggregation comparison
node unwind.mjs      # does $unwind earn its place? (→ BUG-025)
```

## Result

| Query | liqe | mingo | JSONata |
|---|---|---|---|
| Q1 cross-field OR + absence | PASS | PASS | PASS |
| Q2 date window over ISO strings | not expressible | PASS | PASS |
| Q3 negation over a set + absence | parse error | PASS | PASS |
| Q4 array AND — both tags | parse error | PASS¹ | PASS |
| Q5a SPEC-070 AND across fields | parse error² | PASS | PASS |
| Q5b SPEC-070 repeated-field OR | parse error | PASS | PASS |
| Aggregation: per-milestone count + avg | no aggregation | PASS | PASS |

¹ only against adapter-normalized arrays. ² passes with bare words, wrong semantics.

## liqe is out, for three structural reasons

liqe was the front-runner going in: Lucene-ish syntax, 155 KB, and SPEC-070
already uses `field:value`, whitespace separation, `*` wildcards and
`/regex/flags` — all Lucene conventions. The token shapes do line up. The
semantics do not.

**1. Default matching is substring and case-insensitive.** SPEC-070 matches
exactly and case-sensitively (`packages/runes/src/field-match.ts:111`). On real
tags:

```
tags:data    exact  12   liqe  31   false positives 19   e.g. WORK-059 tags="transform, themes, metadata"
tags:runes   exact 241   liqe 243   false positives  2
tags:cli     exact  84   liqe  85   false positives  1
```

Every false positive for `data` is the tag `metadata` containing it. No error —
just more rows on the page than the author asked for.

**2. The only exact-match escape is a regex literal, and two of them in one
query do not parse.**

```
status:/^ready$/                       parses
a:/x/ b:y                              parses
status:/^ready$/ priority:/^high$/     THROWS — Ambiguous results.
status:/^ready$/ AND priority:/^high$/ THROWS — Ambiguous results.
status:/^ready$/ OR status:/^done$/    THROWS — Ambiguous results.
```

It is a grammar ambiguity: `liqe/dist/src/parse.js:47` throws when the nearley
grammar yields multiple distinct parses. So exact matching needs regex, two
exact clauses need two regexes, and two regexes don't parse — which makes the
commonest query shape in the codebase unreachable.

**3. Comparison operators are numeric-only.** `modified:>="2026-09-01"` →
`Expected a number.`; `modified:[2026-09-01 TO 2026-12-31]` → syntax error. The
date-window query cannot be written at all.

Plus liqe's implicit operator is uniformly AND, where SPEC-070 ANDs across
distinct fields but ORs a repeated one (`field-match.ts:132`).

**Diagnosis:** liqe is a *search-box* language — forgiving, substring,
case-insensitive, built for ranking human queries. SPEC-070 is a *selector*: it
decides what renders on a page, so it must be exact and deterministic. Same
surface syntax, opposite design goals.

## mingo and JSONata both pass

Two honest findings, one against each:

- **mingo's `$all` returns 0 rows against a raw comma-string.** `tags` is stored
  as `"runes, data, csv"`, so an adapter must split it to an array before array
  operators mean anything. Real integration work, not a blocker.
- **JSONata needs `$split(tags & "", /\s*,\s*/)`** — the `& ""` coerces
  undefined, and without it the expression breaks on entities with no tags. The
  first draft of Q3 here also used `$not($exists(source))` and missed the two
  entities with `source=""`. Both were quick fixes; both are the kind of sharp
  edge that shows up in authored content.

The aggregation tier matched ground truth exactly for both, including
`avgTags` to two decimals across all five milestones.

## The decisive architectural difference

A **string**-shaped query rides the existing channel untouched: `collection` and
`aggregate` already stash their filter as a meta tag via
`String(attrs.filter ?? '')` (`packages/runes/src/tags/collection.ts:85`,
`tags/aggregate.ts:107`). An **object**-shaped query needs a Markdoc `Object`
attribute, JSON round-tripping through that meta tag, and a working
`Plugin.extends.schema` — which is currently collected and then dropped
(`packages/runes/src/plugins.ts:307-318` populates `.schema`;
`packages/transform/src/merge.ts:346` reads only `.modifiers`/`.structure`).

So JSONata covers both tiers as one zero-dependency string. mingo is
data-shaped — better for composing queries in frontmatter, generating them
programmatically and validating them before they run — and its per-operator
subpath exports let a curated operator set be enforced by the module graph
rather than a policy note. That matters both for security (`$where`,
`$function`, `$accumulator` never imported) and for coherence (`$out`,
`$merge`, and especially `$sample`, whose nondeterminism would break the
reproducibility `contracts/` and `contracts/seo-baseline/` depend on).

## `$unwind` found a bug instead

The most compelling aggregation operator turned out to describe something core
already gets wrong. `backlog` documents `group="tags"`
(`plugins/plan/src/tags/backlog.ts:91`), but `groupEntities` keys on
`fieldValue()`, which joins a multi-value field into one string — so the group
key is the whole tag list:

```
group by "tags"    today: 659 groups, 614 of them with exactly 1 member
                   $unwind: 400 groups
group by "source"  SPEC-008 reads 16, is 19;  SPEC-051 reads 10, is 11
```

Filed as **BUG-025**. Notably this argues for fixing core rather than reaching
for a plugin: grouping by a multi-value field should work natively, and what
remains for an engine is the general case on the `data` rune.

## Package facts, as measured

| Library | Version | Unpacked | Runtime deps | Licence | Last publish |
|---|---|---:|---|---|---|
| mingo | 7.2.4 | 1.14 MB | none | MIT | 2026-08 |
| jsonata | 2.2.2 | 854 KB | none | MIT | 2026-07 |
| liqe | 3.8.7 | 155 KB | nearley, ts-error | BSD-3 | 2026-06 |

Also surveyed and rejected without a run: **sift** (query-only, object-shaped,
last published 2024-04), **@ucast/mongo** (architecturally apt, object-shaped,
small community), **json-logic-js** (prefix notation, unpleasant to hand-author),
**filtrex** (fine but a third unrelated syntax), **arquero** (right shape for
tabular data, wrong authoring channel — queries are method chains and its string
path runs through acorn), **alasql** (10 MB, pulls `cross-fetch` into a
build-time pipeline that does no network), **jmespath** (MPL-2.0 against an
otherwise permissive tree, weak aggregation), **duckdb-wasm** (tens of MB, async
WASM init).
