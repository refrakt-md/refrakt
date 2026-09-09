---
title: Content variables
description: The author-facing Markdoc variables — frontmatter, page metadata, and source-file metadata
---

# Content variables

Every page transform runs with a set of variables that authored content can reach via Markdoc's `{% $name %}` interpolation. The public surface is organized into three namespaces — `$frontmatter`, `$page`, and `$file` — each describing a different facet of the document being rendered.

This page documents the **public** surface. Pipeline internals also live in the variable bag (prefixed with `__`); they are deliberately not documented for authors and may change without notice.

## `$frontmatter.*`

The complete parsed YAML frontmatter as a flat object. Whatever keys the author wrote in the page's frontmatter block are reachable as `$frontmatter.{key}`.

```markdoc
---
title: Auth system
author: Bjorn
description: How authentication works
---

# {% $frontmatter.title %}

Written by {% $frontmatter.author %}.
```

No schema is enforced at the variable layer — the frontmatter object reflects exactly what's in the YAML, whatever shape that is. Validation, if needed, happens elsewhere (per-rune schemas, registry hooks, build scripts).

## `$page.*` — the page as a content artifact

`$page.*` describes the page's identity within the *content tree*. Paths are content-root-relative; values are URL-aware where they should be.

| Key | Type | Meaning |
|-----|------|---------|
| `$page.url` | `string` | The final URL of the rendered page (after slug overrides and base-path resolution). |
| `$page.path` | `string` | File path relative to the content root, POSIX-normalized. Example: `"docs/themes/configuration.md"`. |
| `$page.dir` | `string` | Directory portion of `$page.path` (no trailing slash). Empty string for content-root pages. Example: `"docs/themes"`. |
| `$page.slug` | `string` | Last URL segment of `$page.url`. For index pages, the directory name (not `"index"`); for the homepage, the empty string. |
| `$page.title` | `string \| undefined` | The page title. See resolution rules below. |
| `$page.draft` | `boolean` | Whether the page is marked draft in frontmatter. |

### `$page.title` resolution

The title resolves in three steps:

1. **`$frontmatter.title` if present and non-empty after trimming whitespace.** Form-based editors often store an empty string when the author leaves the field blank — that behaves the same as if the key were absent.
2. **Otherwise, the first H1 in the page AST.** The walk is depth-first and descends into rune (tag) children, so a page that starts with `{% hero %}# Authentication {% /hero %}` resolves `$page.title` to `"Authentication"`. Multiple H1s? The first one wins.
3. **Otherwise, `undefined`.**

Only markdown `heading` nodes count. Headings that runes emit *structurally* (e.g., a hero's `title=` attribute rendering an H1) are not in the AST as heading nodes and don't participate in the walk.

## `$file.*` — the source file as a disk artifact

`$file.*` describes the source file's identity in the *project tree*. Paths are project-root-relative (anchored at the directory containing `refrakt.config.json`); timestamps come from git history with a filesystem-stat fallback.

| Key | Type | Meaning |
|-----|------|---------|
| `$file.path` | `string` | Path to the source file relative to the project root, POSIX-normalized. Example: `"site/content/docs/themes/configuration.md"`. |
| `$file.created` | `string \| undefined` | ISO 8601 date (`YYYY-MM-DD`) of file creation. Sourced from git history when available; filesystem stat as fallback. |
| `$file.modified` | `string \| undefined` | ISO 8601 date of last modification. Same source/fallback strategy as `created`. |

`$file.created` and `$file.modified` can be `undefined` for files that aren't in git and whose filesystem stat is unavailable (rare).

## Page vs. file — two frames, two consumers

`$page.*` and `$file.*` look similar but answer different questions:

- **`$page.path` is content-root-relative.** Useful when you care about position in the content tree: nav scope, layout cascade, conditional content (e.g., "show this only on docs pages").
- **`$file.path` is project-root-relative.** Useful when you care about disk location: sandboxed file consumers (the snippet rune, future build-time include patterns) resolve from the project root, and need a variable that returns a path in that frame.

Concretely:

```markdoc
{# Render the source of the current page in a code block #}
{% snippet path=$file.path lang="md" /%}

{# Render only on pages inside the docs section #}
{% if equals($page.dir, "docs") %}
  Quick-reference card content here.
{% /if %}
```

Forcing a single path frame on both kinds of consumer would require every author to do string manipulation in attribute interpolation — and Markdoc doesn't support concatenation in attribute values. The two paths are intentional.

## Use in attribute interpolation

Variables work the same way in three contexts:

```markdoc
{# Text interpolation #}
This page is at {% $page.path %}.

{# Attribute interpolation #}
{% snippet path=$file.path /%}

{# Conditional tags #}
{% if equals($page.dir, "blog") %}
  Posted: {% $file.created %}
{% /if %}
```

## Scoping inside partials and layouts

Partials and layout files rendered as part of a host page see the **host page's** `$page.*` and `$file.*` — not their own file's. This means a `_partials/footer.md` partial that interpolates `{% $page.url %}` shows the URL of the page that included it, not the partial file's own path.

## The `__` prefix convention

Variables that start with a double underscore (`__source`, `__sandboxReadFile`, etc.) are **pipeline internals**. Authored content should treat anything in the `__`-prefix namespace as off-limits: those entries may be removed, renamed, or restructured without breakage notice. The public namespaces are `$frontmatter.*`, `$page.*`, and `$file.*` — and those alone.

If you find yourself reaching for a `__`-prefixed variable, that's a signal the use case probably belongs in a rune or in core, not in authored content.

## Custom variables in `refrakt.config.json`

Site-level custom variables can be configured at the adapter layer (e.g., SvelteKit's `variables` option on the refrakt plugin). They merge into the public variable bag and are reachable the same way:

```jsonc
// refrakt.config.json (sketch — exact shape depends on your adapter)
{
  "variables": {
    "buildId": "abc123",
    "apiBase": "https://api.example.com"
  }
}
```

```markdoc
Built from commit {% $buildId %}.
```

Custom variables live at the top level (`{% $buildId %}`), not under `$page` or `$file`. Naming collisions with the public namespaces are not enforced — pick names that don't shadow `frontmatter`, `page`, or `file`.
