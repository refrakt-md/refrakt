---
title: Rich menubar panels and column flow
description: How to compose Linear / Vercel / Stripe-style header dropdowns from the existing nav primitives — slot rule, column flow, strip layout, and mobile patterns
---

# Rich menubar panels and column flow

`{% nav layout="menubar" %}` is the same primitive that ships simple header dropdowns. The dropdown panel can be a flat list (the simple case) or a richly-composed area built from existing nav primitives — paragraphs, blockquotes, nested navs, images. This page shows how to compose Linear / Vercel / Stripe-style dropdowns and the structural rules that produce them.

The composition relies on three coordinated rules:

1. **Menubar `## groups` accept any block content.** Lists, paragraphs, blockquotes, images, nested `{% nav %}` runes — anything that can live inside a markdoc block.
2. **Position determines slot.** Within a `## group`, the first non-list content block becomes the panel's **intro** slot (a featured hero card or eyebrow). The last non-list block becomes the **footer** slot. Lists and middle content render as the panel's main body.
3. **`---` is a column boundary, scoped to the layout.** In `layout="columns"`, `---` between `##` sections opens a new column. In a headingless columns nav (used inside a menubar panel), `---` between flat items splits items into columns.

Plus a new `layout="strip"` for compact secondary link rows, and a generalised `auto=true` description / icon enrichment that applies to every layout.

## Simple menubar — unchanged

A flat dropdown still works exactly as it did. No `---`, no extra content, no nested navs — just `## group` + list of items.

{% preview source=true %}

{% nav layout="menubar" %}
- [Docs](/docs/getting-started)

## Product
- [Configuration](/docs/configuration/overview)
- [Themes](/docs/themes/overview)

## Resources
- [Blog](/blog)
- [Changelog](/releases)
{% /nav %}

{% /preview %}

## Adding a nested columns nav

To make a panel wider and split into multiple columns, drop a `{% nav layout="columns" %}` inside the `## group`. Use the headingless mode — `---` between flat items splits them into columns.

{% preview source=true %}

{% nav layout="menubar" %}
- [Docs](/docs/getting-started)

## Documentation

{% nav layout="columns" %}
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)
- [Authoring](/docs/authoring/authoring-overview)

---

- [Themes](/docs/themes/overview)
- [Adapters](/docs/adapters/adapters-overview)
- [Plugins](/docs/plugins)
{% /nav %}
{% /nav %}

{% /preview %}

The outer menubar automatically widens its panel to fit the nested grid.

## Intro slot — featured hero

Drop a blockquote at the top of a `## group` to mark a featured hero card. The blockquote becomes the intro slot; the theme styles it distinctly (accent border, card background) and the rest of the panel renders below.

{% preview source=true %}

{% nav layout="menubar" %}
- [Docs](/docs/getting-started)

## Docs

> [Documentation home](/docs/getting-started)
> Install refrakt and build your first site.

{% nav layout="columns" %}
- [Configuration](/docs/configuration/overview)
- [Authoring](/docs/authoring/authoring-overview)
- [Plugins](/docs/plugins)
{% /nav %}
{% /nav %}

{% /preview %}

## Intro slot — eyebrow paragraph

A plain paragraph at the top of a `## group` renders as a small uppercase eyebrow label above the panel content.

{% preview source=true %}

{% nav layout="menubar" %}
- [Docs](/docs/getting-started)

## Runes
For teams shipping documentation

{% nav layout="columns" %}
- [Rune catalog](/runes/rune-catalog)
- [Plugin authoring](/docs/plugins/authoring)
{% /nav %}
{% /nav %}

{% /preview %}

## Footer slot — secondary link

Content at the end of a `## group` (after all lists) becomes the panel's footer slot. Use a paragraph with a link for a "see all →" pattern, or nest a `{% nav layout="strip" %}` for multiple secondary links.

{% preview source=true %}

{% nav layout="menubar" %}
- [Docs](/docs/getting-started)

## Docs

{% nav layout="columns" %}
- [Configuration](/docs/configuration/overview)
- [Authoring](/docs/authoring/authoring-overview)
{% /nav %}

[See all docs →](/docs/getting-started)
{% /nav %}

{% /preview %}

## Per-item descriptions

Inline a paragraph (indented as a continuation) under any list item to give that item a description. Works in every layout. When the parent nav has `auto=true`, the description falls back to the linked page's frontmatter `description` for any item without an explicit paragraph.

{% preview source=true %}

{% nav layout="menubar" %}
- [Docs](/docs/getting-started)

## Product

{% nav layout="columns" %}
- [Configuration](/docs/configuration/overview)

  Set up sites, plugins, and themes.

- [Authoring](/docs/authoring/authoring-overview)

  Write content with Markdoc + runes.

- [Plugins](/docs/plugins)

  Extend refrakt with custom runes.
{% /nav %}
{% /nav %}

{% /preview %}

## Inline badges

The `{% badge %}` rune is recognised inside or after a nav item's link text. The engine attaches it to the item so themes can render it adjacent to the title.

{% preview source=true %}

{% nav layout="menubar" %}
- [Docs](/docs/getting-started)

## Runes

{% nav layout="columns" %}
- [Marketing](/runes/marketing) {% badge sentiment="positive" %}Popular{% /badge %}
- [Storytelling](/runes/storytelling)
- [Plan](/runes/plan) {% badge sentiment="caution" %}Beta{% /badge %}
{% /nav %}
{% /nav %}

{% /preview %}

## `layout="columns"` — multi-section column flow

The columns layout grows a `---` rule: between `##` sections at the nav's top level, `<hr>` opens a new column. Each column stacks one or more sections.

{% preview source=true %}

{% nav layout="columns" %}

## Product
- [Configuration](/docs/configuration/overview)
- [Authoring](/docs/authoring/authoring-overview)

## Tools
- [CLI overview](/docs/cli/cli-overview)
- [Inspect](/docs/cli/inspect)

---

## Themes
- [Themes catalog](/themes/themes-catalog)
- [Lumina](/themes/lumina)

## Adapters
- [SvelteKit](/docs/adapters/sveltekit)
- [Astro](/docs/adapters/astro)

---

## Resources
- [Blog](/blog)
- [Changelog](/releases)
{% /nav %}

{% /preview %}

Three columns: Product+Tools, Themes+Adapters, Resources. Backwards compatible — a columns nav with no `---` still gets one column per `##` section (the today's-behaviour case).

## `layout="strip"` — compact secondary nav

A flat horizontal row of items — no groups, no panels, just compact links. Useful as a persistent secondary nav below the menubar (Vercel / Stripe docs pattern) or nested inside a panel footer slot.

{% preview source=true %}

{% nav layout="strip" %}
- [Changelog](/releases)
- [Blog](/blog)
- [Docs](/docs/getting-started)
{% /nav %}

{% /preview %}

Strip is flat by design — it warns if `##` headings are present.

## Mobile collapse — Linear vs Vercel from structure

The mobile collapse pattern emerges from how you structured the panel, not from a `mobileCollapse` attribute.

**Linear-style** — the panel contains a headingless `columns` nav. On mobile, the menubar drawer opens and items render as a flat stack.

```markdoc
{% nav layout="menubar" %}
## Docs
{% nav layout="columns" %}
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)
{% /nav %}
{% /nav %}
```

**Vercel-style** — the panel contains a `columns` nav with `##` sub-sections and `collapsible=true`. On mobile, each sub-section becomes its own accordion.

```markdoc
{% nav layout="menubar" %}
## Docs
{% nav layout="columns" collapsible=true %}
## Documentation
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)

## Reference
- [API](/docs/api)
- [CLI](/docs/cli/cli-overview)
{% /nav %}
{% /nav %}
```

Both patterns work without any layout-level configuration — the structure dictates the behaviour.

## Resolution rules (any layout, `auto=true`)

For navs with `auto=true`, every item gets enriched from its linked page's frontmatter unless the author provided explicit overrides:

| Item shape                                                         | Title source          | Description source                  |
|--------------------------------------------------------------------|-----------------------|-------------------------------------|
| Plain slug (`plan`)                                                | Frontmatter `title`   | Frontmatter `description`           |
| Explicit link, no paragraph (`[Plan](/plan)`)                      | Link text             | Frontmatter `description` (if page) |
| Explicit link with paragraph                                       | Link text             | The paragraph (overrides frontmatter) |
| Slug with paragraph                                                | Frontmatter `title`   | The paragraph (overrides frontmatter) |
| Any item, badge appended (`item {% badge %}…{% /badge %}`)         | (unchanged)           | (unchanged) — badge renders next to title |

## See also

- [Nav slug resolution](/docs/authoring/nav-slug-resolution) — how slugs become URLs at build time, multi-segment slugs, error format, active state
- The `nav` rune reference for the full attribute table
- The `badge` rune reference for sentiment / rank / type combinations
