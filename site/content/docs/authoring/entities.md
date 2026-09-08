---
title: Entities
description: What an entity is, where entities come from, and how the runes that query them fit together.
---

# Entities

Most of a refrakt site is pages. But some things on a page are *also* a thing in their own right — a spec, a character, a recipe, an API symbol. When a rune registers one of those, it becomes an **entity**: a named record the rest of the site can find, link to, count, and inline.

That's what makes this work:

```markdoc
{% collection type="recipe" filter="cuisine:thai" sort="title" /%}
```

You never told that page where the Thai recipes live. It asked the registry.

## What an entity is

Every entity has four things:

| | |
|---|---|
| **`type`** | The category — `spec`, `character`, `rune`, `page`. Queries are always scoped to a type. |
| **`id`** | Unique within its type. This is what `{% ref %}` and `{% expand %}` address. |
| **`url`** | Where it lives — the page it was registered from, or a [generated route](/docs/configuration/entity-routes). |
| **`data`** | Everything else: the fields the rune pulled out of your content. |

A query field resolves against the top-level three first (`id`, `type`, `sourceFile`), then falls through to `data`. `url` is an alias for the resolved URL. That's why `url:/blog/*` works as a filter — folder membership is just a URL prefix, not a separate concept.

## Where entities come from

Three sources, and you'll use all of them without thinking about it:

**Runes that register what they describe.** `{% spec %}`, `{% character %}`, `{% recipe %}`, `{% symbol %}` and friends put themselves in the registry. Write one on a page and it's queryable.

**Every page, automatically.** Each page registers itself as a `page` entity, which is what makes `{% collection type="page" filter="url:/blog/*" %}` work with no setup.

**Frontmatter, when you say so.** Give a page a `type` in its frontmatter and it registers as that type, with the rest of its frontmatter as `data`:

```yaml
---
title: Hint
type: rune
category: core
status: stable
---
```

That is the whole mechanism behind [the rune catalog](/runes/rune-catalog) — every `/runes/*` page declares `type: rune`, and the catalog is a `{% collection %}` over them. Add a page, it appears. To type a whole directory at once without touching each file, use a [route rule](/docs/configuration/sites) with an `entity` field.

## The four runes that read the registry

They differ in what they select and what they emit:

| Rune | Selects | Emits |
|---|---|---|
| [`ref`](/runes/xref) | one entity | a link |
| [`expand`](/runes/expand) | one entity | its content, inlined |
| [`collection`](/runes/collection) | many entities | a list, table, or cards |
| [`aggregate`](/runes/aggregate) | many entities | a count or a chart |
| [`relationships`](/runes/relationships) | the edges touching one entity | grouped links |

`collection`, `aggregate`, and `relationships` share one `field:value` filter grammar, documented in full on [`collection`](/runes/collection#the-field-match-grammar). The same filter string works in a rune attribute and in [`entityRoutes`](/docs/configuration/entity-routes) JSON.

## Embeddable entities

`{% expand %}` inlines an entity's actual content, so the entity has to be able to produce it. The plugin that registered it either hands over the content directly, or points at the source file and a way to pull the right subtree out of it.

Most first-party entity runes do this. Ones that don't — plain pages, headings — can be linked and counted, but not expanded. Trying anyway is a clear build error, not a silent empty block.

## Sort order

`collection` and `aggregate` sort enum fields in a meaningful order rather than alphabetically, so a `status` grouping reads `blocked → in-progress → review → ready → done` instead of `blocked, done, in-progress, ready, review`. The order comes from the rune's own attribute definition, and a plugin can override it for its domain — nothing to configure.

## Relationships

Entities can be connected by typed, directed edges — `implements`, `blocked-by`, `ally`. [`relationships`](/runes/relationships) renders the edges touching one entity, grouped by kind:

```markdoc
{% relationships id="SPEC-001" /%}
```

Which kinds exist depends on which plugins are installed; each plugin contributes the vocabulary for its own domain. `relationships` only renders the graph — it never builds it.

{% hint type="note" %}
Writing a rune that registers its own entities, contributes relationship edges, or builds a cross-page index? That's the [cross-page pipeline](/extend/plugin-authoring/pipeline), in the Extend handbook.
{% /hint %}
