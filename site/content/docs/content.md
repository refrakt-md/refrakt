---
title: Content & Routing
description: Frontmatter fields, URL routing, layout cascade, and content organization
---

# Content & Routing

This page covers how refrakt.md turns a directory of Markdown files into a routed site — frontmatter fields, URL generation, the layout cascade, and content organization.

## Frontmatter

Every Markdown file can have YAML frontmatter between `---` delimiters:

```markdoc
---
title: My Page
description: A short summary for SEO and navigation
---

Page content starts here.
```

Every field is optional, and you can add arbitrary custom fields — runes and pipeline hooks can read them.

The ones refrakt itself reads are listed in the **[frontmatter reference](/docs/authoring/frontmatter)**, generated from the schema. Two worth knowing early, because they turn up in the rest of this page: `slug` overrides the computed URL (see [Routing](#routing)), and `draft` keeps a page out of the build (see [Drafts](#drafts)).

## Indenting nested runes

A rune's content may be indented, with tabs or spaces, to show what it nests. In refrakt an indented line is never a code block, as it would be in plain Markdown. For code, use a fenced block (```` ``` ````).

The convention is to indent a rune's content by one tab **only when the rune holds another block rune**. Content that is only prose stays flat. [`refrakt format`](/docs/cli/format) applies the rule, and `refrakt format --check` verifies it in CI.

## Routing

URLs are derived from file paths with three transformations applied in order:

1. The `.md` extension is stripped
2. `index.md` files become the directory root (e.g., `docs/index.md` → `/docs/`)
3. Numeric prefixes on path segments are stripped (e.g., `01-getting-started.md` → `/getting-started`)

### Examples

| File path | URL |
|-----------|-----|
| `index.md` | `/` |
| `docs/getting-started.md` | `/docs/getting-started` |
| `docs/index.md` | `/docs/` |
| `blog/01-first-post.md` | `/blog/first-post` |

### Slug overrides

The `slug` frontmatter field overrides the computed URL:

```yaml
---
slug: /custom/path
---
```

- **Absolute slugs** (starting with `/`) replace the entire URL
- **Relative slugs** are prefixed with the base path

### Route rules

The `routeRules` field in `refrakt.config.json` maps URL patterns to theme layouts. Rules are evaluated in order — first match wins:

```json
{
  "routeRules": [
    { "pattern": "docs/**", "layout": "docsLayout" },
    { "pattern": "blog/**", "layout": "blogArticleLayout" },
    { "pattern": "**", "layout": "defaultLayout" }
  ]
}
```

Route rules control which **theme layout** (the framework-level page shell) wraps the page. They're separate from the content layout cascade described below.

## Layout cascade

Layouts are defined in `_layout.md` files that cascade down directory trees. Every page inherits from all `_layout.md` files in its ancestor directories, from the content root down to its own directory.

### How inheritance works

Given this structure:

```
content/
├── _layout.md          ← root layout
├── index.md
└── docs/
    ├── _layout.md      ← docs layout
    ├── getting-started.md
    └── guides/
        ├── _layout.md  ← guides layout
        └── intro.md
```

The page `docs/guides/intro.md` inherits from three layouts in order:

1. `content/_layout.md` (root)
2. `content/docs/_layout.md` (docs)
3. `content/docs/guides/_layout.md` (guides)

### Regions

Each `_layout.md` fills named regions (`header`, `nav`, `sidebar`, `footer`, …) with `{% layout %}` and `{% region %}`. A child layout's region replaces the parent's region of the same name by default, or adds to it with `mode="prepend"` / `mode="append"`. The syntax and the merge modes are on the [Layout & Region](/runes/layout) rune page.

## Drafts

Setting `draft: true` in frontmatter marks a page as a draft:

```yaml
---
title: Work in Progress
draft: true
---
```

Draft pages are still processed and included in the content tree, but the draft flag is preserved in the page data. How drafts are handled depends on the adapter — typically they're visible in dev mode but excluded from production builds.

## Redirects

The `redirect` field generates a redirect from the current URL to the target:

```yaml
---
title: Old Page
redirect: /new-location
---
```

The page is still processed but adapters emit the appropriate redirect mechanism (HTTP redirect, meta refresh, etc.) instead of rendering the page content.

## Navigation ordering

The `order` field controls where a page appears in navigation lists and sequential pagination:

```yaml
---
title: Introduction
order: 1
---
```

Pages with `order` are sorted numerically. Pages without `order` fall back to alphabetical sorting by file path. Numeric prefixes in file names (e.g., `01-intro.md`) are stripped from URLs but do **not** set `order` — use the frontmatter field for explicit control.

## Partials

Reusable content blocks can be defined in a `_partials/` directory and included in any page. See [Partials](/docs/authoring/partials) for details.

## What else is in the Authoring guide

This page covers how files become routed pages. The rest of the authoring surface:

{% nav layout="cards" %}
- authoring/frontmatter
- authoring/variables
- authoring/partials
- authoring/page-sections
- authoring/entities
- authoring/tint
- authoring/nav-slug-resolution
- authoring/rich-menubar-panels
{% /nav %}
