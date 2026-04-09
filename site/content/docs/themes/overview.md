---
title: Theme Overview
description: What a refrakt.md theme is, how the two-layer system works, and how themes are structured
---

# Theme Overview

A refrakt.md theme controls how runes are rendered — from colors and typography to layout structure and interactive behavior. Themes are npm packages that extend a shared base configuration with custom styling and design tokens.

## What a theme provides

A theme consists of four parts:

| Part | Required | Purpose |
|------|----------|---------|
| **Configuration** | Yes | Maps rune types to BEM classes, modifiers, structural elements |
| **CSS** | Yes | Styles the generated HTML using BEM selectors and design tokens |
| **Design tokens** | Yes | CSS custom properties for colors, typography, spacing, radii, shadows |

All runes are rendered through configuration and CSS. Runes that need client-side interactivity use the `@refrakt-md/behaviors` library for progressive enhancement.

## The two-layer system

refrakt.md uses a two-layer rendering system:

### Layer 1: Identity transform (config + CSS)

The identity transform is a framework-agnostic function that walks the serialized content tree and enhances it declaratively:

1. Reads the rune's `typeof` attribute
2. Looks up the matching `RuneConfig`
3. Adds BEM classes (`.rf-hint`, `.rf-hint--warning`)
4. Reads modifier values from meta tags and sets `data-*` attributes
5. Emits universal dimension attributes (`data-density`, `data-section`, `data-meta-type`, `data-media`, etc.) from the rune config
6. Injects structural elements (headers, icons, badges) defined in the config
7. Wraps content children if `contentWrapper` is configured
8. Consumes processed meta tags from the output

The result is semantic HTML with BEM classes, data attributes, and universal dimension attributes. Your CSS styles this output — dimension attributes enable generic cross-rune rules that handle metadata badges, structural anatomy, density levels, and more without per-rune CSS.

```
Content tree → Identity Transform (config) → BEM-classed HTML → CSS → Styled output
```

### Interactive runes (behaviors + postTransform)

Some runes need behavior that CSS alone can't provide. These are handled through two mechanisms — both built on top of the identity transform:

- **Behavior-driven runes** (Tabs, Accordion, DataTable, Form, Reveal, Preview, CodeGroup, Details) — the identity transform produces semantic HTML, and `@refrakt-md/behaviors` progressively enhances it with ARIA attributes, keyboard navigation, and event listeners. No framework dependency required.
- **Data rendering runes** (Chart, Comparison, Embed, Testimonial) — `postTransform` hooks in the engine config generate the complete HTML structure during the identity transform.
- **Lifecycle runes** (Diagram, Map, Nav, Sandbox) — `postTransform` hooks produce custom element tags, and `@refrakt-md/behaviors` initializes them as framework-neutral web components.

All runes flow through the same identity transform pipeline. The Renderer outputs the transformed tree as generic HTML.

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

### `@refrakt-md/runes`

Contains the shared base configuration:

- **`baseConfig`** — Universal rune-to-BEM mappings for core rune configurations (grid, hint, tabs, nav, datatable, etc., plus their child runes like AccordionItem, Tab, etc.). Every rune has a `block` name and, where applicable, modifier definitions, structural elements, context modifiers, and auto-labeling rules.
- **Community packages** (e.g., `@refrakt-md/marketing`, `@refrakt-md/docs`) contribute their own `theme.runes` config alongside their rune schemas. When packages are loaded, their theme configs are merged in automatically. A theme author does not need to manually add config for community package runes.

### `@refrakt-md/transform`

In addition to the engine, also provides:

- **Layout configs** — `defaultLayout`, `docsLayout`, `blogArticleLayout` — declarative layout configurations for common site patterns.
- **`mergeThemeConfig()`** — Utility to extend the base config with theme-specific overrides (icons, modified rune behavior, custom prefix).

### Adapter packages

The adapter handles element-level concerns and rendering:

- **SvelteKit** (`@refrakt-md/svelte`) — Renderer component, component registry, behaviors action, user-extensible element overrides. See the [SvelteKit adapter](/docs/adapters/sveltekit) page.
- **HTML** (`@refrakt-md/html`) — Pure HTML rendering. See the [HTML adapter](/docs/adapters/html) page.

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
import { baseConfig } from '@refrakt-md/runes';
import { mergeThemeConfig } from '@refrakt-md/transform';
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

All the structural configuration — which BEM block each rune maps to, how modifiers work, what elements get injected — comes from `baseConfig` in `@refrakt-md/runes`.

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
- [Universal Theming Dimensions](/docs/themes/dimensions) — Ten semantic dimensions for generic cross-rune styling
- [CSS Architecture](/docs/themes/css) — BEM conventions, design tokens, variant styling patterns
- [Creating a Theme](/docs/themes/creating-a-theme) — Step-by-step guide to building a custom theme
- [Interactive Components](/docs/themes/components) — How interactivity works without framework components
- [Layouts](/docs/themes/layouts) — Declarative page layout system with `LayoutConfig`
