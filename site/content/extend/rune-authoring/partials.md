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

## Namespaced partials via file roots

In addition to the site-local `_partials/` directory, refrakt supports **file roots** — named directories declared in `refrakt.config.json` (or by plugins) that any page can reach via a `namespace:filename` syntax.

This is the right tool when:

- A monorepo has multiple sites that share chrome (the same footer / disclaimer / CTA across `docs/`, `marketing/`, and `blog/`).
- A plugin ships content fragments the user's pages need to embed.
- Legal text, examples, or generated content lives outside any site's content tree.

### User configuration

Register file roots in `refrakt.config.json`. Keys are namespace names; values are paths relative to the config file's directory (the project root).

```jsonc
{
  "sites": { "docs": { /* … */ }, "marketing": { /* … */ } },
  "fileRoots": {
    "shared": "_shared-partials",
    "legal": "../legal-snippets"
  }
}
```

Reference them with the namespace prefix:

```markdoc
{% partial file="shared:footer.md" /%}
{% partial file="legal:terms.md" /%}

{# Subdirectories within a file root work too #}
{% partial file="shared:hero/welcome.md" /%}
```

### Plugin-registered file roots

Plugins can ship their own file roots via the `Plugin.fileRoots` field. Once the plugin is installed, its namespace is reachable from any page in the project — no user configuration needed.

```ts
import type { Plugin } from "@refrakt-md/types";

export const plugin: Plugin = {
  name: "@refrakt-md/plan",
  // ... runes, theme, pipeline ...
  fileRoots: {
    plan: "../../plan",  // relative to the plugin package's own directory
  },
};
```

A user site that depends on the plan plugin can then write `{% partial file="plan:SPEC-066-expand-rune.md" /%}` and have the spec embedded directly.

### Resolution rules

| Input | Resolution |
|-------|-----------|
| `footer.md` (no colon) | Site-local `_partials/footer.md`. |
| `shared:footer.md` | Look up `shared` in the merged file-roots map; resolve `footer.md` from that directory. |
| `unknown:foo.md` | Build error: namespace not registered; the error lists the available namespaces. |
| `shared:missing.md` | Build error: file not found in the named root. |
| `shared:../escape.md` | Build error: path escapes the named root. |
| `shared:/abs.md` | Build error: absolute paths not permitted in namespaced references. |

### Collision rules

- **User config wins** if both user config and a plugin register the same namespace. The plugin's contribution is silently dropped, with a dev-time warning naming the namespace.
- **Plugin vs. plugin** collisions are a hard error at plugin load (plugins should pick distinct namespace names).
- The namespace `site` is reserved for future site-level resolution and cannot be used.

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
