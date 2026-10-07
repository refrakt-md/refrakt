{% bug id="BUG-025" status="fixed" severity="major" source="SPEC-070" tags="runes,collection,aggregate,backlog,grouping" milestone="v0.39.0" pr="refrakt-md/refrakt#666" %}

# Grouping by a multi-value field keys on the whole comma-string

`collection`, `aggregate` and `backlog` all accept `group="<field>"`. When that
field is multi-valued — `tags`, `source`, `pr` — the group key becomes the
*entire* comma-separated string, so `"runes, data, csv"` is one group rather
than three memberships.

The filter side of the same grammar already disagrees: `candidates()`
(`packages/runes/src/field-match.ts:126`) splits a comma-string into members, so
`filter="tags:runes"` matches an entity tagged `runes, data, csv`. Grouping that
same entity puts it in a group called `runes, data, csv`. One field, two
incompatible readings, in one rune.

## Where it comes from

`groupEntities` keys every entity through `fieldValue`:

```
packages/runes/src/collection-helpers.ts:235
  const groups = groupBy(entities, (e) => fieldValue(e, field) || '(none)');

packages/runes/src/collection-helpers.ts:121-125
  export function fieldValue(e: EntityRegistration, field: string): string {
    const v = resolveEntityField(e as MatchableEntity, field);
    if (Array.isArray(v)) return v.join(', ');
    return String(v ?? '');
  }
```

`fieldValue` is a *display* helper — it exists to render a field into a cell
(`collection-resolve.ts:96`, `:190`), where joining is exactly right. Using it
as a grouping key silently imports that display decision into the query layer.

Call sites: `collection-resolve.ts:239`, `aggregate-resolve.ts:259` and `:343`.
`relationships` is unaffected — it groups by `kind`/`type`, which are
single-valued, and uses `fieldValue` only for domain ranking.

## Measured on this repo's own plan content

742 entities (`plan/work`, `plan/bugs`, `plan/specs`), measured by
`spike/query-engines/unwind.mjs`:

| `group=` | today | correct | singleton groups today |
|---|---:|---:|---:|
| `tags` | 659 groups | 400 | 614 |
| `source` | 138 groups | 129 | 40 |
| `pr` | 28 groups | 26 | 15 |

`group="tags"` produces 659 groups for 742 entities, 614 of them holding a
single item. The top groups are combinations — `"plan, cli"` (7),
`"runes, content-model"` (6) — where the real distribution is `runes` (241),
`plan` (126), `lumina` (96).

**`source` is the dangerous one**, because the output looks plausible. Counting
work items per spec today:

```
SPEC-008: reads 16, is 19
SPEC-051: reads 10, is 11
```

The missing items list a second spec alongside the first and were counted into
a combined group. Nothing in the rendering suggests the number is wrong.

## `backlog` documents this as supported

```
plugins/plan/src/tags/backlog.ts:91
  'Group by field: status, priority, assignee, milestone, type, tags. Default: status.'
```

`tags` is named explicitly in the attribute description, so this is not an
author straying outside the contract — it is the documented path.

## Steps to Reproduce

1. On any page with the plan plugin loaded, render
   `{% backlog show="work" group="tags" /%}` — or the core equivalent,
   `{% collection type="work" group="tags" /%}`.
2. Observe the group headings: each is a full tag list (`"runes, data, csv"`),
   not a tag.
3. Count them. Against this repo's `plan/`, that is 659 headings for 742
   entities, 614 of which have one item under them.

`spike/query-engines` reproduces it without rendering:

```bash
cd spike/query-engines && npm install && node extract.mjs && node unwind.mjs
```

## Expected

Grouping fans a multi-value field out: an entity tagged `runes, data, csv`
contributes one membership to each of `runes`, `data` and `csv`. The same
split `candidates()` already applies on the filter side (comma-separated, each
member trimmed; a genuine array fans out by element).

One consequence to make explicit in the docs rather than hide: with fan-out the
per-group counts no longer sum to the entity count, because an entity can appear
in several groups. That is correct for multi-value grouping — the count means
"entities carrying this value" — but it changes what a reader should take a
group total to mean.

## Actual

One group per distinct combination, ordered and labelled by the joined string.

## Notes

- The grouping key and the *display* of a field should stop sharing one helper.
  A `groupKeys(entity, field): string[]` beside `fieldValue` keeps the display
  join where it belongs and gives grouping its own contract.
- `sortEntities` (`collection-helpers.ts:177`) has the same latent issue —
  sorting by a multi-value field orders by the joined string. It is not
  reported here because no shipped content sorts on one, but a fix should
  decide the rule rather than leave it to the join.
- Found while spiking query engines for the `data` rune
  (`spike/query-engines`); MongoDB's `$unwind` is the general form of this
  operation, and its single most compelling use case turned out to be a defect
  in core rather than a reason to reach for a plugin.

## Resolution

Completed: 2026-10-07

Branch: `claude/v039-bug-025-grouping`
PR: refrakt-md/refrakt#666

### What was done
- `packages/runes/src/collection-helpers.ts`: new `fieldMembers(e, field)`, which applies the filter side's split (`candidates()`: comma-separated, trimmed, an array split by element) and also drops empty members and de-duplicates. New `groupKeys(e, field)` returns `fieldMembers`, or `['(none)']` when empty. `groupEntities` fans each entity out over its `groupKeys` and ranks a group by its key. `fieldValue` stays the display join. All three call sites (`collection-resolve.ts`, `aggregate-resolve.ts` ×2) and `backlog`, which lowers to collection, pick this up.
- `sortEntities` rule for a multi-value field (MongoDB's array rule): ascending sorts by the smallest member and descending by the largest. With a declared order it uses the best or worst ranked member, and ranked members are preferred over unranked ones. Single-valued fields are unchanged.
- `fieldMembers` and `groupKeys` are exported from `@refrakt-md/runes`.
- Docs: `collection.md` (new "Grouping by a multi-value field" section, plus the sort, group and limit bullets), `aggregate.md` (fan-out, per-group counts mean "entities carrying this value" and can sum past `total`), `backlog.md` (a "Grouped by tag" example). The `backlog` `group` description was updated and `rune-attributes.json` regenerated.
- Tests: `packages/runes/test/collection-grouping.test.ts` (15 tests; 13 fail on the old code, and the other 2 are guards that single-valued grouping and the display join are unchanged). Also a `backlog group="tags"` test in `plugins/plan/test/backlog.test.ts`, which fails on the old dist.

### Measured (spike/query-engines, 803 entities; real groupEntities before → after)
- tags: 719 → 430 groups (singletons 672 → 175)
- source: 146 → 137 (singletons 39 → 28)
- pr: 43 → 44
- work per spec: SPEC-008 16 → 19, SPEC-051 10 → 11, SPEC-094 15 → 15
- Every member group's count after the fix equals the spike's `$unwind` count (0 mismatches on all three fields).

### Notes
- An empty member of a comma-string (`"a, , b"`) joins no group. An all-empty value (`" , "`) is `(none)`.
- The SEO baseline and both structure contracts have no diff; grouping emits no structured data.
- The bug's figures (742 entities, 659 tag groups) came from an earlier snapshot. The spike's own "today" column (717) normalises `a,b` against `a, b`, which the real code did not, so the real "before" was 719.

{% /bug %}
