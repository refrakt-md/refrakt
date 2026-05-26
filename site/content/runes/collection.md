---
title: Collection
description: Render a list, grid, or table of registry entities — the plural counterpart to ref and expand, with filtering, sorting, grouping, and per-item templates
---

# Collection

`{% collection %}` queries the [entity registry](/extend/plugin-authoring/pipeline) for *many* entities and projects them into a layout. It's the plural counterpart to `{% ref %}` (one entity → a link) and `{% expand %}` (one entity → inlined content): where those consume a single entity, `collection` selects a set — by type, with a `field:value` filter, sorted/grouped/limited — and renders each item.

It's generic over entity type. Anything in the registry works the same way — plan `work` items, `page` entities, and any type a plugin registers — so a hand-maintained list that mirrors structured data becomes a live query instead.

{% preview source=true %}

{% collection type="work" filter="status:ready" sort="priority" limit=5 /%}

{% /preview %}

That renders every registered `work` entity whose `status` is `ready`, highest priority first (capped at five for this preview).

## Selecting entities — `type` + `filter`

`type` is the entity type (comma-separated for several: `type="work,bug"`). `filter` narrows the set with space-separated `field:value` clauses.

```markdoc
{% collection type="work" filter="status:ready priority:high priority:critical" /%}
```

### The field-match grammar

This is the canonical reference for the `field:value` syntax — the *same grammar and parser* used by `collection`'s `filter`, [`backlog`](/runes/plan/backlog)'s `filter`, and [`entityRoutes`](/extend/plugin-authoring/pipeline). The operator is chosen by the **shape of the value**, so the same string works in a markdoc attribute and in JSON config:

| Form | Example | Matches |
|------|---------|---------|
| **exact** | `status:ready` | the field equals `ready` |
| **glob** | `url:/blog/*` | `*` is any run of characters, anchored full-match (prefix, suffix, or infix) |
| **regex** | `id:/^SPEC-\d+$/` | a value wrapped in slashes (optional trailing flags); not auto-anchored |

Rules:

- **Same field repeated → OR**, **different fields → AND**: `status:ready status:review priority:high` means *(ready or review) and high*.
- **Quote values with spaces**: `title:"Getting Started"`.
- Matching is **case-sensitive**.
- A field resolves **top-level first** (`id`, `type`, `sourceFile`) then from the entity's `data`; **`url`** is an alias for the entity's resolved URL (`sourceUrl`, falling back to `data.url`). That's why `url:/blog/*` works — folder membership is just a URL prefix match, no special "folder" concept.
- Array-valued fields (e.g. `tags`) match on **membership** — any element matching the clause counts.
- A malformed clause (no colon, empty field) is ignored with a build warning. An empty `filter` matches everything.

## Sort, group, limit

```markdoc
{% collection type="work" sort="priority" group="status" limit=20 /%}
```

- **`sort`** — a field name. Prefix `-` (or suffix `-desc`) for descending: `sort="-date"` or `sort="date-desc"`. Numeric values sort numerically, otherwise lexically (ISO dates sort chronologically as strings).
- **`group`** — a field name; items are grouped under a heading per distinct value (empty values group under `(none)`).
- **`limit`** — a positive integer cap, applied after sort. With `group`, the cap is on the total item count.

## Layouts

`layout` controls **arrangement only** — item *chrome* comes from the item (see [Per-item templates](#per-item-templates)).

| `layout` | Arrangement | With no body template |
|----------|-------------|------------------------|
| `list` (default) | stacked | a compact title link per entity |
| `grid` | responsive multi-column | a generic auto-card (title link + projected `fields`) |
| `table` | aligned columns | columns from `fields` (or [heading-delimited columns](#table-columns)) |

> There is no `cards` layout — a card *gallery* is `grid` plus `{% card %}` items (see below). `layout` never auto-wraps your content in a card; you choose the chrome.

### Field projection — `fields`

`fields` is the zero-template shorthand for the no-body case: a comma-separated list of `data` fields rendered with humanized headers and default per-type formatting.

{% preview source=true %}

{% collection type="work" filter="status:ready" layout="table" fields="status,priority" limit=5 /%}

{% /preview %}

For anything richer than raw values (formatting, combining fields, a designed card), use a body template.

## Per-item templates

Give `collection` a **body** and it becomes the per-item template: the body is transformed once per entity with **`$item` bound** to that entity. The body is *raw* output arranged by `layout` — add a rune like `{% card %}` for chrome.

```markdoc
{% collection type="work" filter="status:ready" sort="priority" layout="grid" %}
{% card href=$item.url %}
### {% $item.data.title %}
Status: {% $item.data.status %} · Priority: {% $item.data.priority %}
{% /card %}
{% /collection %}
```

### The `$item` variable

`$item` is a read-only bound variable (like `$page` / `$file`), **not** a contract any rune implements:

| Field | Always present? | Notes |
|-------|-----------------|-------|
| `$item.id` | yes | the entity id |
| `$item.type` | yes | the entity type |
| `$item.url` | yes | resolved URL (`sourceUrl ?? data.url`); empty string, never undefined, when there's no on-site URL |
| `$item.data.*` | type-specific | the entity's payload. A missing field renders nothing (no warning) |

Payload fields are accessed under `.data` (e.g. `$item.data.title`) — there's no hoisting to `$item.title`, so a payload field can never shadow `id`/`type`/`url`.

### Cards are plain runes

The card in the example above (`{% card %}`) knows nothing about `$item`, the registry, or collection — the *template* wires entity fields into its attributes/body. So [`card`](/runes/card) stays a self-contained component you can also use standalone, and there's no per-entity `*-card` proliferation: a designed item is `{% card %}` (or another rune) fed by `$item`, not a bespoke `work-card`.

### Reusable templates — `item-template`

When the same template is reused across collections, point `item-template` at a markdoc partial instead of writing an inline body (mutually exclusive with an inline body):

```markdoc
{% collection type="page" filter="url:/blog/*" sort="date-desc" item-template="cards:post.md" /%}
```

…where `cards/post.md` contains the `{% card href=$item.url %}…{% /card %}` template. Same mechanism, different source.

## Table columns

In `table` layout, an empty body uses the `fields` shorthand. For labels, formatting, or combined columns, give the body **heading-delimited columns** — each heading is a column (label = heading text, in order), and the markdoc beneath it is that column's per-cell template with `$item` bound:

```markdoc
{% collection type="product" layout="table" sort="price" %}
## Product
[{% $item.data.title %}]({% $item.url %})

## Price
{% currency($item.data.price, $item.data.currency) %}

## Stock
{% if $item.data.stock %}{% $item.data.stock %} in stock{% else %}Out{% /if %}
{% /collection %}
```

Collection owns the `<table>` and header row; each `<td>` is the cell template rendered per entity. Column headings are static labels — `$item` belongs in the cell body, not the heading.

## Formatter functions

Value formatting is done with shared markdoc functions, usable **anywhere markdoc runs** — collection cells, body templates, `entityRoutes` render strings, ordinary content:

| Function | Example | Output |
|----------|---------|--------|
| `currency(amount, code?)` | `{% currency($item.data.price, "EUR") %}` | `€1,234.00` |
| `date(value)` | `{% date($item.data.published) %}` | `Jan 15, 2024` |
| `number(value)` | `{% number($item.data.views) %}` | `1,234,567` |
| `join(array, sep?)` | `{% join($item.data.tags, " · ") %}` | `a · b · c` |

Formatting lives in these functions, not in `fields` or a projection mini-language.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | — | Entity type(s) to query, comma-separated. (`show` is an alias.) |
| `filter` | string | — | `field:value` clauses (see [grammar](#the-field-match-grammar)). |
| `sort` | string | — | Sort field; `-field` / `field-desc` for descending. |
| `group` | string | — | Group-by field. |
| `limit` | number | — | Max items, applied after sort. |
| `fields` | string | — | Comma-separated `data` fields for the no-body built-in. |
| `layout` | `list` \| `grid` \| `table` | `list` | Arrangement. Item chrome comes from the item. |
| `item-template` | string | — | Partial used as the per-item template (mutually exclusive with an inline body). |

## Output contract

```html
<section class="rf-collection" data-rune="collection" data-type="work" data-layout="grid">
  <div class="rf-collection__items">
    <!-- grid / list built-in items -->
    <article class="rf-collection__card" data-entity-id="W-1">
      <a class="rf-collection__title" href="/work/W-1/">…</a>
      <span class="rf-collection__field" data-field="status">ready</span>
    </article>
    <!-- …or, with a body template, each item is the template's own output -->
    <div class="rf-collection__item" data-entity-id="W-1">…</div>
  </div>
</section>
```

When `group` is set, items are wrapped in `div.rf-collection__group[data-group]` with a `h3.rf-collection__group-title`. The `table` layout emits a `table.rf-collection__table` with `<thead>` + one `<tr data-entity-id>` per entity.

## See also

- [card](/runes/card) — the generic content card you feed with `$item` in a body template.
- [ref](/runes/xref) / [expand](/runes/expand) — the singular counterparts (one entity → a link / inlined content).
- [backlog](/runes/plan/backlog) — the plan-specific lister; uses the same filter grammar.
