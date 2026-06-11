---
title: Rune Catalog
description: Browse all available runes — core built-ins and official packages
---

# Rune Catalog

Runes are Markdoc tags that reinterpret standard Markdown. A heading inside `{% nav %}` becomes a group title; a list inside `{% recipe %}` becomes ingredients. Same primitives, different meaning based on context.

This catalogue is **generated from the registry**. Every `/runes/<name>` page declares itself a `rune` entity in its frontmatter (`type: rune`, plus `category`, `plugin`, and a `status` of `stable` · `beta` · `experimental` · `deprecated` — default `stable`), and the views below are live [`collection`](/runes/collection) and [`aggregate`](/runes/aggregate) queries over them. Add a doc page — or install a plugin that ships one — and it appears here automatically, with no hand-maintained list to fall out of date.

There are currently {% aggregate type="rune" /%} documented runes. Here's how they spread across the core library and the official plugins:

{% aggregate type="rune" group="plugin" layout="chart" chart-type="bar" chart-title="Runes per plugin" /%}

## All runes by category

Core runes ship built-in with `@refrakt-md/runes`; the rest come from official packages (see below). Each category maps to one source — core's functional groups (Content, Registry, Layout, Code & Data, Site) plus one group per plugin.

{% collection type="rune" group="category" sort="title" layout="table" %}
## Rune
{% link href=$item.url %}{% $item.data.title %}{% /link %}

## Description
{% $item.data.description %}
{% /collection %}

## Official packages

Official rune packages are maintained by the refrakt team and styled by the Lumina theme. Install the packages you need and add them to your config — each package page includes installation instructions, a full rune reference, and docs for any extras like CLI commands or pipeline hooks.

{% nav layout="cards" %}
- [@refrakt-md/marketing](/runes/marketing)
- [@refrakt-md/docs](/runes/docs)
- [@refrakt-md/design](/runes/design)
- [@refrakt-md/learning](/runes/learning)
- [@refrakt-md/storytelling](/runes/storytelling)
- [@refrakt-md/business](/runes/business)
- [@refrakt-md/places](/runes/places)
- [@refrakt-md/media](/runes/media)
- [@refrakt-md/plan](/runes/plan)
{% /nav %}
