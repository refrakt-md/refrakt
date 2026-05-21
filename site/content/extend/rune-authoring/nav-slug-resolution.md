---
title: Nav slug resolution
description: How nav item slugs resolve to URLs at build time, and how the active state is applied per page
---

# Nav slug resolution

Each item in a `{% nav %}` rune is resolved to a real `<a href>` at build time during the cross-page pipeline's post-process phase. There's no client-side resolution — the SSR HTML carries fully-resolved links plus the active-state attributes for the page being rendered.

This page covers the four item shapes, how base directories are derived, what a resolution error looks like, and the active-state contract themes can rely on.

## Item shapes

A nav item's source determines how it's resolved. The four supported shapes:

| Source shape                          | Example                                            | Resolution                                                                       |
|---------------------------------------|----------------------------------------------------|----------------------------------------------------------------------------------|
| Explicit link                         | `[Configuration](/docs/configuration/overview)`    | Use the link `href` as-is. No resolution attempted.                              |
| Absolute path                         | `/docs/configuration/overview`                     | Treat as absolute URL. No resolution attempted.                                  |
| Multi-segment slug                    | `configuration/overview`                           | Join with the nav's base directory and verify the page exists.                   |
| Bare slug                             | `overview`                                         | Look up exactly one page at `{base}/{slug}`. Build fails on ambiguity or miss.   |

The explicit-link form always works and bypasses every rule below — reach for it when nothing else fits.

## Base directories

Bare and multi-segment slugs both resolve **relative to the nav's source file**. The base directory is the directory containing the file the nav is declared in:

- `site/content/_layout.md` → base `/`
- `site/content/docs/_layout.md` → base `/docs/`
- `site/content/extend/_layout.md` → base `/extend/`
- `site/content/docs/getting-started.md` → base `/docs/`

A `{% nav %}` at `site/content/docs/_layout.md` writing `- getting-started` resolves to `/docs/getting-started`. Writing `- configuration/overview` resolves to `/docs/configuration/overview`. Writing `- /blog/some-post` passes the URL through unchanged.

## Disambiguating same-named pages

When the same final URL segment exists in multiple sections (`overview` under `/docs/configuration/`, `/docs/mcp/`, and `/extend/theme-authoring/`), a bare `- overview` from a higher-level nav is ambiguous and the build fails. Use a multi-segment slug to pick:

```markdoc
{% nav %}
## Overview pages
- configuration/overview
- mcp/overview
- theme-authoring/overview
{% /nav %}
```

Each multi-segment slug resolves unambiguously relative to the nav's base.

## Build errors

When a slug can't be resolved, the build fails with a structured error that names the source file, the slug, the URL it tried to resolve to, and up to three closest-match suggestions:

```text
Nav item `overview` in site/content/_layout.md cannot be resolved
(no page at `/overview`).

Did you mean one of:
  - /docs/configuration/overview
  - /docs/mcp/overview
  - /extend/theme-authoring/overview

Use a multi-segment slug (e.g. `section/page`) or an explicit
`[Label](/path)` link.
```

Suggestions cover two cases:

- **Collisions** — same-final-segment pages from other directories. The fix is usually a multi-segment slug.
- **Typos** — pages under the nav's base directory whose final segment is within two edits of the slug (`getting-startd` → `getting-started`).

## Active state contract

Each rendered page evaluates every nav against its current URL and applies up to two attributes:

| Attribute                | When                                                                              | Maximum per nav  |
|--------------------------|-----------------------------------------------------------------------------------|------------------|
| `aria-current="page"`    | The item's resolved `href` equals the current URL                                  | 1                |
| `data-active="ancestor"` | The item's resolved `href` is the **longest strict prefix** of the current URL    | 1                |

Both rules are independent. `aria-current` and `data-active` can land on different items of the same nav — for example, when the reader is on `/extend/rune-authoring/output-contract`, an item linking to `/extend/rune-authoring/` would get `data-active="ancestor"` while the (deeper, unlinked) current page produces no `aria-current` anywhere in the nav.

URL comparison normalises trailing slashes and `index` suffixes, and is case-insensitive. External links (`https://`, `mailto:`) never receive either attribute.

### Theme reference

Lumina styles `aria-current="page"` and `data-active="ancestor"` with visually distinct treatments — the exact-match state gets the stronger emphasis, ancestor gets a subtler accent. Themes can collapse the two into a single style if they prefer; the contract is the two attributes, not two visual treatments.

```css
.rf-nav-item__link[aria-current="page"] {
  /* strong emphasis: bold + accent color + indicator */
}

.rf-nav-item__link[data-active="ancestor"] {
  /* subtle accent color */
}
```

## Migrating a flat-slug nav

If your nav currently uses bare slugs that span multiple subdirectories (a common pattern before this resolution model was introduced), the build will surface every ambiguity at once. Each error message tells you the available candidates — converting bare slugs to multi-segment slugs (or explicit links) one by one is usually mechanical.

The migration is also a chance to revisit links that were previously "working" by coincidence — under the legacy resolver, a bare slug could silently resolve to a different page depending on which page the reader was viewing. Multi-segment slugs make the destination explicit and unambiguous regardless of context.
