# Multi-Framework Support: Layout Transform Architecture

## Problem

Refrakt currently targets SvelteKit only. Adding Astro support (and eventually others) is
straightforward for the rendering pipeline — most of it is already framework-agnostic. The hard
problem is **layouts**. Today, layouts are full Svelte components (DefaultLayout, DocsLayout,
BlogLayout) that mix structural placement, injected UI chrome, derived content, interactive
behavior, and SPA concerns. They can't be reused across frameworks, and maintaining parallel
implementations per framework doesn't scale.

## Key Insight

The identity transform engine already solves this exact problem for runes: it takes a declarative
config and produces a complete, enhanced tag tree with BEM classes, structural elements, icons,
and data attributes — all framework-agnostic. Behaviors handle interactivity via DOM queries.

Layouts are structurally the same problem. They can go through the same pipeline.

## Proposed Extension: Layout Transform

A new transform step that sits between the identity transform and the renderer:

```
Markdown → Parse → Schema Transform → Serialize
    → Identity Transform (runes)
    → Layout Transform (new!)     ← wraps page in layout structure
    → Renderer
```

The layout transform takes the transformed renderable + regions + page metadata and produces a
single `SerializedTag` tree with everything in place. The renderer just walks the tree — no
layout awareness needed.

## Decomposition of Existing Layouts

Every line across all three layouts falls into five categories:

### 1. Structural Placement (engine already does this for runes)

"If region X exists, wrap it in `<tag class='rf-layout__region'>`."

Same concept as the engine's `structure` config. The engine just needs to learn about
**regions** as a slot concept.

### 2. Injected UI Chrome (engine already does this for runes)

Mobile menu button, hamburger icon, close button, panel wrappers — static SVG + HTML injected
into the structure. Identical to how the engine injects headers, icons, and badges via
`StructureEntry`.

### 3. Derived Content (new — but small scope)

Only two cases across all three layouts:

- **Breadcrumbs** (DocsLayout): walks the nav region tree to build `slug → groupTitle` map,
  renders `category › page`. Pure function on nav tree + current URL.
- **Blog post index** (BlogLayout): filters the `pages` list by `/blog/` prefix, renders post
  cards. Pure function on page list.

Both can be **computed at transform time** as pre-built `SerializedTag` trees and injected as
structural elements. The content system already has the page list and nav tree.

### 4. Interactive Behavior (solved by `@refrakt-md/behaviors`)

Mobile menu toggle, panel open/close, body scroll lock, escape key dismiss — same pattern as
`tabsBehavior`, `accordionBehavior`, etc. Discover elements by `data-*` attributes, wire up
event listeners, return cleanup function.

New behaviors needed:
- `mobile-menu` — toggle panel visibility, body scroll lock, escape dismiss
- `mobile-nav-panel` — secondary panel for docs nav, same pattern

### 5. SPA Concerns (framework-specific, thin)

- `{#key page.url}` for full DOM recreation on navigate (SvelteKit only)
- Close-on-navigate effects (SvelteKit only, irrelevant for Astro MPA)

These stay in the framework adapter's thin wrapper.

## Layout Config Interface

```ts
interface LayoutConfig {
  /** BEM block name for the layout */
  block: string;

  /** Root HTML element */
  tag?: string; // defaults to 'div'

  /** Structural slots — where regions and content go */
  slots: Record<string, LayoutSlot>;

  /** Static chrome injected into the structure (buttons, icons, panels) */
  chrome?: Record<string, StructureEntry>;

  /** Computed content — built from page data at transform time */
  computed?: Record<string, ComputedContent>;

  /** Layout behaviors to attach via @refrakt-md/behaviors */
  behaviors?: string[];
}

interface LayoutSlot {
  /** HTML wrapper tag */
  tag: string;
  /** CSS class(es) */
  class?: string;
  /** What fills this slot:
   *  - 'region:<name>' — contents of a named region
   *  - 'content' — the main page renderable
   *  - 'computed:<name>' — output of a computed content builder
   *  - 'clone:region:<name>' — cloned copy of a region (for mobile panels) */
  source: string;
  /** Only render this slot if the source region exists */
  conditional?: boolean;
  /** Wrapper element for inner content */
  wrapper?: { tag: string; class: string };
  /** Static children or nested structure */
  children?: (string | LayoutSlot | StructureEntry)[];
  /** Conditional BEM modifier class based on region existence */
  conditionalModifier?: { region: string; modifier: string };
}

interface ComputedContent {
  /** Type of computed content */
  type: 'breadcrumb' | 'post-index' | 'toc';
  /** Data source: region name, 'pages', 'frontmatter', etc. */
  source: string;
  /** Type-specific options */
  options?: Record<string, any>;
}
```

## Concrete Example: DocsLayout as Config

```ts
const docsLayout: LayoutConfig = {
  block: 'docs',
  slots: {
    header: {
      tag: 'header',
      class: 'rf-docs-header',
      source: 'region:header',
      conditional: true,
      wrapper: { tag: 'div', class: 'rf-docs-header__inner' },
      // mobile menu button injected via chrome
    },
    'mobile-panel': {
      tag: 'div',
      class: 'rf-mobile-panel',
      source: 'clone:region:header', // duplicates header content into panel
      conditional: true, // only if header region exists
      children: [
        // close button, title — via chrome entries
      ],
    },
    toolbar: {
      tag: 'div',
      class: 'rf-docs-toolbar',
      source: 'computed:breadcrumb',
      conditional: true, // only if nav region exists
      // hamburger button via chrome
    },
    'mobile-nav-panel': {
      tag: 'div',
      class: 'rf-mobile-panel rf-mobile-panel--nav',
      source: 'clone:region:nav',
      conditional: true,
    },
    sidebar: {
      tag: 'aside',
      class: 'rf-docs-sidebar',
      source: 'region:nav',
      conditional: true,
    },
    content: {
      tag: 'main',
      class: 'rf-docs-content',
      source: 'content',
      wrapper: { tag: 'div', class: 'rf-docs-content__inner' },
      conditionalModifier: { region: 'nav', modifier: 'has-nav' },
    },
  },
  computed: {
    breadcrumb: {
      type: 'breadcrumb',
      source: 'region:nav',
      // walks nav tree to build slug→groupTitle map
      // emits: <div class="rf-docs-toolbar__breadcrumb">
      //          <span class="rf-docs-breadcrumb-category">Group</span>
      //          <span class="rf-docs-breadcrumb-sep">›</span>
      //          <span class="rf-docs-breadcrumb-page">Page Title</span>
      //        </div>
    },
  },
  chrome: {
    'mobile-menu-btn': {
      tag: 'button',
      ref: 'mobile-menu-btn',
      attrs: { 'aria-label': 'Open menu', class: 'rf-mobile-menu-btn' },
      children: [
        // SVG dots icon
      ],
    },
    'mobile-panel-close': {
      tag: 'button',
      ref: 'mobile-panel-close',
      attrs: { 'aria-label': 'Close menu', class: 'rf-mobile-panel__close' },
      children: [
        // SVG X icon
      ],
    },
    'toolbar-hamburger': {
      tag: 'button',
      ref: 'toolbar-hamburger',
      attrs: { 'aria-label': 'Toggle navigation', class: 'rf-docs-toolbar__hamburger' },
      children: [
        // SVG hamburger icon
      ],
    },
  },
  behaviors: ['mobile-menu', 'mobile-nav-panel'],
};
```

## Layout Transform Function

```ts
function layoutTransform(
  config: LayoutConfig,
  page: {
    renderable: RendererNode;
    regions: Record<string, { name: string; mode: string; content: RendererNode[] }>;
    title: string;
    url: string;
    pages: PageEntry[];
    frontmatter: Record<string, unknown>;
  }
): SerializedTag {
  // 1. Build computed content (breadcrumbs, post index, etc.)
  const computed = buildComputedContent(config.computed, page);

  // 2. Resolve each slot — skip conditional slots with missing regions
  const children = resolveSlots(config.slots, page, computed, config.chrome);

  // 3. Wrap in root element with layout BEM class + data-layout attribute
  return makeTag(config.tag ?? 'div', {
    class: `${prefix}-layout ${prefix}-layout--${config.block}`,
    'data-layout': config.block,
    // behaviors discover via [data-layout]
  }, children);
}
```

## What Framework Adapters Become

### Svelte Adapter (~25 lines)

```svelte
<script>
  import { Renderer } from '@refrakt-md/svelte';
  import { layoutTransform } from '@refrakt-md/transform';
  import { initBehaviors } from '@refrakt-md/behaviors';

  let { theme, page } = $props();

  const tree = $derived(layoutTransform(
    theme.layouts[matchRouteRule(page.url, theme.routeRules)],
    page
  ));

  $effect(() => {
    void page.url;
    return initBehaviors();
  });
</script>

<svelte:head><!-- SEO tags --></svelte:head>

{#key page.url}
  <Renderer node={tree} />
{/key}
```

### Astro Adapter (~20 lines)

```astro
---
import Renderer from '@refrakt-md/astro/Renderer.astro';
import { layoutTransform } from '@refrakt-md/transform';

const { page, layoutConfig } = Astro.props;
const tree = layoutTransform(layoutConfig, page);
---

<html>
<head><!-- SEO tags --></head>
<body>
  <Renderer node={tree} />
  <script>
    import { initBehaviors } from '@refrakt-md/behaviors';
    initBehaviors();
  </script>
</body>
</html>
```

## What Remains Framework-Specific

| Concern | Svelte | Astro |
|---------|--------|-------|
| Renderer | `Renderer.svelte` (recursive `<svelte:element>`) | `Renderer.astro` (recursive `Astro.self`) |
| `<head>` management | `<svelte:head>` | Astro `<head>` in base layout |
| Behavior init | `$effect` → `initBehaviors()` | `<script>` → `initBehaviors()` |
| SPA concerns | `{#key page.url}`, close-on-navigate | N/A (MPA = fresh page) |
| Interactive runes | Svelte components (direct) | Svelte islands (`client:visible`) |
| Page data loading | `+page.server.ts` | `getStaticPaths()` or content collections |

## Implementation Plan

### Phase 1: Layout Transform (framework-agnostic)

1. Add `LayoutConfig` interface to `packages/transform/src/types.ts`
2. Implement `layoutTransform()` in `packages/transform/src/layout.ts`
3. Implement computed content builders (breadcrumb, post-index)
4. Add layout behavior(s) to `packages/behaviors/` (mobile-menu, mobile-nav-panel)
5. Convert existing DocsLayout config as proof — verify output matches current HTML

### Phase 2: Migrate Svelte Adapter

1. Define layout configs in `packages/theme-base/src/layouts.ts` (alongside rune configs)
2. Simplify `ThemeShell.svelte` to call `layoutTransform()` + render tree
3. Keep existing Svelte layouts as fallback during migration
4. Verify site renders identically

### Phase 3: Astro Integration

1. Create `packages/astro/` with `Renderer.astro` (recursive tree walker)
2. Create Astro Vite plugin (reuse virtual module logic from sveltekit package)
3. Create `packages/lumina/astro/` adapter (tokens, registry)
4. Wire interactive Svelte components as `client:visible` islands
5. Build example Astro site

## Design Considerations

### Blog Layout Dual-Mode

The blog layout has two distinct modes: index (post list) vs article (individual post). Options:
- **Two separate layouts** (`blog-index`, `blog-article`) selected by route rules or frontmatter
- **Single layout with variants** driven by frontmatter (`date` present → article mode)

Two layouts is simpler and more explicit. Route rules can distinguish them:
```json
{ "pattern": "blog", "layout": "blog-index" },
{ "pattern": "blog/*", "layout": "blog-article" }
```

### Region Cloning for Mobile Panels

Mobile panels duplicate region content (header content appears in both the header bar and the
mobile panel). The layout transform needs to deep-clone `SerializedTag` trees. This is
straightforward since they're plain objects, but worth noting as a design choice — the same
content renders in two places.

### Interaction Between Layout Behaviors and Rune Behaviors

Layout behaviors (mobile-menu) and rune behaviors (tabs, accordion) both call `initBehaviors()`.
They should share the same discovery mechanism:
- Rune behaviors: `[data-rune="tabgroup"]`
- Layout behaviors: `[data-layout="docs"]` or `[data-layout-behavior="mobile-menu"]`

Both return cleanup functions, both are initialized by the same `initBehaviors()` entry point.

### Escape Hatch

Like `RuneConfig.postTransform`, `LayoutConfig` should support a `postTransform` hook for cases
that can't be expressed declaratively. This keeps the system extensible without abandoning the
declarative model.
