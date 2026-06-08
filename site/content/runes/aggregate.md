---
title: Aggregate
description: Project numbers from the registry — counts and per-group breakdowns — the number-projecting counterpart to collection and relationships, with field-match queries and a sub-filter that drives progress-bar ratios
---

# Aggregate

`{% aggregate %}` queries the [entity registry](/extend/plugin-authoring/pipeline) and projects **numbers** — counts (and, in time, sums / averages) over the same `field:value` grammar [`collection`](/runes/collection) and [`relationships`](/runes/relationships) use. It's the third sibling in that family:

- [`collection`](/runes/collection) projects **items** — entities.
- [`relationships`](/runes/relationships) projects **edges** — graph links.
- `aggregate` projects **numbers** — counts and per-group breakdowns.

Two modes from one rune. With **no body** it's a single inline integer (`{% aggregate type="work" filter="status:done" /%}` renders one number in prose). With a body, it iterates groups and binds a per-group projection to `$item` — same body-zone convention as `collection`, with the iteration moved from entities to groups.

Because `aggregate` resolves in **post-process** — like `collection` and `relationships` — it sees the full cross-page registry. It works on **file-backed pages and dynamic entity routes alike**, and on every page in the site, not only the route a particular plugin generates.

## Single-number form

The self-closing form emits one integer: the count of entities matching the query.

{% preview source=true %}

Of {% aggregate type="work" /%} work items, {% aggregate type="work" filter="status:done" /%} are done.

{% /preview %}

Same `type` + `filter` attributes as `collection` (and the same [field-match grammar](/runes/collection#the-field-match-grammar)). Multiple types compose via comma:

```markdoc
{% aggregate type="work,bug" filter="status:done" /%}
```

The output is a `<span class="rf-aggregate" data-aggregate="count">N</span>` — inline-safe in prose.

## Body-zoned form

Give `aggregate` a body and it iterates — but unlike `collection`, the iteration runs over **groups**, not entities. The body splits on a top-level `---` into up to three zones (same convention as [`card`](/runes/card) and [`collection`](/runes/collection#body-zones--preamble-template-fallback)), and **`$item` binds differently in each**:

| Zone | When rendered | `$item` |
|------|---------------|---------|
| **preamble** | once, above the breakdown, only when the query is non-empty | totals projection — `{ count, value, percent, total }` |
| **template** | once **per group** — the rune's main output | per-group projection — `{ key, count, value, percent, total, shown }` |
| **fallback** | once, in place of the breakdown, only when the query is empty | all zeros |

A canonical body — totals progress bar above, one badge per status below, fallback when empty:

```markdoc
{% aggregate type="work" value="status:done" group="status" %}
{% progress value=$item.value max=$item.count %}Progress{% /progress %}
---
{% badge data-status=$item.key %}{% $item.count %} of {% $item.total %} {% humanize($item.key) %}{% /badge %}
---
Nothing to report.
{% /aggregate %}
```

The zone positioning is the same as `collection`: **1 zone → template**, **2 → preamble + template**, **3 → preamble + template + fallback**. A `---` *inside* a nested rune isn't a delimiter — only top-level rules split.

### The `$item` projection

`$item` is a read-only bound variable in every zone. The keys depend on the zone:

| Field | Preamble | Template | Fallback | Meaning |
|-------|:--:|:--:|:--:|---------|
| `count` | ✓ | ✓ | `0` | entities in this zone's context (preamble: the whole primary set; template: this group) |
| `value` | ✓ | ✓ | `0` | entities matching both `filter` *and* `value` (see below); falls back to `count` when `value` is unset |
| `percent` | ✓ | ✓ | `0` | `(value / count) × 100`, integer 0–100; `100` when `value` is unset |
| `total` | ✓ | ✓ | `0` | the **all-groups** total — equal to `count` in the preamble, constant across template iterations |
| `key` | — | ✓ | `''` | the group field value (template only) |
| `shown` | — | ✓ | `0` | post-`limit` group count (template only) |

The two count-shaped fields read differently:

- **`count`** is the **in-context** denominator — the entire primary set in the preamble, the current group's count in the template. It's the natural `max` for a progress bar.
- **`total`** is the **all-groups** constant — the same number in every template iteration. Useful for share-of-total ratios in a per-group template (`"3 of 12"`), without a second query.

In the preamble there's no in-context vs global distinction (you're not iterating), so `count === total` in that zone.

## The `value` sub-filter — driving progress ratios

The `value` attribute is a **secondary `field:value` clause** within the primary set defined by `filter` — the "achieved" subset that powers a progress-bar ratio without a second query.

{% preview source=true %}

{% aggregate type="work" value="status:done" %}
{% progress value=$item.value max=$item.count %}Done so far{% /progress %}
{% /aggregate %}

{% /preview %}

The primary set here is "every `work` entity"; the achieved subset is "those whose `status` is `done`". The progress bar reads `$item.value` (achieved) over `$item.count` (primary), with `$item.percent` available as the rounded integer 0–100.

Without a `value` attribute the rune is a pure count + breakdown — no progress semantics — and `$item.value` falls back to `count` (so a template using `$item.value` keeps working; `$item.percent` reads `100`).

## Grouping — `group`

Set `group` and the template is rendered once per distinct value of that field, with the group projection on `$item`:

{% preview source=true %}

{% aggregate type="work" value="status:done" group="status" %}
---
{% badge data-status=$item.key %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
{% /aggregate %}

{% /preview %}

Group order follows the same [domain-aware ordering](/runes/collection#domain-aware-ordering) `collection` uses — enum fields like `status` come out in their declared order, not alphabetically. Across mixed types (`type="work,bug"`), each entity is ranked within its own type's ordering, so the groups still compose.

Omit `group` and the body renders **once** with the totals projection on `$item` — the ungrouped form is what you want when the body is a single composed element from a totals-only query (e.g. just a progress bar).

## Sort and limit — operate on groups

```markdoc
{% aggregate type="work" group="status" sort="-count" limit=3 /%}
```

- **`sort`** — orders groups. Accepts `key` (the group value; honors domain ordering when the group field has one), `count`, `value`, or `percent`; prefix `-` (or suffix `-desc`) for descending.
- **`limit`** — a positive integer cap on the number of groups, applied after sort.

In the per-group template, `$item.shown` is the post-`limit` group count — the same number in every iteration.

## Chart layout — `layout="chart"`

Add `layout="chart"` and the grouped counts render as a chart instead of a body — `aggregate` builds the data and hands it to the [`chart`](/runes/chart) rune's pipeline (an SVG, with a no-JS `<table>` fallback). One bar (or point) per group, in the same domain-aware order:

{% preview source=true %}

{% aggregate type="work" group="status" layout="chart" chart-title="Work by status" /%}

{% /preview %}

- **`chart-type`** — `bar` (default), `line`, `area`, or `pie`.
- **`chart-title`** — rendered as the chart caption.
- Add a **`value`** sub-filter to chart a second series (the achieved count per group) beside the totals.
- An empty query renders the `empty` fallback, never a broken chart.

No body is needed — `aggregate` supplies the data table. Chart appearance (palette, geometry, sentiment colouring) comes from the chart rune's `--rf-chart-*` theming contract.

## Empty state

When the primary set is empty:

- A **fallback zone** (third body zone, or the leading-empty form `--- template --- fallback`) wins, with `$item` bound to all zeros.
- Otherwise the **`empty`** attribute is a one-line text fallback for the self-closing form.
- With neither, the rune renders nothing.

```markdoc
{% aggregate type="work" filter="status:zzz" empty="Nothing yet." /%}
```

Precedence matches [`collection`](/runes/collection#body-zones--preamble-template-fallback): the body fallback zone wins when both are present.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | — | Entity type(s) to query, comma-separated. |
| `filter` | string | — | `field:value` clauses defining the **primary set** being measured (see [grammar](/runes/collection#the-field-match-grammar)). |
| `value` | string | — | Optional secondary `field:value` clause defining the **achieved subset** within `filter`. Drives `$item.value` and `$item.percent`. |
| `group` | string | — | Group-by field; omit to render once with totals. |
| `sort` | `key` \| `count` \| `value` \| `percent` | — | Sort groups; prefix `-` for descending. Honors domain-aware ordering when sorting by `key`. |
| `limit` | number | — | Max groups, applied after sort. |
| `empty` | string | — | Fallback text shown when the query yields nothing (self-closing form; body form uses a fallback zone). Absent → render nothing. |

## Output contract

The body form:

```html
<section class="rf-aggregate" data-rune="aggregate" data-aggregate="breakdown">
  <div class="rf-aggregate__preamble" data-name="preamble">…</div>
  <div class="rf-aggregate__items" data-name="items">
    <div class="rf-aggregate__group" data-group="done" data-block>…</div>
    <div class="rf-aggregate__group" data-group="ready" data-block>…</div>
  </div>
</section>
```

The single-number form:

```html
<span class="rf-aggregate" data-rune="aggregate" data-aggregate="count" data-count="42">42</span>
```

When the query is empty, `__items` is replaced by `<div class="rf-aggregate__empty" data-name="empty">…</div>` (rendered from the fallback zone or the `empty` attribute).

## See also

- [collection](/runes/collection) — the sibling that projects items; shares the field-match grammar and zone semantics.
- [relationships](/runes/relationships) — the sibling that projects edges; shares the body-zone semantics.
- [progress](/runes/progress) — the typical preamble companion; feed it `value=$item.value max=$item.count`.
- [badge](/runes/badge) — the typical per-group template companion; the chip per group.
- [humanize](/runes/collection#formatter-functions) — turn raw keys (`in-progress`) into display labels ("In Progress") inside a template.
