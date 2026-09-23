{% bug id="BUG-025" status="confirmed" severity="major" source="SPEC-070" tags="runes,collection,aggregate,backlog,grouping" %}

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

{% /bug %}
