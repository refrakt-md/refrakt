---
title: Layouts
description: Declarative page layout system — LayoutConfig reference, slots, computed content, chrome, and behaviors
---

# Layouts

The layout transform produces page-level structure — headers, sidebars, mobile panels, content areas, table of contents — from declarative `LayoutConfig` objects. It works alongside the identity transform: the identity transform handles individual runes, while the layout transform handles the page structure around them.

## Pipeline

```
LayoutConfig + LayoutPageData → layoutTransform() → SerializedTag tree → Renderer
```

The layout transform takes a `LayoutConfig` and page data, resolves slots, builds chrome elements, generates computed content, and returns a `SerializedTag` tree that any renderer can walk. The output is framework-agnostic — the same config produces the same HTML regardless of whether Svelte, Astro, or another renderer consumes it.

## LayoutConfig

The top-level interface that describes a page layout.

```typescript
interface LayoutConfig {
  block: string;
  tag?: string;
  slots: Record<string, LayoutSlot>;
  chrome?: Record<string, LayoutStructureEntry>;
  computed?: Record<string, ComputedContent>;
  behaviors?: string[];
  postTransform?: (node: SerializedTag, page: LayoutPageData) => SerializedTag;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `block` | `string` | BEM block name. The root element gets `class="rf-layout-{block}"` and `data-layout="{block}"` |
| `tag` | `string` | Root element tag, defaults to `'div'` |
| `slots` | `Record<string, LayoutSlot>` | Structural containers — where regions, content, and computed output go |
| `chrome` | `Record<string, LayoutStructureEntry>` | Reusable UI elements (buttons, icons) referenced from slots via `'chrome:name'` |
| `computed` | `Record<string, ComputedContent>` | Content derived from page data at transform time (breadcrumbs, TOC, prev/next) |
| `behaviors` | `string[]` | Layout behavior names to attach (e.g., `['mobile-menu']`). Sets `data-layout-behaviors` on root |
| `postTransform` | function | Programmatic escape hatch — runs after all declarative processing |

## LayoutSlot

A structural slot defines a container element in the layout.

```typescript
interface LayoutSlot {
  tag: string;
  class?: string;
  source?: string;
  conditional?: boolean;
  conditionalRegion?: string;
  frontmatterCondition?: string;
  wrapper?: { tag: string; class: string; conditionalModifier?: { computed: string; modifier: string } };
  children?: Array<string | LayoutSlot | LayoutStructureEntry>;
  conditionalModifier?: { region: string; modifier: string };
  attrs?: Record<string, string>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `tag` | `string` | HTML tag name for this slot |
| `class` | `string` | CSS class(es) |
| `source` | `string` | Content source (see source types below) |
| `conditional` | `boolean` | Skip this slot if its source resolves to empty content |
| `conditionalRegion` | `string` | Skip this slot if the named region doesn't exist. Does not add the region's content — just checks existence |
| `frontmatterCondition` | `string` | Skip this slot if `frontmatter[key]` is falsy |
| `wrapper` | object | Wraps slot content in an additional element |
| `children` | array | Child slots, chrome references (`'chrome:name'`), or structure entries — appended after source content |
| `conditionalModifier` | object | Adds a BEM modifier class when the named region exists (e.g., `--has-nav`) |
| `attrs` | `Record<string, string>` | Extra HTML attributes on the slot element |

### Source types

The `source` field connects a slot to page data:

| Source | Description |
|--------|-------------|
| `'content'` | The main page renderable (markdown body) |
| `'region:<name>'` | Contents of a named region (e.g., `'region:header'`) |
| `'clone:region:<name>'` | Deep-cloned copy of a region — use for mobile panels where the same content needs to appear in two places without mutation |
| `'computed:<name>'` | Output of a named computed content builder |
| `'chrome:<name>'` | Output of a named chrome entry |

### Conditional rendering

Slots support three types of conditional rendering:

- **`conditional: true`** — Renders only if the slot's `source` resolves to non-empty content. Useful for optional sections like sidebars.
- **`conditionalRegion: 'header'`** — Renders only if the named region exists in page data. Unlike `source`, this does not inject the region's content — it just checks existence. Use this on outer wrapper elements when an inner child handles the actual content.
- **`frontmatterCondition: 'showSidebar'`** — Renders only if the page's frontmatter has a truthy value for the given key.

### Conditional modifiers

Two types of conditional modifier add BEM modifier classes based on page state:

**On the slot itself** — adds a modifier when a region exists:

```typescript
{
  tag: 'main',
  class: 'rf-docs-content',
  conditionalModifier: { region: 'nav', modifier: 'has-nav' },
  // → class="rf-docs-content rf-docs-content--has-nav" when nav region exists
}
```

**On a wrapper** — adds a modifier when computed content is present:

```typescript
wrapper: {
  tag: 'div',
  class: 'rf-docs-content__inner',
  conditionalModifier: { computed: 'toc', modifier: 'has-toc' },
  // → class="rf-docs-content__inner rf-docs-content__inner--has-toc" when TOC exists
}
```

## ComputedContent

Computed content is derived from page data at transform time.

```typescript
interface ComputedContent {
  type: 'breadcrumb' | 'toc' | 'prev-next';
  source: string;
  options?: Record<string, any>;
  visibility?: {
    minCount?: number;
    frontmatterToggle?: string;
  };
}
```

### `breadcrumb`

Walks the nav region tree to find the current page's group, then emits a breadcrumb trail.

```typescript
computed: {
  breadcrumb: {
    type: 'breadcrumb',
    source: 'region:nav',
  },
}
```

Output: `Category > Page Title` as styled spans inside a breadcrumb wrapper.

### `toc`

Builds a table of contents from page headings with anchor links.

```typescript
computed: {
  toc: {
    type: 'toc',
    source: 'headings',
    options: { minLevel: 2, maxLevel: 3 },
    visibility: {
      minCount: 2,
      frontmatterToggle: 'toc',
    },
  },
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `minLevel` | 2 | Minimum heading level to include |
| `maxLevel` | 3 | Maximum heading level to include |

| Visibility rule | Description |
|-----------------|-------------|
| `minCount` | Minimum number of qualifying headings needed. Set to `2` to suppress TOC on pages with only one heading |
| `frontmatterToggle` | Frontmatter key that disables TOC when set to `false`. Authors can write `toc: false` in frontmatter to hide it |

Output: A `<nav data-scrollspy>` element containing an anchor link list, styled with `rf-on-this-page` classes. The `scrollspyBehavior` from `@refrakt-md/behaviors` highlights the active heading.

### `prev-next`

Finds the current page's neighbors in the nav tree ordering and emits previous/next navigation links.

```typescript
computed: {
  prevNext: {
    type: 'prev-next',
    source: 'region:nav',
  },
}
```

Output: A `<nav class="rf-prev-next">` with links to the previous and/or next pages.

## LayoutStructureEntry

Chrome elements extend the rune engine's `StructureEntry` with page data access. They define reusable UI elements like buttons, headers, and metadata displays.

```typescript
interface LayoutStructureEntry extends StructureEntry {
  pageText?: string;
  pageCondition?: string;
  dateFormat?: Intl.DateTimeFormatOptions;
  iterate?: { source: string; tag: string; class?: string };
  svg?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pageText` | `string` | Dot-path into page data (e.g., `'title'`, `'frontmatter.date'`). Injects the resolved value as text content |
| `pageCondition` | `string` | Dot-path into page data. Only render this element if the resolved value is truthy |
| `dateFormat` | `Intl.DateTimeFormatOptions` | Format a `pageText` value as a localized date string |
| `iterate` | object | Repeat a child element for each item in a page data array (e.g., `frontmatter.tags`) |
| `svg` | `string` | Inline SVG string. Rendered with `data-raw-html` so the Renderer outputs it as raw HTML |

Also inherits from `StructureEntry`: `tag`, `ref`, `children`, `attrs`, `condition`.

### Chrome references

Slots reference chrome elements by name using `'chrome:name'` strings in the `children` array:

```typescript
chrome: {
  menuButton: {
    tag: 'button',
    ref: 'mobile-menu-btn',
    attrs: { class: 'rf-mobile-menu-btn', 'aria-label': 'Open menu', 'data-mobile-menu-open': '' },
    svg: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">...</svg>',
  },
},
slots: {
  header: {
    tag: 'header',
    class: 'rf-docs-header',
    children: [
      {
        tag: 'div',
        class: 'rf-docs-header__inner',
        source: 'region:header',
        children: ['chrome:menuButton'],  // ← referenced by name
      },
    ],
  },
}
```

## Layout behaviors

The `behaviors` array on `LayoutConfig` specifies which behaviors to attach. The layout transform sets `data-layout-behaviors` on the root element, and `initLayoutBehaviors()` from `@refrakt-md/behaviors` discovers and wires them up.

### `mobile-menu`

The mobile menu behavior handles panel toggling for responsive layouts. It uses data attributes to discover trigger elements:

| Data attribute | Purpose |
|----------------|---------|
| `data-mobile-menu-open` | Opens the header menu panel (the first `.rf-mobile-panel` that isn't `--nav`) |
| `data-mobile-menu-close` | Closes all open panels |
| `data-mobile-nav-toggle` | Toggles the nav panel (`.rf-mobile-panel--nav`) |

Panels are toggled via the `[data-open]` attribute. CSS uses this for visibility:

```css
.rf-mobile-panel { display: none; }
.rf-mobile-panel[data-open] { display: block; }
```

The behavior also handles:
- **Escape key** — dismisses all open panels
- **Body scroll lock** — sets `overflow: hidden` on `<body>` when a panel is open

## Example: docs layout

The `docsLayout` config from `@refrakt-md/theme-base` demonstrates a complete layout with all features. It produces a documentation page with header, mobile panels, toolbar with breadcrumbs, sidebar navigation, content area, and table of contents.

```typescript
import type { LayoutConfig } from '@refrakt-md/transform';

export const docsLayout: LayoutConfig = {
  block: 'docs',
  behaviors: ['mobile-menu'],

  computed: {
    breadcrumb: { type: 'breadcrumb', source: 'region:nav' },
    toc: {
      type: 'toc',
      source: 'headings',
      options: { minLevel: 2, maxLevel: 3 },
      visibility: { minCount: 2, frontmatterToggle: 'toc' },
    },
  },

  chrome: {
    menuButton: { /* ... menu dots SVG button */ },
    closeButton: { /* ... close X SVG button */ },
    hamburger: { /* ... hamburger SVG button for nav toggle */ },
  },

  slots: {
    // Header bar — only rendered if header region exists
    header: {
      tag: 'header',
      class: 'rf-docs-header',
      conditionalRegion: 'header',
      children: [{
        tag: 'div',
        class: 'rf-docs-header__inner',
        source: 'region:header',
        children: ['chrome:menuButton'],
      }],
    },

    // Mobile menu panel — cloned header content for mobile
    mobilePanel: {
      tag: 'div',
      class: 'rf-mobile-panel',
      conditionalRegion: 'header',
      attrs: { role: 'dialog', 'aria-label': 'Navigation menu' },
      children: [
        { tag: 'div', class: 'rf-mobile-panel__header',
          children: [/* title + close button */] },
        { tag: 'nav', class: 'rf-mobile-panel__nav',
          source: 'clone:region:header' },
      ],
    },

    // Toolbar with hamburger + breadcrumbs (mobile)
    toolbar: {
      tag: 'div',
      class: 'rf-docs-toolbar',
      conditionalRegion: 'nav',
      children: [
        'chrome:hamburger',
        { tag: 'div', source: 'computed:breadcrumb' },
      ],
    },

    // Sidebar (desktop) — only rendered if nav region exists
    sidebar: {
      tag: 'aside',
      class: 'rf-docs-sidebar',
      source: 'region:nav',
      conditional: true,
    },

    // Main content area with optional TOC
    main: {
      tag: 'main',
      class: 'rf-docs-content',
      conditionalModifier: { region: 'nav', modifier: 'has-nav' },
      wrapper: {
        tag: 'div',
        class: 'rf-docs-content__inner',
        conditionalModifier: { computed: 'toc', modifier: 'has-toc' },
      },
      children: [
        { tag: 'div', class: 'rf-docs-content__body', source: 'content' },
        { tag: 'aside', class: 'rf-docs-toc',
          source: 'computed:toc', conditional: true },
      ],
    },
  },
};
```

## Route rules

Layout names are mapped to URL patterns in `refrakt.config.json`. The `routeRules` object maps glob patterns to layout names, which the content system resolves to the corresponding `LayoutConfig` or component in the theme's `layouts` map.

```json
{
  "routeRules": {
    "/blog/**": "blog-article",
    "/docs/**": "docs"
  }
}
```

Pages matching a route rule use the specified layout. Pages without a matching rule fall back to `"default"`.

For sites where a single route needs different layouts for different page types (like blog index vs. blog articles), route rules can point to different layout names. The blog index uses a `{% blog-index %}` rune for its content listing, so it can use the default layout, while individual articles use the `blog-article` layout with frontmatter-sourced chrome (title, date, author, tags).

## Using layouts in a theme

Layouts are part of the `SvelteTheme` configuration passed to `ThemeShell`:

```typescript
import type { SvelteTheme } from '@refrakt-md/svelte';
import { defaultLayout, docsLayout, blogArticleLayout } from '@refrakt-md/theme-base';

export const theme: SvelteTheme = {
  config: myThemeConfig,
  registry: myRegistry,
  elements: myElements,
  layouts: {
    'default': defaultLayout,
    'docs': docsLayout,
    'blog-article': blogArticleLayout,
  },
};
```

The `layouts` map accepts either `LayoutConfig` objects (rendered via `layoutTransform()`) or Svelte components (rendered directly). This allows mixing declarative and component-based layouts in the same theme.
