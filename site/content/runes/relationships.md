---
title: Relationships
description: Render an entity's relationship edges, grouped by kind — the plural-graph counterpart to ref and expand, generic over any domain's relationship vocabulary
category: Reuse & references
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:relationships"} /%}

`{% relationships %}` renders the **relationship edges** of one entity — what it implements, what blocks it, who it allies with — grouped by kind. It's the graph counterpart to [`collection`](/runes/collection): where `collection` selects a *set* of entities by a `field:value` query, `relationships` projects the *edges* touching a single entity, read from the registry's [relationship graph](/docs/authoring/entities#relationships).

It's generic over the edge **kind**, which is an arbitrary string. Plugins contribute edges with their own vocabulary — plan emits `implements` / `blocked-by` / `depends-on`, storytelling's [`bond`](/runes/storytelling/bond) emits its `type` (`ally`, `rival`, `mentor`, …) — and `relationships` groups and labels whatever it finds. There is one generic rune, not a per-domain `*-relationships`.

## Selecting edges — `of` + `kind`

`of` is the entity to describe, passed **explicitly** as an id (or a bound entity). With no body, edges are grouped by kind, each rendered as a title link to the related entity — the zero-config built-in:

{% preview source=true %}

	{% relationships of="WORK-259" /%}

{% /preview %}

Group headings are the kinds, humanized via the shared [`humanize`](/runes/collection#formatter-functions) function (`blocked-by` → "Blocked By") — no per-domain label table.

`kind` narrows to specific edge kinds (comma-separated), and `type` restricts the *related* entity types: `kind="blocks,blocked-by" type="work,bug"` keeps only dependency edges to work items and bugs. On a generated entity page, pass the page entity as `of=$item.id` — the same binding you'd hand to [`expand`](/runes/expand).

## How Markdown is read

The body, when you give one, is a template rather than content to show as written:

| You write | It becomes |
|-----------|------------|
| A body with no `---` | The template, rendered once per edge |
| A body split by one `---` | A preamble (above the edges, shown only when there are any), then the template |
| A second `---` | The part after it is the fallback, shown when there are no edges |
| A `---` inside a nested tag such as `{% card %}` | Part of that tag; it does not split the body |

## Per-item templates

Give `relationships` a **body** and it becomes the per-edge template, transformed once per edge with **`$item`** bound to the related entity (the same contract as `collection` — `id`/`type`/`url`/`data`) and **`$kind`** bound to the edge kind:

{% preview source=true %}

	{% relationships of="SPEC-066" type="work,bug" layout="grid" %}
		{% card href=$item.url %}
		{% humanize($kind) %}
		### {% $item.data.title %}
		Status: {% $item.data.status %}
		{% /card %}
	{% /relationships %}

{% /preview %}

Because `$item` means the same thing here as in a `collection` body, the **same card partials are reusable across both runes** — a `work-card.md` partial works whether it's fed by a collection query or a relationship edge.

## Grouping and ordering

- **`group`** — defaults to `kind` (a heading per edge kind). Use `group="type"` to group by the related entity's type, or `group="none"` for a flat list.
- **`group-display`** — `headings` (default) or `accordion`, exactly as in [`collection`](/runes/collection#group-display-headings-or-accordion): `accordion` renders each group as a collapsible native `<details>` panel styled like the [`accordion`](/runes/accordion) rune, collapsed, with the group's edge count beside its label.
- **`sort`** — a field on the *related* entity (`-field` / `field-desc` for descending). Enum fields honor the same [domain-aware ordering](/runes/collection#sort-group-limit) as `collection`.
- **`limit`** — a positive integer cap.
- **`layout`** — `list` (default, stacked) or `grid` (responsive multi-column), mirroring [`collection`](/runes/collection#layouts). With `group`, the grid arranges each group's edges into columns (the group title spans the row); item chrome comes from the item — the no-body built-in becomes a card, or use a `{% card %}` in the body template.

## Empty state and body zones

Like [`collection`](/runes/collection), `relationships` supports an empty state and `---`-delimited body zones. The self-closing form takes an `empty` fallback, shown when the entity has no matching edges:

{% preview source=true %}

	{% relationships of="SPEC-066" kind="blocked-by" empty="Nothing blocks this spec." /%}

{% /preview %}

With a body, split on a top-level `---` into **preamble** (rendered above the edges only when there are any), **template** (the per-edge template), and **fallback** (shown when there are none) — so a "Relationships" heading can live inside the rune and disappear when the entity has no edges. The preamble and fallback can read `$count` (edges matched, pre-limit) and `$shown` (edges rendered, post-limit), just as in [`collection`](/runes/collection#count-variables-count-and-shown).

## Where edges come from

`relationships` only *renders* the graph — it doesn't build it. Plugins contribute edges during the registry's aggregate phase, so the kinds you see depend on which plugins are installed. See [plugin authoring → pipeline](/extend/plugin-authoring/pipeline) for the `relate()` / `getRelated()` contract.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:relationships"} /%}

## See also

- [collection](/runes/collection) — the field-query counterpart; shares `$item`, layout, grouping, and ordering.
- [ref](/runes/xref) / [expand](/runes/expand) — the singular counterparts (one entity → a link / inlined content).
- [card](/runes/card) — the generic content card you feed with `$item` in a body template.
