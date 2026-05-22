{% spec id="SPEC-061" status="draft" tags="pipeline, content, transform, variables" %}

# Pipeline page variables

Expose per-page metadata as Markdoc variables (`$page.path`, `$page.url`, `$page.dir`, `$page.slug`, `$page.title`) during transform so runes can reference the current page without authors hardcoding values. Foundational primitive — the first consumer is `{% code-file path=$page.path /%}` for view-source, but any rune that wants "where am I?" context benefits.

## Problem

Runes can't currently read page-level context during transform. The page knows its URL, its source path, its frontmatter; the transform pipeline knows them too; but a rune attribute like `path=$page.path` doesn't resolve because no `page` variable is populated.

Concrete cases this blocks:

- **View-source pattern** (`{% code-file path=$page.path /%}`) — the headline motivating use case. Without `$page.path`, every page wanting to render its own source has to write the path literally, which is brittle and duplicative.
- **Conditional rendering by URL** (`{% if $page.url === "/foo" %}...{% /if %}`) — niche but real for layout files that vary by location.
- **Self-referential metadata** — a rune that prints the page's own title without re-typing it.
- **Future page-introspection runes** — anything in the reflection direction (page-history, page-headings, etc.) needs at minimum to know which page it's on.

Hardcoding paths everywhere defeats the point of building a transclusion primitive.

-----

## Design Principles

**Variables describe what already exists.** Each variable maps to data the pipeline already computes per page — file path, derived URL, parsed frontmatter, title from frontmatter or first H1. No computed-on-demand fields, no side-effecting variables. v1 is read-only mirrors of existing state.

**One namespace, predictable shape.** All page-context variables live under `$page.*`. Frontmatter values are *not* lifted into `$page.*` — they have their own namespace if needed (out of scope for v1, but the boundary matters). This keeps the source of each variable obvious.

**Per-page injection.** Each page's transform receives a config with that page's variables populated. Variables aren't site-wide; they're per-page-instance.

**Conservative initial surface.** Ship the five variables view-source and obvious URL-awareness need. Defer richer reflection (`$page.source`, `$page.frontmatter`, `$page.ast`, `$page.headings`) until a concrete consumer makes the case.

-----

## Authoring Surface

### Variables exposed in v1

| Variable | Type | Source | Example value |
|----------|------|--------|--------------|
| `$page.path` | string | File path relative to content root | `"docs/themes/configuration.md"` |
| `$page.url` | string | Final URL of the rendered page | `"/docs/themes/configuration"` |
| `$page.dir` | string | Directory portion of `path` | `"docs/themes"` |
| `$page.slug` | string | Last URL segment | `"configuration"` |
| `$page.title` | string | Frontmatter `title`, fallback to first H1 | `"Theme configuration"` |

### Usage

```markdoc
{# View-source via code-file #}
{% code-file path=$page.path lang="md" /%}

{# Page title rendered from variable #}
# {% $page.title %}

{# Conditional based on URL #}
{% if equals($page.dir, "blog") %}
  Posted in the blog
{% /if %}
```

Markdoc's existing variable interpolation handles `{% $page.x %}` in text and `attr=$page.x` in attributes. No new author syntax.

-----

## Engine Changes

### Per-page transform config

Currently, transform config is built once per site (`packages/content/src/site.ts`) and reused across pages. Variables are not currently populated per-page.

Two paths possible:

1. **Build per-page config**: clone the site-level config for each page, inject `variables.page` with that page's values. Simple, slightly wasteful (the rest of the config is identical).
2. **Inject at transform call site**: keep the site-level config, pass `variables` as a separate argument to `Markdoc.transform(ast, { ...config, variables: { page: {...} } })`. Markdoc supports this — `transform` accepts the variables key.

Recommend path 2: minimal diff, matches Markdoc's own API shape, and keeps the shared config truly shared.

### Population point

In the per-page transform loop (likely `packages/content/src/page.ts` or wherever `TransformedPage` is built), compute the five variables from existing fields:

- `path` — from the page's `relativePath` field
- `url` — from the page's resolved `url`
- `dir` — `path.dirname(path)` (or equivalent)
- `slug` — last segment of `url`
- `title` — `frontmatter.title ?? firstHeading(ast)?.text`

Pass `{ page: {...} }` as `variables` to `Markdoc.transform`.

### Partials

When a partial is included via `{% partial file="x.md" /%}`, the included content currently shares the host page's transform context. Variables should follow that contract — partials see the host page's `$page.*` variables, not their own. This means the variable injection happens at transform-call level (not at parse level), which path 2 above already implies.

-----

## Acceptance Criteria

- [ ] `$page.path` resolves to the file's path relative to the content root, in POSIX form (forward slashes)
- [ ] `$page.url` resolves to the final URL of the rendered page (matches what's used in nav resolution)
- [ ] `$page.dir` resolves to the directory portion of `path`
- [ ] `$page.slug` resolves to the last segment of `url`
- [ ] `$page.title` resolves to `frontmatter.title` if set, otherwise the first H1's text content, otherwise undefined
- [ ] Variables are populated per-page (each page sees its own values, not a stale neighbor's)
- [ ] Variables work in attribute interpolation (`path=$page.path`)
- [ ] Variables work in text interpolation (`{% $page.title %}`)
- [ ] Variables work in conditional tags (`{% if equals($page.dir, "x") %}`)
- [ ] Partials included into a page see the *host page's* variables, not their own file's
- [ ] Layout files see the variables of the page being rendered, not the layout file's path
- [ ] Test fixture covers each variable in a `.md` page that prints them via Markdoc interpolation
- [ ] Authoring docs document the available variables, their meanings, and the partials/layout scoping rules

-----

## Out of Scope

- **`$page.source`** — raw Markdown content of the current page. Useful but exposes the full file body as a string in every page's transform context, which is wasteful unless something consumes it. Defer until a specific consumer (e.g. a real page-source rune) earns it.
- **`$page.frontmatter`** — full frontmatter as an object. Same reasoning: nice to have, but the variables that consumers actually need are better exposed individually (or via a `$frontmatter.*` namespace if that demand materializes).
- **`$page.ast` / `$page.headings`** — structured introspection of the page's content. Belongs with the deferred reflection-style runes; not needed for the view-source case.
- **Site-level variables (`$site.*`)** — name, base URL, theme config etc. Separate spec; the per-page case ships first because it's the concrete blocker.
- **User-defined custom variables** — a Markdoc-config feature in principle; out of scope for this spec since the pipeline is the only producer of `$page.*`.
- **Variables in YAML frontmatter** — frontmatter is parsed as static YAML, not Markdoc; interpolating variables there would require frontmatter-aware variable resolution, which is its own can of worms.

-----

## Open Questions

**Should `$page.path` include the file extension (`.md`) or strip it?** Recommend include — it's the literal file path, and consumers (like `code-file`) need it for language inference. If consumers want extension-less, `$page.slug` or string manipulation in Markdoc covers it.

**Trailing slash convention for `$page.url`.** Should `/docs/themes/configuration` and `/docs/themes/configuration/` differ? Recommend match the nav-resolution convention from SPEC-055: lowercase, no trailing slash (except root `/`).

**Index pages (`docs/themes/index.md` → `/docs/themes/`).** What's `$page.slug`? Recommend the directory name (`themes`), not `index`. Matches the URL semantics.

**Should layout files have their *own* `$page.*` context when being rendered as part of the cascade, or always see the leaf page's context?** Recommend leaf-page context, since the layout is functionally part of that page's render. If a use case for layout-self-context appears, a separate `$layout.*` namespace would be cleaner than re-purposing `$page`.

**Performance: cloning the variables object per page vs. mutating a shared one.** Recommend cloning (path 2's `{ ...config, variables: { page: {...} } }`) — Markdoc transform calls aren't a hot loop, and mutation across pages is a footgun.

-----

## References

- {% ref "SPEC-055" /%} — nav slug resolution (source of URL-normalization conventions)
- `packages/content/src/site.ts` — current transform-config construction
- `packages/content/src/page.ts` (or equivalent) — per-page transform call site
- Markdoc variables documentation — `{% $name %}` syntax and `config.variables` resolution

{% /spec %}
