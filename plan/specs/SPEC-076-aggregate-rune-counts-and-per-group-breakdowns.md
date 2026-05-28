{% spec id="SPEC-076" status="draft" tags="aggregate, collection, registry, postprocess, counts, runes" source="SPEC-070" %}

# Aggregate rune — counts and per-group breakdowns from the registry

A third post-process-resolved query rune that sits beside `collection` ({% ref "SPEC-070" /%}) and `relationships` ({% ref "SPEC-072" /%}). Where `collection` projects entities and `relationships` projects edges, **`aggregate` projects numbers** — counts (and, later, sums / averages) over the same field-match query, optionally broken down by group. Two modes from the same rune: a no-body **single-number** form (subsuming the small `count` rune we considered), and a body-zoned **per-group iteration** form whose template binds a group projection to `$item`. Replaces a one-off `count` rune, absorbs the per-group iteration we held under `collection`, and is what `plan-progress` decomposes onto.

## Problem

Three threads converge on the same missing piece:

1. **No primitive for "how many".** `collection` knows how to count but only exposes it through the `$count` / `$shown` variables inside its preamble — i.e. coupled to rendering a list. Nothing renders just an integer. Authors who want "we have N items" or per-status counts have to lean on a full collection.
2. **Per-group iteration was held under `collection`.** {% ref "SPEC-072" /%} explored a `{% items /%}` slot for per-group templates inside `collection` and held it as SPEC-sized — the slot machinery is heavy when the group's body has to splice an *item list* into chrome. The same iteration idea is much lighter if each group renders a single template bound to a group projection, with no nested item splice — which is exactly what an aggregation rune needs.
3. **`plan-progress` can't decompose cleanly today.** A row of status badges + a progress bar is conceptually `count × N + total`, but you can't feed counts into `progress.value` / `max` from a Markdoc function — functions evaluate during per-page Schema Transform, *before* the cross-page registry is built ({% ref "SPEC-075" /%} frames the timing). Precomputed `$item.data.*` variables only work on dynamic entity routes, not file-backed pages.

These all want the same thing: a post-process-resolved rune (like `collection` / `relationships`) whose output is numbers, with a body template that binds the aggregate result.

## Goals

- A generic **`{% aggregate %}` rune** that queries the registry by `type` + `filter`, optionally `group`s, and emits a single number (no body) or iterates groups (with body zones).
- Composes cleanly with `progress`, `badge`, and `humanize` via `$item` bindings inside the body — no deferred-function feature required for the common case.
- Works on **both file-backed and dynamic routes**, since the rune resolves in post-process with the full registry — same coverage as `collection` / `relationships`.
- **Subsumes the proposed `count` rune** outright.
- Establishes the foundation for **`plan-progress` to become thin sugar**, the way decision-log / plan-activity now wrap `collection`.

## Non-goals

- Replacing `collection` for per-entity rendering — `aggregate` renders *numbers*, not the items themselves; the two are complementary.
- A deferred-function `count(…)` mechanism for arbitrary attribute slots anywhere on the page ({% ref "SPEC-075" /%} discussion) — `aggregate`'s body template covers the plan-progress case via `$item.*`, so the deferred-function story can stay deferred.
- Sums / averages of numeric fields in v1 — reserved by the rune's shape and listed under [Future extensions](#future-extensions); only `count` ships first.

## Capability 1 — single-number form

The no-body form emits one integer: the count of entities matching the query.

```markdoc
{% aggregate type="work" filter="status:done" /%}
```

Renders as a small inline element carrying the count and query metadata (exact markup follows the post-process pattern — sentinel during transform, real `<span>` substituted in phase 4). This is the form that absorbs the `count` rune proposal: same attributes (`type`, `filter`), inline number output, post-process-resolved.

## Capability 2 — body-zoned per-group iteration

With a body, the source splits on top-level `hr` into the same **preamble / template / fallback** zones as `collection`, but `$item` is bound *differently per zone*:

```markdoc
{% aggregate type="work" group="status" %}
{% progress value=$item.done max=$item.total %}Progress{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
Nothing to report.
{% /aggregate %}
```

| Zone | When rendered | `$item` shape |
|------|---------------|---------------|
| **preamble** | once, only when the query is non-empty, *above* the per-group output | `{ total, done?, percent?, group? }` — totals across all matches |
| **template** | once **per group**; this is the rune's main output | `{ key, count, shown, total }` — projection for *this* group |
| **fallback** | once, only when the query matches no entities, *in place of* the template | `{ total: 0 }` |

`$item.key` is the group value (e.g. `"done"`); `$item.count` is entities-in-group pre-limit; `$item.shown` is post-limit; `$item.total` is the all-groups total — so a per-group template can render share-of-total ratios without a second query.

`group` is optional. Without it, the body renders once with the totals projection on `$item` — useful for a single composed element from a totals-only query (e.g. just a `progress` bar driven by `$item.done` / `$item.total`).

Other attributes mirror `collection`:

| Attribute | Meaning |
|-----------|---------|
| `type` | Entity type(s), comma-separated. |
| `filter` | `field:value` clauses ({% ref "SPEC-070" /%} grammar). |
| `group` | Group-by field; omit to render once with totals. |
| `sort` | Sort groups (group key, count, or any group-projection field); honors {% ref "SPEC-072" /%} domain-aware ordering when the group field has one. |
| `limit` | Cap the number of groups (after sort). |
| `empty` | Self-closing string fallback (same as `collection`); body fallback zone wins when both are present. |

## What this absorbs

- **The "count rune"** — Capability 1 *is* the count rune. Withdraw the separate proposal.
- **Per-group iteration held in {% ref "SPEC-072" /%}** — held under `collection` because per-group iteration there has to splice an *item list* inside the group's chrome (a two-level deferred transform plus a slot-substitution primitive). Aggregate sidesteps that entirely: each group renders one template bound to a group projection, no items-list slot. The loop machinery collapses to "reparse body source per group, bind `$item`, splice" — the exact mechanism `collection`'s per-item template already uses, just at group granularity.
- **Feeding counts to `progress`** without a deferred-function mechanism ({% ref "SPEC-075" /%}) — inside the aggregate body, `$item.done` / `$item.total` / `$item.count` are real numbers at post-process time, so `progress`'s `value` / `max` attributes can read them as plain Markdoc variables. The deferred-function path is no longer required for plan-progress.
- **plan-progress's decomposition** — becomes thin sugar emitting the same aggregate composition (preamble = progress bar; template = badge per status; fallback = empty line), with plan-specific defaults baked in (type set, status enum, sentiment mapping). Same pattern as decision-log / plan-activity wrapping `collection`.

## Future extensions

Not in scope for v1, but reserved by the rune's shape:

- **Sums / averages / max / min** of a numeric field — `sum="hours"`, `avg="priority-rank"`. The group projection gains corresponding fields (`$item.sum`, `$item.avg`, …); preamble totals likewise.
- **Per-group `sentiment` projected onto `$item`** — derived from the rune's domain ordering ({% ref "SPEC-072" /%}) when the group field has a sentiment-mapped enum, so badges pick up sentiment without authoring it per status.

## Implementation note

`aggregate` reuses the existing post-process plumbing: it emits a sentinel during transform, and a resolver in `@refrakt-md/runes` (parallel to `resolveCollections` / `resolveRelationships`) walks the rendered tree at phase 4, queries the registry, computes counts and groupings, and substitutes the rendered output. The body source is captured via `deferBody` (same as `collection`) and re-transformed per group (and once for the preamble totals) with `$item` bound — reusing `transformDeferredTemplate` from `@refrakt-md/runes/deferred-body`.

## Acceptance Criteria

- [ ] `{% aggregate type=… filter=… /%}` (no body) emits a single integer — the count of entities matching the query — usable inline.
- [ ] With a body, the source splits on top-level `hr` into **preamble / template / fallback** zones; semantics match `collection` (preamble once when non-empty; template per group; fallback when empty).
- [ ] In the preamble, `$item` is bound to the totals projection (`total`, `done?`, `percent?`).
- [ ] In the template, `$item` is bound to the group projection (`key`, `count`, `shown`, `total`); the template is reparsed per group.
- [ ] In the fallback, `$item` carries a `total: 0`.
- [ ] `group` is optional — omit to render the body once with the totals projection.
- [ ] `sort` and `limit` apply over groups; `sort` honors {% ref "SPEC-072" /%} domain-aware ordering when the group field has one.
- [ ] Self-closing `empty="…"` attribute works as a string fallback (same as `collection`); the fallback zone wins when both are present.
- [ ] Resolves in post-process with the full registry; works on file-backed and dynamic routes alike.
- [ ] The proposed standalone `count` rune is withdrawn — Capability 1 replaces it.

## References

- {% ref "SPEC-070" /%} — `collection`, the family this joins; shares query grammar and zone semantics.
- {% ref "SPEC-072" /%} — domain-aware ordering used for `sort`; the per-group iteration held there is delivered here at a lower cost.
- {% ref "SPEC-075" /%} — comparable attribute types; this rune sidesteps the deferred-function ergonomic question via `$item` bindings inside the body.

{% /spec %}
