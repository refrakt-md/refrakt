---
title: Tint cascade
description: How tint, tint-mode, and tint-lock cascade from site config down through layouts to individual pages.
---

# Tint cascade

Refrakt's tint cascade lets you express *"all marketing pages are locked to dark mode"* alongside *"docs respect user preference"* and *"this one launch announcement gets the brand-warm tint"* — without inventing a separate route-rules config surface. Every page resolves a `(tint, tintMode, locked)` tuple from four layers of input; later layers override earlier ones per field.

The refrakt documentation site you're reading is the canonical live example. Open the homepage — locked dark, no toggle. Navigate to `/docs/getting-started` — auto, toggle visible in the top-right. Pick light. Navigate back to `/` — locked dark again; your light preference is preserved silently and reapplies the moment you return to a docs page.

## The four levels

Cascade order, last writer wins per field:

| Level | Where | Use it for |
|---|---|---|
| **1. Site config** | `theme.colorScheme` in `refrakt.config.json` | Site-wide default mode (rarely needed) |
| **2. Layout frontmatter** | `_layout.md` files | Subtree defaults — "all marketing is dark" |
| **3. Page frontmatter** | The page itself | Per-page overrides |
| **4. Rune attribute** | `tint-mode="..."` on a rune | Single-rune override (predates the cascade) |

`undefined` at any level means *inherit from the layer above*. Explicit `null` for `tint` is the canonical *reset to no named tint* idiom — useful when you want to break out of a parent layout's named tint without applying a new one.

## The three fields

```yaml
tint: brand-warm           # named tint preset from theme config
tint-mode: auto            # 'auto' | 'light' | 'dark'
tint-lock: false           # true = ignore user preference, hide the toggle
```

| Field | Type | Default | What it does |
|---|---|---|---|
| `tint` | `string \| null` | `null` | Applies a named tint preset (defined in theme config) |
| `tint-mode` | `'auto' \| 'light' \| 'dark'` | `'auto'` | Forces a colour scheme on the page (or subtree) |
| `tint-lock` | `boolean` | `false` | When `true`, ignores user preference and hides the theme-toggle UI |

## The refrakt site as worked example

The site's content tree:

```
site/content/
├── _layout.md          # tint-mode: dark, tint-lock: true   (marketing default)
├── blog/_layout.md     # (no tint frontmatter — inherits root: locked dark)
├── docs/_layout.md     # tint-mode: auto, tint-lock: false  (reading surface)
├── runes/_layout.md    # tint-mode: auto, tint-lock: false
├── plan/
│   ├── (no _layout.md) # marketing pages for the plan system, inherit root
│   └── docs/_layout.md # tint-mode: auto, tint-lock: false  (reading surface)
└── ...
```

Resulting behaviour by URL:

| URL | Mode | Locked | Toggle |
|---|---|---|---|
| `/` | dark | yes | hidden |
| `/blog/announcement` | dark | yes | hidden |
| `/plan` *(marketing)* | dark | yes | hidden |
| `/docs/getting-started` | auto | no | visible |
| `/runes/hint` | auto | no | visible |
| `/plan/docs/overview` | auto | no | visible |

A user with a saved `light` preference visiting `/` sees the dark-locked marketing page; their preference is preserved in `localStorage`. When they navigate to `/docs/getting-started`, the toggle reappears and their saved preference applies.

## YAML idioms

### Reset a named tint without applying a new one

When a layout sets `tint: warm` and a page below it wants to clear that without applying a different tint:

```yaml
---
tint: ~        # YAML for null — explicit reset
---
```

### Inherit from above (do nothing)

Just omit the field:

```yaml
---
title: My page
# No tint / tint-mode / tint-lock — the layout chain wins.
---
```

### Lock a single page to dark

Useful for a one-off launch announcement under an otherwise-auto docs subtree:

```yaml
---
title: Launch day
tint-mode: dark
tint-lock: true
---
```

## How it works under the hood

The cascade resolution is a pure function in `@refrakt-md/content`:

```ts
import { resolveTintCascade } from '@refrakt-md/content';

const cascade = resolveTintCascade(page, rootDirectory, {
  colorScheme: 'auto',  // from refrakt.config.json
});
// → { tint: null, tintMode: 'dark', locked: true }
```

The SvelteKit adapter calls this for every page at build time; the result is stashed on `SitePage.tintCascade`. A `hooks.server.ts` consumes that tuple via three helpers also exported from `@refrakt-md/content`:

```ts
import { htmlTintAttributes, colorSchemeMetaContent, prePaintScript } from '@refrakt-md/content';

htmlTintAttributes(cascade);    // → 'data-theme="dark" data-tint-lock="true"'
colorSchemeMetaContent(cascade); // → 'dark'
prePaintScript();                // → '(function(){...})();' anti-FOIT script
```

The hook rewrites `<html>` with the attributes and injects the meta tag + pre-paint script before any stylesheets. The script reads `data-tint-lock`; on locked pages it no-ops, so the SSR-emitted mode is final. On unlocked pages it applies the user's saved preference (or system pref) before paint — no flash of incorrect theme.

The theme toggle component (`ThemeToggle` from `@refrakt-md/svelte`) reads the same `data-tint-lock` and hides itself on locked pages, writing to the same `rf-theme` localStorage key the pre-paint script reads.

## What's intentional vs incidental

A few choices in the cascade design that might not be obvious:

- **The site-wide `theme.colorScheme` field exists but is rarely used.** Most sites want layout-level granularity; `theme.colorScheme` is for the edge case where you want the *entire site* to be dark/light by default.
- **`tint-mode: auto` is the default, not the absence of `tint-mode`.** A layout explicitly setting `tint-mode: auto` overrides a parent's `tint-mode: dark` — that's how the docs subtrees unlock themselves from the root's locked-dark default.
- **`tint-lock` is independent of `tint-mode`.** You can lock a page to `tint-mode: auto` (the user's system preference is final, no toggle UI). Useful for embedded surfaces where you don't want users fiddling but also don't have a brand preference.
- **The cascade doesn't merge `tint` overlays.** A layout's `tint: warm` plus a page's `tint: brand-special` → the page wins, the layout's `warm` is gone. There's no concept of "stacked tints." Use a named tint preset that already combines what you want.

See {% ref "SPEC-052" preview="drawer" /%} for the full design rationale.
