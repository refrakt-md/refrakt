---
title: Relationships
description: Render an entity's relationship edges, grouped by kind — the plural-graph counterpart to ref and expand, generic over any domain's relationship vocabulary
---

# Relationships

`{% relationships %}` renders the **relationship edges** of one entity — what it implements, what blocks it, who it allies with — grouped by kind. It's the graph counterpart to [`collection`](/runes/collection): where `collection` selects a *set* of entities by a `field:value` query, `relationships` projects the *edges* touching a single entity, read from the registry's [relationship graph](/extend/plugin-authoring/pipeline).

It's generic over the edge **kind**, which is an arbitrary string. Plugins contribute edges with their own vocabulary — plan emits `implements` / `blocked-by` / `depends-on`, a storytelling plugin might emit `ally` / `rival` / `mentor` — and `relationships` groups and labels whatever it finds. There is one generic rune, not a per-domain `*-relationships`.

## Selecting edges — `of` + `kind`

`of` is the entity to describe, passed **explicitly** as an id (or a bound entity). On a generated entity page you pass the page entity — the same `$item.id` you'd hand to [`expand`](/runes/expand):

```markdoc
{% relationships of=$item.id /%}
```

`kind` narrows to specific edge kinds (comma-separated); `type` restricts the *related* entity types:

```markdoc
{% relationships of=$item.id kind="blocks,blocked-by" type="work,bug" /%}
```

With no body, edges are grouped by kind, each rendered as a title link to the related entity — the zero-config built-in:

```
Implements      → SPEC-001 Auth system
Blocked by      → WORK-014 Token store
Related         → ADR-003 Session strategy
```

Group headings are the kinds, humanized via the shared [`humanize`](/runes/collection#formatter-functions) function (`blocked-by` → "Blocked By") — no per-domain label table.

## Per-item templates

Give `relationships` a **body** and it becomes the per-edge template, transformed once per edge with **`$item`** bound to the related entity (the same contract as `collection` — `id`/`type`/`url`/`data`) and **`$kind`** bound to the edge kind:

```markdoc
{% relationships of=$item.id kind="blocks,blocked-by" layout="grid" %}
{% card href=$item.url %}
{% humanize($kind) %}
### {% $item.data.title %}
Status: {% $item.data.status %}
{% /card %}
{% /relationships %}
```

Because `$item` means the same thing here as in a `collection` body, the **same card partials are reusable across both runes** — a `work-card.md` partial works whether it's fed by a collection query or a relationship edge.

## Grouping and ordering

- **`group`** — defaults to `kind` (a heading per edge kind). Use `group="type"` to group by the related entity's type, or `group="none"` for a flat list.
- **`sort`** — a field on the *related* entity (`-field` / `field-desc` for descending). Enum fields honor the same [domain-aware ordering](/runes/collection#sort-group-limit) as `collection`.
- **`limit`** — a positive integer cap.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `of` | string | — | Entity to describe — an id (e.g. `of=$item.id`) or a bound entity. Required for output. |
| `kind` | string | — | Edge kinds to include, comma-separated. |
| `type` | string | — | Restrict related entity types, comma-separated. |
| `group` | `kind` \| `type` \| `none` | `kind` | Grouping. |
| `sort` | string | — | Sort related entities by a field. |
| `limit` | number | — | Max edges. |
| `fields` | string | — | Comma-separated `data` fields for the no-body built-in. |

## Output contract

```html
<section class="rf-relationships" data-rune="relationships" data-of="WORK-1">
  <div class="rf-relationships__items">
    <div class="rf-relationships__group" data-group="implements">
      <h3 class="rf-relationships__group-title">Implements</h3>
      <div class="rf-relationships__item" data-entity-id="SPEC-1" data-kind="implements">
        <a class="rf-relationships__title" href="/specs/SPEC-1/">Auth system</a>
      </div>
    </div>
    <!-- …or, with a body template, each item is the template's own output -->
  </div>
</section>
```

## Where edges come from

`relationships` only *renders* the graph — it doesn't build it. Plugins contribute edges during the registry's aggregate phase, so the kinds you see depend on which plugins are installed. See [plugin authoring → pipeline](/extend/plugin-authoring/pipeline) for the `relate()` / `getRelated()` contract.

## See also

- [collection](/runes/collection) — the field-query counterpart; shares `$item`, layout, grouping, and ordering.
- [ref](/runes/xref) / [expand](/runes/expand) — the singular counterparts (one entity → a link / inlined content).
- [card](/runes/card) — the generic content card you feed with `$item` in a body template.
