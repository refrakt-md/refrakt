---
title: Publish a Plan Site
description: Scaffold a standalone deployable plan site, or wire plan routes into an existing refrakt site with entityRoutes — dashboards and a page per entity
---

# Publish a Plan Site

Your plan lives as Markdoc files in `plan/`. When you want to *see* it — a progress
dashboard, a browsable backlog, a page per work item — a plan site is just an ordinary
refrakt site. There are two ways to get one.

| You want… | Use |
|-----------|-----|
| A standalone site you own and deploy | [Scaffold a plan site](#scaffold-a-deployable-plan-site) |
| Plan pages inside a site you already run | [Add plan to an existing site](/plan/docs/plan-integrate) |

Either way you author dashboards with the plan [aggregation runes](/runes/plan) and get a
page per entity through `entityRoutes`, and you browse and ship with the standard adapter
dev server (`npm run dev`) and build (`npm run build`).

## Scaffold a deployable plan site

`npm create refrakt` can generate a full, runnable site whose content *is* your plan. Pass
`--type plan` together with a `--target` adapter:

```shell
npm create refrakt my-plan --type plan --target sveltekit
cd my-plan
npm install
npm run dev
```

Any adapter works as the target: `sveltekit`, `astro`, `next`, `nuxt`, `eleventy`, or
`html`.

> **Plan site vs. planning-only.** `--type plan` *with* a `--target` scaffolds a deployable
> site (this section). `--type plan` *without* a target scaffolds a planning-only project —
> just the `plan/` tree and the CLI, no site. See the [Overview](/plan/docs/plan-overview#quick-start)
> for the planning-only setup.

### What you get

```
my-plan/
  plan/                 entity sources — specs/, work/, bugs/, decisions/, milestones/
  plan-site/            authored dashboard pages (Markdoc)
  refrakt.config.json   plan plugin + entityRoutes wiring
  package.json          plan:* scripts + dev/build for the chosen adapter
```

The `plan/` tree is the source of truth — you manage it with the [CLI](/plan/docs/plan-cli)
exactly as in a planning-only project. The site reads those entities through refrakt's
registry: `entityRoutes` in `refrakt.config.json` generates a detail page per entity, and
the dashboard pages compose them into views.

### The dashboard

The generated overview page is built entirely from plan [aggregation runes](/runes/plan):

```markdoc
# Plan

## Progress

{% plan-progress /%}

## Recent activity

{% plan-activity limit=15 /%}

## Ready work

{% backlog filter="status:ready" sort="priority" group="priority" /%}

## Recent decisions

{% decision-log sort="date" /%}
```

Each rune resolves across your whole plan at build time. Add your own pages, filter the
backlog differently, or split views per milestone — it's an ordinary refrakt site.

### Per-entity pages

The scaffolded `refrakt.config.json` declares an `entityRoutes` rule per entity type, so
every spec, work item, bug, decision, and milestone gets its own URL:

```json
{
  "entityRoutes": [
    { "type": "spec",      "url": "/specs/{id}/",        "title": "{title}",        "render": "{% expand $item.id /%}" },
    { "type": "work",      "url": "/work/{id}/",         "title": "{id} — {title}", "render": "{% expand $item.id /%}" },
    { "type": "bug",       "url": "/bugs/{id}/",         "title": "{id} — {title}", "render": "{% expand $item.id /%}" },
    { "type": "decision",  "url": "/decisions/{id}/",    "title": "{title}",        "render": "{% expand $item.id /%}" },
    { "type": "milestone", "url": "/milestones/{name}/", "title": "{name}",         "render": "{% expand $item.name /%}" }
  ]
}
```

`{% expand $item.id /%}` inlines the entity's full content on its page. See
[`entityRoutes`](/docs/configuration/sites#generating-routes-from-entities--entityroutes)
for the full grammar.

### Deploy

Because the site is a standard adapter project, deploy it like any other refrakt site:
`npm run build` produces the adapter's output, which you host wherever that adapter
deploys. Commit `plan/` alongside the rest of your repo and your roadmap rebuilds with
every push.

## Next steps

- [Add plan to an existing site](/plan/docs/plan-integrate) — wire plan into a docs or
  marketing site you already have.
- [CLI Reference](/plan/docs/plan-cli) — every `refrakt plan` command for authoring and
  managing your plan.
