---
title: Pagination
description: Sequential prev/next links for ordered docs and tutorials
icon: arrow-right
---

# Pagination

Sequential prev/next links for ordered reading flows — tutorials, ordered docs, recipes. Where `breadcrumb` shows hierarchy and `nav` shows the broader index, `pagination` covers the "next page" affordance for a reader moving through pages in order.

## Basic usage

Place `{% pagination auto /%}` in a `_layout.md` and every page in the cascade gets prev / next links derived from the active sidebar nav order. No per-page authoring needed.

```markdoc
{% region name="pagination" %}
{% pagination auto /%}
{% /region %}
```

The first page in the sequence gets no `prev` link; the last gets no `next` link. The wrapping nav still renders so theme spacing stays consistent.

## Explicit prev / next

When a page belongs to a sequence different from its directory siblings (a curated tutorial path, for instance), set prev and next explicitly:

```markdoc
{% pagination prev="install" next="configuration" /%}
```

Each value accepts either a slug (resolved through the registry) or an absolute URL. The link label defaults to the target page's `title` frontmatter — override per-side with `prev-label` and `next-label` if needed.

## Ordering

In `auto` mode, sibling order is determined by, in priority:

1. **Explicit nav order.** If a `nav` rune anywhere in the active layout cascade lists the current page among its items, that's the canonical reading order. Sidebar order automatically *is* the reading order — authors don't restate it.
2. **Frontmatter `order` field.** Numeric, ascending. Pages without `order` sort to the end.
3. **Directory order.** Alphabetical by URL slug. Numeric prefixes work (`01-intro` before `02-install`).

The first source that produces a definite position wins.

### scope

By default, auto-mode picks from the page's direct siblings — pages sharing the same parent URL. For tutorials that span nested subdirectories that should still be read in sequence, widen the candidate set with `scope="section"`:

```markdoc
{% pagination auto scope="section" /%}
```

`scope="section"` includes every page under the current top-level section (any page whose URL starts with the section root).

## Boundaries

There's no wrap-around. The first page in a sequence has no `prev` link; the last has no `next` link. The wrapping `<nav>` still renders in both cases so vertical spacing stays consistent.

When the current page is a section index (it has child pages), `auto` mode renders nothing — child cards or a sidebar do that job better than prev/next at the section root.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `auto` | `boolean` | `false` | Derive prev/next from sibling page order |
| `prev` | `string` | — | Explicit previous page (slug or URL). Skips auto mode. |
| `next` | `string` | — | Explicit next page (slug or URL). Skips auto mode. |
| `scope` | `string` | `siblings` | Auto-mode scope: `siblings` (direct page-tree siblings) or `section` (all pages in the top-level section) |
| `prev-label` | `string` | — | Override the label rendered for the previous link |
| `next-label` | `string` | — | Override the label rendered for the next link |

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
