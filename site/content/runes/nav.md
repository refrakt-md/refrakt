---
title: Nav
description: One navigation primitive for sidebars, header menubars, footer columns, and section landings
---

# Nav

`nav` is the single primitive refrakt uses for every kind of structural navigation — sidebars, header menubars, footer link columns, and section landing pages. The content model is identical in every case (grouped or flat lists of links / page slugs); the `layout` attribute selects the presentation.

## Basic usage

Define groups with headings and page slugs as list items. Items before the first heading become top-level items rendered above any groups.

{% preview source=true %}

{% nav %}
- [Documentation](/docs/getting-started)

## Getting Started
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)

## Reference
- [CLI overview](/docs/cli/cli-overview)
- [Inspect](/docs/cli/inspect)
{% /nav %}

{% /preview %}

Each list item is a page slug (e.g., `getting-started`). Slugs resolve **at build time** against the nav's source file — a `{% nav %}` in `site/content/docs/_layout.md` resolves `- getting-started` to `/docs/getting-started`. The page's `title` frontmatter becomes the link text.

For pages in subdirectories, write a multi-segment slug: `themes/configuration` resolves to `/docs/themes/configuration`. For external URLs or anything outside the nav's source directory, use an explicit Markdown link `[Label](/path)`. Full rules and the build error format are documented in [Nav slug resolution](/docs/authoring/nav-slug-resolution).

Each rendered page evaluates every nav against its current URL. The exact-match item gets `aria-current="page"`; the longest-strict-prefix item (if any) gets `data-active="ancestor"`. Themes style both — Lumina ships visually-distinct treatments by default.

## Layouts

The `layout` attribute switches the presentation. All four layouts accept the same group + items content model.

### Vertical (sidebar)

The default — vertical sidebar with groups stacked top to bottom. This is the layout you place in your `_layout.md` `nav` region.

{% preview source=true %}

{% nav %}
## Getting Started
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)

## Authoring
- [Runes](/runes/rune-catalog)
- [Themes](/themes/themes-catalog)
{% /nav %}

{% /preview %}

### Menubar (header)

Horizontal bar where each group becomes a desktop dropdown trigger. Top-level items (before the first `##`) render flat as the primary links. Below the breakpoint the whole menubar collapses behind a hamburger button that the rune emits automatically.

```markdoc
{% nav layout="menubar" %}
- [Docs](/docs)
- [Blog](/blog)

## Product
- features
- runes

## Resources
- about
- changelog
{% /nav %}
```

Interaction (click to open, Escape / outside-click to close, full keyboard model) ships in `@refrakt-md/behaviors` — no per-page wiring needed.

### Columns (footer)

Column grid where each group becomes a footer column with the heading as the column title. Stacks to one column on narrow viewports.

```markdoc
{% nav layout="columns" %}
## Product
- features
- runes

## Resources
- about
- blog
- changelog

## Legal
- [Privacy](/privacy)
- [Terms](/terms)
{% /nav %}
```

### Cards (section landing)

Card grid for section landing pages. Each item is enriched at build time with the linked page's `title`, `description`, and `icon` from frontmatter — no per-item authoring required. Group headings become section titles above each card cluster.

```markdoc
{% nav layout="cards" %}
- getting-started
- runes
- layouts
- theming
{% /nav %}
```

Combine with `auto` to list the current page's children without naming each one:

```markdoc
{% nav layout="cards" auto=true /%}
```

External-URL items render as title-only cards with no enrichment.

### Strip (compact secondary nav)

Flat horizontal row of items — no groups, no panels. Use as a persistent secondary nav below the menubar, or nested inside a menubar panel footer slot for per-panel secondary links. Strip is flat by design and warns on `##` headings.

```markdoc
{% nav layout="strip" %}
- [Changelog](/releases)
- [Roadmap](https://plan.refrakt.md/refrakt-md/refrakt)
- [Status](https://status.refrakt.md)
{% /nav %}
```

## Rich menubar panels and column flow

Menubar `## groups` accept any block content — paragraphs, blockquotes, images, and nested `{% nav %}` runes — with a position-based intro / footer slot rule. The `columns` layout gains a `---`-between-sections column-flow rule plus a headingless mode for use inside menubar panels. Composed together they cover Linear / Vercel / Stripe-style mega menus without a separate `mega` layout.

See [Rich menubar panels and column flow](/docs/authoring/rich-menubar-panels) for the full composition guide.

## Collapsible sidebars

Add the `collapsible` modifier on a vertical nav to turn each group into a disclosure. The group containing the current page automatically expands on page load; all others start collapsed. Click a group title to toggle.

```markdoc
{% nav collapsible=true %}
## Getting Started
- getting-started
- install

## Authoring
- runes
- layouts
- theming
{% /nav %}
```

For the rare case where multiple groups should open by default, pass `defaultOpen` with a comma-separated list of group titles:

```markdoc
{% nav collapsible=true defaultOpen="Getting Started, Reference" %}
```

The keyboard model and ARIA wiring (`role="button"`, `aria-expanded`, `aria-controls`, focus ring) ship in `@refrakt-md/behaviors`.

## Frontmatter fields used by cards

The cards layout reads the following from each linked page's frontmatter:

```yaml
---
title: Getting Started
description: Install refrakt and build your first site
icon: rocket
---
```

- `title` — card heading. Required for sensible output.
- `description` — card body. Optional; the card renders title-only when missing.
- `icon` — icon name resolvable by the `{% icon %}` rune. Optional; the card renders without an icon when missing.

## Mobile behaviour

Lumina handles responsive behaviour without any author work:

- `menubar` collapses behind a hamburger button below the breakpoint. The button is emitted by the rune itself — themes show it via media query.
- `columns` stacks into a single column on narrow viewports.
- `cards` shifts to a single column below ~500px.
- `vertical collapsible` works the same on every viewport — the collapse / expand model is viewport-agnostic.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | `string` | `vertical` | Presentation: `vertical`, `menubar`, `columns`, or `cards` |
| `collapsible` | `boolean` | `false` | Make each group collapsible. Only meaningful with the default `vertical` layout. |
| `defaultOpen` | `string` | — | Comma-separated group titles to expand by default, overriding URL-driven auto-open |
| `auto` | `boolean` | `false` | List the current page's children automatically (combinable with any layout) |
| `ordered` | `boolean` | `false` | Use ordered list styling |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
