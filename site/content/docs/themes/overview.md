---
title: Theme Overview
description: What a refrakt.md theme is, how the two-layer system works, and how themes are structured
---

# Theme Overview

A refrakt.md theme controls how runes are rendered — from colors and typography to layout structure and interactive behavior. Themes are npm packages that extend a shared base configuration with custom styling, design tokens, and optionally Svelte components.

## What a theme provides

A theme consists of four parts:

| Part | Required | Purpose |
|------|----------|---------|
| **Configuration** | Yes | Maps rune types to BEM classes, modifiers, structural elements |
| **CSS** | Yes | Styles the generated HTML using BEM selectors and design tokens |
| **Design tokens** | Yes | CSS custom properties for colors, typography, spacing, radii, shadows |
| **Components** | No | Svelte components for interactive runes that need JavaScript |

Most runes (~75%) are rendered entirely through configuration and CSS. Only runes requiring external libraries (charts, maps, diagrams) or complex interactive state need Svelte components.

## The two-layer system

refrakt.md uses a two-layer rendering system:

### Layer 1: Identity transform (config + CSS)

The identity transform is a framework-agnostic function that walks the serialized content tree and enhances it declaratively:

1. Reads the rune's `typeof` attribute
2. Looks up the matching `RuneConfig`
3. Adds BEM classes (`.rf-hint`, `.rf-hint--warning`)
4. Reads modifier values from meta tags and sets `data-*` attributes
5. Injects structural elements (headers, icons, badges) defined in the config
6. Wraps content children if `contentWrapper` is configured
7. Consumes processed meta tags from the output

The result is semantic HTML with BEM classes and data attributes. Your CSS styles this output.

```
Content tree → Identity Transform (config) → BEM-classed HTML → CSS → Styled output
```

### Layer 2: Svelte components (interactive runes)

Some runes need behavior that CSS alone can't provide:

- **Chart** — renders data with D3/visualization libraries
- **Map** — integrates with mapping APIs
- **Diagram** — processes Mermaid/DOT syntax
- **Comparison** — complex table rendering from nested rune data
- **Sandbox** — live code preview with iframe isolation

These are registered as Svelte components. The Renderer checks the component registry first — if a match is found, the component handles rendering. Otherwise, the generic HTML renderer outputs the identity-transformed tree.

{% hint type="note" %}
Many runes that *appear* interactive — Tabs, Accordion, DataTable, Form — actually use Layer 1 (identity transform + CSS) for structure and styling, with lightweight JavaScript from `@refrakt-md/behaviors` for progressive enhancement. They don't need custom Svelte components.
{% /hint %}

## Site layouts

Site-level layout — headers, sidebars, mobile panels, table of contents — is handled by a separate declarative system called the **layout transform**. While the identity transform handles individual runes, the layout transform handles the page structure around them.

A `LayoutConfig` object describes where regions, content, and chrome elements go:

```
LayoutConfig + page data → layoutTransform() → SerializedTag tree → Renderer
```

Key concepts:

- **Slots** define the structural containers (header, sidebar, main content area)
- **Sources** connect slots to page data: `region:header`, `content`, `computed:toc`
- **Chrome** defines reusable UI elements like menu buttons and SVG icons
- **Computed content** (breadcrumbs, TOC, prev/next navigation) is built at transform time from page data
- **Behaviors** (mobile menu toggling) use the same progressive enhancement pattern as rune behaviors

The layout transform is framework-agnostic — the same configs work with any renderer. Three built-in layout configs cover common site patterns: `defaultLayout`, `docsLayout`, and `blogArticleLayout`.

See [Layouts](/docs/themes/layouts) for the full reference.

## Package architecture

The theme system is split across three packages:

### `@refrakt-md/transform`

The engine. Provides `createTransform(config)` which returns the identity transform function, and `layoutTransform()` which renders page layouts from declarative `LayoutConfig` objects. Also defines the TypeScript interfaces for both systems (`ThemeConfig`, `RuneConfig`, `StructureEntry` for runes; `LayoutConfig`, `LayoutSlot`, `ComputedContent`, `LayoutStructureEntry` for layouts).

This package has no framework dependencies — it works with any rendering target.

### `@refrakt-md/theme-base`

The shared foundation. Contains:

- **`baseConfig`** — Universal rune-to-BEM mappings for all 74 rune configurations (including child runes like AccordionItem, Tier, Tab, etc.). Every rune has a `block` name and, where applicable, modifier definitions, structural elements, context modifiers, and auto-labeling rules.
- **Layout configs** — `defaultLayout`, `docsLayout`, `blogArticleLayout` — declarative layout configurations for common site patterns.
- **`mergeThemeConfig()`** — Utility to extend the base config with theme-specific overrides (icons, modified rune behavior, custom prefix).
- **Interactive components** — Svelte components for the ~10 runes that require JavaScript (Chart, Map, Diagram, etc.), shared across all themes.
- **Component registry** — Maps `typeof` values to Svelte components.

### Your theme package (e.g., `@refrakt-md/lumina`)

Extends the base with:

- **Config overrides** — Icon SVGs, custom rune config tweaks
- **Design tokens** — CSS custom properties defining your visual language
- **Rune CSS** — Per-rune stylesheets using BEM selectors
- **Manifest** — Theme metadata (name, prefix, dark mode support)

## How Lumina is structured

Lumina is the reference theme. Its structure shows what a complete theme looks like:

```
packages/lumina/
├── src/
│   └── config.ts          # mergeThemeConfig(baseConfig, { icons: {...} })
├── tokens/
│   ├── base.css            # Light mode design tokens
│   └── dark.css            # Dark mode overrides
├── styles/
│   ├── global.css          # Element resets (links, tables, code)
│   └── runes/
│       ├── hint.css         # Per-rune CSS (one file per block)
│       ├── recipe.css
│       ├── api.css
│       └── ...              # 48 rune CSS files
├── index.css               # Barrel import (tokens + global + all rune CSS)
├── manifest.json           # Theme metadata
└── package.json            # Exports, dependencies
```

Lumina's config is minimal — it adds icon SVGs and a curated content icon set to the base config:

```typescript
import { baseConfig, mergeThemeConfig } from '@refrakt-md/theme-base';
import { icons as lucideIcons } from './icons.js';

export const luminaConfig = mergeThemeConfig(baseConfig, {
  icons: {
    hint: {
      note: '<svg>...</svg>',
      warning: '<svg>...</svg>',
      caution: '<svg>...</svg>',
      check: '<svg>...</svg>',
    },
    global: lucideIcons,  // ~80 curated Lucide icons for the icon rune
  },
});
```

All the structural configuration — which BEM block each rune maps to, how modifiers work, what elements get injected — comes from `baseConfig` in `@refrakt-md/theme-base`.

## The identity transform in detail

When the identity transform encounters a tag with `typeof="Hint"`, it:

1. **Finds the config**: Looks up `runes['Hint']` in the theme config
2. **Reads modifiers**: Scans child meta tags for modifier values (e.g., `hintType`), falls back to defaults
3. **Builds BEM classes**: `.rf-hint` (block) + `.rf-hint--note` (modifier value)
4. **Sets data attributes**: `data-hint-type="note"` for CSS attribute selectors
5. **Checks context**: If nested inside `Hero`, adds `.rf-hint--in-hero`
6. **Injects structure**: Creates header element with icon and title spans
7. **Labels children**: Applies `data-name` attributes based on `autoLabel` config
8. **Removes consumed meta**: Strips meta tags that were read for modifiers

The output for a note hint:

```html
<div class="rf-hint rf-hint--note" typeof="Hint" data-hint-type="note" data-rune="hint">
  <div data-name="header" class="rf-hint__header">
    <span data-name="icon" class="rf-hint__icon"></span>
    <span data-name="title" class="rf-hint__title">note</span>
  </div>
  <p>This is a note with helpful information.</p>
</div>
```

Your CSS targets these selectors:

```css
.rf-hint { /* block styles */ }
.rf-hint--note { /* note variant */ }
.rf-hint__header { /* header element */ }
.rf-hint__icon { /* icon element */ }
.rf-hint__title { /* title element */ }
```

## Next steps

- [Configuration Reference](/docs/themes/configuration) — Complete reference for `ThemeConfig` and `RuneConfig`
- [CSS Architecture](/docs/themes/css) — BEM conventions, design tokens, variant styling patterns
- [Creating a Theme](/docs/themes/creating-a-theme) — Step-by-step guide to building a custom theme
- [Interactive Components](/docs/themes/components) — When and how to use Svelte components
- [Layouts](/docs/themes/layouts) — Declarative page layout system with `LayoutConfig`
