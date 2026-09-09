---
title: Entity routes
description: Generate one page per registered entity from refrakt.config.json, without writing a pipeline hook.
---

# Entity routes

`entityRoutes` turns entities in the [registry](/docs/authoring/entities) into pages. Each rule generates one page per entity matching its `type` — a specs index that materialises every `{% spec %}` as its own URL, a page per team member, a page per recipe.

It's a site-config field, so you don't need to write any code:

```json
{
  "site": {
    "contentDir": "./content",
    "entityRoutes": [
      { "type": "spec", "url": "/specs/{id}/", "title": "{title}", "render": "{% expand $item.id /%}" },
      { "type": "work", "filter": "status:ready", "url": "/work/{id}/", "render": "{% expand $item.id /%}" },
      { "type": "decision", "url": "/decisions/{id}/", "render-template": "templates:decision-page.md" }
    ]
  }
}
```

## Rule fields

| Field | Type | Description |
|-------|------|-------------|
| **`type`** | `string` | Entity type(s) the rule matches. Comma-separated for multiple. |
| **`url`** | `string` | Templated route, site-root-relative — the site's base path is applied for you. |
| `filter` | `string` | Narrows the match using the same `field:value` grammar as `{% collection %}`. |
| `title` | `string` | Templated page title. Falls back to the rendered content's first heading. |
| `render` | `string` | Inline Markdoc body for each generated page. |
| `render-template` | `string` | A Markdoc partial to use as the body instead of `render`. |
| `frontmatter` | `object` | Frontmatter for the generated page. |

`render` and `render-template` are mutually exclusive — set one or the other.

## Placeholders

`url`, `title`, and `frontmatter` interpolate `{name}` placeholders from the matched entity's fields:

```json
{ "type": "recipe", "url": "/recipes/{id}/", "title": "{title} — {cuisine}" }
```

`{id}` is always available; everything else comes from the entity's own data. Substituted values are URL-encoded per path segment, so a value containing a slash produces nested path segments rather than an escaped one.

## Page bodies

`render` is ordinary Markdoc, transformed once per entity with **`$item` bound** to that entity — the same contract as a [collection per-item template](/runes/collection#per-item-templates):

```json
{ "type": "spec", "url": "/specs/{id}/", "render": "{% expand $item.id /%}" }
```

So `{% expand $item.id /%}` inlines the entity's own content, and the shared formatter functions work here too:

```json
{ "render": "Published {% date($item.data.published) %} by {% $item.data.author %}" }
```

For anything longer than a line or two, point `render-template` at a partial instead. It resolves through [`fileRoots`](/docs/configuration/overview), so `"templates:decision-page.md"` works from any generated page:

```json
{ "type": "decision", "url": "/decisions/{id}/", "render-template": "templates:decision-page.md" }
```

{% hint type="note" %}
`{% expand %}` only works on entities that are **embeddable** — the plugin that registered them has to provide the content. Entities registered without it (plain pages, headings) produce a clear build error rather than an empty page. See [Entities](/docs/authoring/entities#embeddable-entities).
{% /hint %}

## Filtering

`filter` uses the `field:value` grammar documented on [`collection`](/runes/collection#the-field-match-grammar) — the same parser, so a filter string that works in a rune attribute works here unchanged:

```json
{ "type": "work", "filter": "status:ready", "url": "/work/{id}/" }
{ "type": "post", "filter": "tags:release", "url": "/releases/{id}/" }
```

## Generated pages become link targets

Each matched entity's `sourceUrl` is back-filled with the route the rule generated. That means `{% ref %}` and `{% xref %}` to that entity start preferring the on-site page over wherever the entity was originally defined — cross-references light up across the site as soon as the rule exists, with no per-link edits.

## When you need a hook instead

`entityRoutes` covers the "one page per entity" shape. Reach for a `contributePages` [pipeline hook](/extend/plugin-authoring/pipeline) when you need something it can't express — synthesising pages from an external API, one page per *group* of entities, or routes whose shape depends on cross-page aggregation.
