---
title: Authoring site templates
description: Package a purpose-built site as a distributable template
---

# Authoring site templates

A **template** is a *site written for a purpose* — a content tree plus the
plugin/route/theme wiring that brief needs. Unlike themes and plugins (live
dependencies), a template is **scaffold-copied**: its content becomes the
author's to edit.

```bash
npx create-refrakt my-template --type template --scope @acme
```

## Package shape

```
my-template/
  template.json     — the manifest (below)
  content/          — the content tree copied into the project (fixed name)
  sandboxes/        — optional sandbox program sources (fixed name)
```

## The manifest

`template.json` is **metadata + a `site` SiteConfig partial**:

```jsonc
{
  "kind": "site",                       // only "site" today
  "name": "docs-starter",
  "title": "Documentation site",
  "description": "Multi-section docs with sidebar nav.",
  "category": "docs",
  "refrakt": ">=0.25 <0.26",            // validated at install (ADR-023)
  "site": {
    "theme": { "package": "@refrakt-md/lumina", "presets": ["@refrakt-md/lumina/presets/niwaki"] },
    "plugins": ["@refrakt-md/docs", "@refrakt-md/marketing"],
    "routeRules": [{ "pattern": "**", "layout": "docs" }]
  }
}
```

The `site` field is the **same shape as `refrakt.config.json`** — but it
**omits `contentDir` and `sandbox.dir`**. Those destinations are *install-derived*
from the framework starter and the target site key; an author can't know them
(and a hard-coded path would collide under a non-default site key). The package
always ships `content/` (and optional `sandboxes/`) under those fixed names.

## Two axes: framework × purpose

Installing composes three inputs:

```bash
npx create-refrakt my-site --framework svelte --template @acme/my-template
#                          └ adapter            └ purpose (bundled name | dir | package)
```

- `--framework` chooses the adapter (svelte/astro/next/nuxt/eleventy/html).
- `--template` chooses the purpose. The template's `site` config is
  framework-agnostic; the scaffolder injects the adapter wiring.

On install the template's `content/` is copied into the project, its `site`
config is merged into `refrakt.config.json`, and its `plugins` + `theme.package`
are pinned as dependencies.

## Stay theme-portable

Reference **built-in layouts** (`default`, `docs`, `blog-article`, `plan`) in
`routeRules` so the template renders under *any* theme. A theme-specific custom
layout couples the template to that theme — declare it a *required* pairing if
you do.

## Images without binaries

Reference images by logical key (`asset:hero.jpg@cover`) and seed the resolver
in `site.assets`. With no base URL configured the scaffolded site renders
shape-correct placeholders — zero bundled binaries. Set a base URL to light up
real images; there is no separate "demo build".

## Bundled sandboxes

Ship a `sandboxes/` program tree and `site.backgrounds` entries for a
runtime-bearing template (e.g. a visualizer hero). The runtime is CDN-loaded at
activation — no `npm install`, no build dependency.
