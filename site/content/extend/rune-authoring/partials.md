---
title: Partials
description: Reusable content fragments shared across pages
---

# Partials

Partials let you extract repeated content into separate files and include them anywhere. Instead of duplicating the same call-to-action, disclaimer, or author bio across multiple pages, write it once and reference it by name.

Partials use Markdoc's built-in `{% partial %}` tag. Content is inlined at parse time, so there is no runtime overhead.

## Setup

Create a `_partials/` directory at the root of your content directory. Each `.md` file inside becomes a named partial.

```
content/
├── _partials/
│   ├── cta.md
│   └── shared/
│       └── disclaimer.md
├── docs/
│   └── getting-started.md
└── _layout.md
```

Partial files are plain Markdown — no frontmatter required. They can contain any Markdoc content including runes.

```markdoc
**Ready to get started?** [Sign up today](/signup) and join thousands of happy users.
```

## Basic usage

Use the `{% partial %}` tag with a `file` attribute pointing to the filename relative to `_partials/`. The tag is self-closing.

```markdoc
{% partial file="cta.md" /%}
```

The partial's content is inserted directly into the page at that position. It behaves as if you had written the content inline.

## Subdirectories

Organize partials into subdirectories for larger sites. Reference them with the relative path from `_partials/`.

```markdoc
{% partial file="shared/disclaimer.md" /%}
```

## Passing variables

Pass data into a partial using the `variables` attribute. Inside the partial, access variables with the `$` prefix.

**Partial file** (`_partials/greeting.md`):

```markdoc
Welcome, {% $name %}! You're on the **{% $plan %}** plan.
```

**Usage:**

```markdoc
{% partial file="greeting.md" variables={name: "Sarah", plan: "Pro"} /%}
```

This renders as: "Welcome, Sarah! You're on the **Pro** plan."

## Nesting partials

Partials can include other partials. A shared header partial might pull in a logo partial and a navigation partial.

```markdoc
{% partial file="logo.md" /%}

{% partial file="nav-links.md" /%}
```

Avoid circular references — a partial that includes itself (directly or indirectly) will cause a parse error.

## How it works

Partials are resolved during the parse phase, before any rune transforms run. Each partial file is parsed into a Markdoc AST node and spliced into the page's AST wherever `{% partial %}` appears. This means:

- Runes inside partials work exactly as they would inline
- Headings in partials appear in the table of contents
- No extra network requests or runtime cost

## Editor support

The Refrakt language server provides full IDE support for partials:

- **Completions** — type `{% partial file="` and get autocomplete suggestions for available partial files
- **Diagnostics** — a warning appears if a referenced partial file does not exist, with suggestions for similar names
- **Go-to-definition** — jump directly to the partial source file from any `{% partial %}` tag
