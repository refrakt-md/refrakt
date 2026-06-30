---
title: Add Plan to an Existing Site
description: Wire @refrakt-md/plan into a docs or marketing site you already have — plugin, config, per-entity routes, and dashboard runes
---

# Add Plan to an Existing Site

You don't need a separate project to publish a roadmap. If you already run a refrakt
site — docs, marketing, anything — you can add your `plan/` content to it: register the
plugin, point at the plan directory, generate a page per entity, and drop dashboard runes
onto any page.

This assumes an existing refrakt site with a `refrakt.config.json`. If you're starting
from scratch, [scaffold a plan site](/plan/docs/plan-site#scaffold-a-deployable-plan-site)
instead.

## 1. Install the plugin

```shell
npm install @refrakt-md/plan
```

Add it to your site's `plugins` array in `refrakt.config.json`:

```json
{
  "sites": {
    "main": {
      "plugins": ["@refrakt-md/plan"]
    }
  }
}
```

This registers the plan runes (`spec`, `work`, `bug`, `decision`, `milestone`) and the
aggregation runes (`plan-progress`, `plan-activity`, `backlog`, `decision-log`), plus the
cross-page pipeline that indexes your entities. See
[Plugins configuration](/docs/configuration/plugins) for the array's resolution rules.

## 2. Initialize the plan directory

If you don't already have a `plan/` tree, scaffold one:

```shell
npx refrakt plan init
```

This creates `plan/specs/`, `plan/work/`, etc. with example files, and (optionally) wires
your AI coding agent with plan context. See [`plan init`](/plan/docs/plan-cli#init) for the
flags and what it writes.

## 3. Tell refrakt where the plan lives

Add a `plan` section to `refrakt.config.json` so the CLI and the build agree on the
directory:

```json
{
  "plan": {
    "dir": "plan"
  }
}
```

`dir` defaults to `plan`, so this is only required if your plan lives elsewhere (e.g.
`"project/plan"`). See [Plan configuration](/docs/configuration/plan) for the full
resolution order.

## 4. Generate a page per entity

To give each spec, work item, bug, decision, and milestone its own URL, add an
`entityRoutes` block to your site config. This is the declarative way to turn registered
entities into pages — no hand-written route code:

```json
{
  "sites": {
    "main": {
      "plugins": ["@refrakt-md/plan"],
      "entityRoutes": [
        { "type": "spec",      "url": "/specs/{id}/",        "title": "{title}",        "render": "{% expand $item.id /%}" },
        { "type": "work",      "url": "/work/{id}/",         "title": "{id} — {title}", "render": "{% expand $item.id /%}" },
        { "type": "bug",       "url": "/bugs/{id}/",         "title": "{id} — {title}", "render": "{% expand $item.id /%}" },
        { "type": "decision",  "url": "/decisions/{id}/",    "title": "{title}",        "render": "{% expand $item.id /%}" },
        { "type": "milestone", "url": "/milestones/{name}/", "title": "{name}",         "render": "{% expand $item.name /%}" }
      ]
    }
  }
}
```

Each rule renders one page per matching entity, with `$item` bound to that entity so
`{% expand $item.id /%}` inlines its content. The adapter also back-fills each entity's
`sourceUrl` with the generated route, so a `{% ref %}` (or any entity cross-link) resolves
to the on-site page automatically. Adjust the `url` patterns to fit your site's URL scheme.
Full grammar: [`entityRoutes`](/docs/configuration/sites#generating-routes-from-entities--entityroutes).

## 5. Surface dashboards on any page

The aggregation runes work on any content page in your site — they read the site-wide
entity index, so they don't care where they're placed. Add a roadmap page (or a section of
an existing one):

```markdoc
---
title: Roadmap
---

# Roadmap

{% plan-progress /%}

## In the queue

{% backlog filter="status:ready" sort="priority" group="priority" /%}

## Recent decisions

{% decision-log sort="date" /%}
```

See the [plan rune reference](/runes/plan) for every aggregation rune and its options
(`backlog`, `decision-log`, `plan-progress`, `plan-activity`, `plan-history`).

## That's it

Your plan now renders as part of your existing site. Manage entities with the
[CLI](/plan/docs/plan-cli) as usual — `plan next`, `plan update`, `plan status` — and the
pages rebuild from `plan/` on every build.

## Next steps

- [Publish a plan site](/plan/docs/plan-site) — the standalone-site path, plus `plan serve`
  and `plan build` for quick local browsing.
- [Entities](/plan/docs/plan-entities) — the attributes and sections each entity type
  supports.
