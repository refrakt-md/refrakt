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

Six identified cases (three in current layouts, three common across docs/blog sites):

- **Breadcrumbs** (DocsLayout): walks the nav region tree to build `slug → groupTitle` map,
  renders `category › page`. Pure function on nav tree + current URL.
- **Blog post index** (BlogLayout): filters the `pages` list by `/blog/` prefix, renders post
  cards. Pure function on page list.
- **Table of contents** (DocsLayout): filters page headings (h2/h3), renders anchor links with
  scroll-spy. Pure function on headings array. Conditionally visible (2+ headings, frontmatter
  opt-out).
- **Prev/next navigation**: walks nav tree to find current page's neighbors, emits previous/next
  links. Universal in docs sites (Docusaurus, VitePress, GitBook, ReadTheDocs).
- **Related pages**: filters pages list by shared tags, emits a sidebar list. Common in knowledge
  bases and blog sidebars.
- **Reading time**: counts words in content tree, emits "5 min read" span. Common in blog themes.

All can be **computed at transform time** as pre-built `SerializedTag` trees and injected as
structural elements. The content system already has the page list, nav tree, and headings.

### 4. Interactive Behavior (solved by `@refrakt-md/behaviors`)

Mobile menu toggle, panel open/close, body scroll lock, escape key dismiss — same pattern as
`tabsBehavior`, `accordionBehavior`, etc. Discover elements by `data-*` attributes, wire up
event listeners, return cleanup function.

New behaviors needed:
- `mobile-menu` — toggle panel visibility, body scroll lock, escape dismiss
- `mobile-nav-panel` — secondary panel for docs nav, same pattern
- ~~`scrollspy` — highlight active heading in TOC~~ **Already implemented** in
  `packages/behaviors/src/behaviors/scrollspy.ts` — pure DOM IntersectionObserver, discovers
  `[data-scrollspy]` containers, sets `data-active` on active `<li>`. Registered in
  `initRuneBehaviors()` alongside `copyBehavior`.

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

  /** Static chrome injected into the structure (buttons, icons, panels, page metadata) */
  chrome?: Record<string, LayoutStructureEntry>;

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
   *  - 'clone:region:<name>' — cloned copy of a region (for mobile panels)
   *  - 'chrome:<name>' — output of a named chrome entry */
  source?: string;
  /** Only render this slot if the source region/computed exists */
  conditional?: boolean;
  /** Only render this slot if a frontmatter key is truthy (or not explicitly false) */
  frontmatterCondition?: string;
  /** Wrapper element for inner content */
  wrapper?: { tag: string; class: string; conditionalModifier?: { computed: string; modifier: string } };
  /** Static children or nested structure (when present, `source` on parent is omitted) */
  children?: (string | LayoutSlot | LayoutStructureEntry)[];
  /** Conditional BEM modifier class based on region existence */
  conditionalModifier?: { region: string; modifier: string };
}

interface ComputedContent {
  /** Type of computed content */
  type: 'breadcrumb' | 'post-index' | 'toc' | 'prev-next' | 'related-pages' | 'reading-time';
  /** Data source: region name, 'pages', 'headings', 'content', etc. */
  source: string;
  /** Type-specific options */
  options?: Record<string, any>;
  /** When to show this computed content (if omitted, always shown) */
  visibility?: {
    /** Minimum count of source items needed */
    minCount?: number;
    /** Frontmatter key that can disable it (value=false hides) */
    frontmatterToggle?: string;
  };
}

/** Extended StructureEntry for layout chrome — adds page data access and iteration */
interface LayoutStructureEntry extends StructureEntry {
  /** Inject text from page-level data: 'title', 'url', 'frontmatter.date', etc. */
  pageText?: string;
  /** Only inject this element if the referenced page field is truthy */
  pageCondition?: string;
  /** Date formatting when pageText resolves to a date string */
  dateFormat?: Intl.DateTimeFormatOptions;
  /** Repeat this element for each item in a page data array (e.g. 'frontmatter.tags') */
  iterate?: { source: string };
  /** Set attributes from page data (parallel to StructureEntry's fromModifier) */
  attrs?: Record<string, string | { fromModifier: string } | { fromPageData: string }>;
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
      conditionalModifier: { region: 'nav', modifier: 'has-nav' },
      wrapper: {
        tag: 'div',
        class: 'rf-docs-content__inner',
        conditionalModifier: { computed: 'toc', modifier: 'has-toc' },
      },
      children: [
        { tag: 'div', class: 'rf-docs-content__body', source: 'content' },
        { tag: 'aside', class: 'rf-docs-toc', source: 'computed:toc', conditional: true },
      ],
    },
    'prev-next': {
      tag: 'nav',
      class: 'rf-docs-prev-next',
      source: 'computed:prevNext',
      conditional: true,
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
    toc: {
      type: 'toc',
      source: 'headings',
      options: { levels: [2, 3] },
      visibility: { minCount: 2, frontmatterToggle: 'toc' },
      // emits: <nav class="rf-on-this-page" data-scrollspy>
      //          <p class="rf-on-this-page__title">On this page</p>
      //          <ul class="rf-on-this-page__list">
      //            <li class="rf-on-this-page__item" data-level="2">
      //              <a href="#id">Heading text</a>
      //            </li>
      //          </ul>
      //        </nav>
      // The data-scrollspy attribute enables scrollspyBehavior (already in @refrakt-md/behaviors)
      // to discover the TOC and highlight the active heading as the user scrolls.
    },
    prevNext: {
      type: 'prev-next',
      source: 'region:nav',
      // walks nav tree to find current page, emits:
      // <a data-name="prev" href="/prev-url">
      //   <span data-name="label">Previous</span>
      //   <span data-name="title">Page Title</span>
      // </a>
      // <a data-name="next" href="/next-url">
      //   <span data-name="label">Next</span>
      //   <span data-name="title">Page Title</span>
      // </a>
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
    headings?: Array<{ level: number; text: string; id: string }>;
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
    theme.layouts[matchRouteRule(page.url, theme.manifest.routeRules ?? [])],
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

1. Add interfaces to `packages/transform/src/types.ts`:
   `LayoutConfig`, `LayoutSlot`, `ComputedContent`, `LayoutStructureEntry`
2. Implement `layoutTransform()` in `packages/transform/src/layout.ts`:
   slot resolution, chrome building (with `pageText`/`pageCondition`/`iterate`/`dateFormat`),
   frontmatter conditions, conditional modifiers
3. Implement computed content builders:
   - `breadcrumb` — nav tree → slug/groupTitle map
   - `post-index` — pages list → filtered/sorted post cards
   - `toc` — headings → anchor links with `data-scrollspy`
   - `prev-next` — nav tree → previous/next page links
4. Add layout behavior(s) to `packages/behaviors/` (mobile-menu, mobile-nav-panel)
   — Note: `scrollspyBehavior` is already done (`packages/behaviors/src/behaviors/scrollspy.ts`)
5. Convert DocsLayout + BlogLayout configs as proof — verify output matches current HTML

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

### TOC as Computed Content (validated by implementation)

The existing `OnThisPage.svelte` component in lumina is a pure function from headings → HTML.
Under the layout transform model, the `toc` computed content builder produces this as a
`SerializedTag` tree instead, which the Renderer walks like any other markup. This eliminates the
Svelte component entirely — the scoped styles move to `packages/lumina/styles/` as regular CSS
(consistent with how all other rune styles work).

Key details:
- Builder emits `data-scrollspy` on the `<nav>` so `scrollspyBehavior` discovers it automatically
- Visibility is resolved at transform time: check heading count against `visibility.minCount` and
  frontmatter against `visibility.frontmatterToggle` — if conditions fail, omit the computed node
  and the `--has-toc` modifier on the wrapper
- CSS handles responsive hiding (`@media (max-width: 1100px)`) — not a transform concern
- The `__inner` flex wrapper pattern (content body + computed sidebar) may generalize to other
  layouts wanting an adjacent sidebar (e.g. "related articles")

### Escape Hatch

Like `RuneConfig.postTransform`, `LayoutConfig` should support a `postTransform` hook for cases
that can't be expressed declaratively. This keeps the system extensible without abandoning the
declarative model.

## Additional Layout Examples

### Blog Article Layout (with frontmatter-sourced chrome)

Demonstrates `LayoutStructureEntry` with `pageText`, `pageCondition`, `iterate`, and `dateFormat`:

```ts
const blogArticleLayout: LayoutConfig = {
  block: 'blog-article',
  slots: {
    header: { tag: 'header', class: 'rf-blog-header', source: 'region:header',
              conditional: true, wrapper: { tag: 'div', class: 'rf-blog-header__inner' } },
    content: {
      tag: 'article', class: 'rf-blog-article',
      children: [
        { tag: 'header', class: 'rf-blog-article__header', source: 'chrome:article-header' },
        { tag: 'div', class: 'rf-blog-article__body', source: 'content' },
      ],
    },
    sidebar: { tag: 'aside', class: 'rf-blog-sidebar', source: 'region:sidebar',
               conditional: true, frontmatterCondition: 'sidebar' },
    footer: { tag: 'footer', class: 'rf-blog-footer', source: 'region:footer',
              conditional: true },
  },
  chrome: {
    'article-header': {
      tag: 'header', ref: 'article-header',
      children: [
        { tag: 'h1', ref: 'title', pageText: 'title' },
        { tag: 'div', ref: 'meta', pageCondition: 'frontmatter.date', children: [
          { tag: 'time', ref: 'date', pageText: 'frontmatter.date',
            dateFormat: { year: 'numeric', month: 'long', day: 'numeric' },
            attrs: { datetime: { fromPageData: 'frontmatter.date' } } },
          { tag: 'span', ref: 'author', pageText: 'frontmatter.author',
            pageCondition: 'frontmatter.author' },
        ]},
        { tag: 'div', ref: 'tags', pageCondition: 'frontmatter.tags', children: [
          { tag: 'span', ref: 'tag', iterate: { source: 'frontmatter.tags' } },
        ]},
      ],
    },
  },
  behaviors: ['mobile-menu'],
};
```

### Tutorial Layout (Docusaurus/VitePress-style)

Same as DocsLayout but with prev/next navigation, demonstrating computed content reuse:

```ts
const tutorialLayout: LayoutConfig = {
  block: 'tutorial',
  slots: {
    header: { tag: 'header', source: 'region:header', conditional: true },
    sidebar: { tag: 'aside', source: 'region:nav', conditional: true },
    content: {
      tag: 'main',
      conditionalModifier: { region: 'nav', modifier: 'has-nav' },
      wrapper: { tag: 'div', class: 'rf-tutorial-content__inner',
                 conditionalModifier: { computed: 'toc', modifier: 'has-toc' } },
      children: [
        { tag: 'div', source: 'content' },
        { tag: 'aside', source: 'computed:toc', conditional: true },
      ],
    },
    'prev-next': { tag: 'nav', source: 'computed:prevNext', conditional: true },
  },
  computed: {
    toc: { type: 'toc', source: 'headings', options: { levels: [2, 3] },
           visibility: { minCount: 2, frontmatterToggle: 'toc' } },
    prevNext: { type: 'prev-next', source: 'region:nav' },
  },
  behaviors: ['mobile-menu', 'mobile-nav-panel', 'scrollspy'],
};
```

## Pattern Coverage Assessment

### Expressible with current interfaces

| Pattern | Example sites | How |
|---------|--------------|-----|
| Docs with sidebar + TOC | Stripe, Tailwind, Next.js | DocsLayout config (above) |
| Simple content page | Landing pages, marketing | DefaultLayout config |
| Knowledge base / wiki | Notion-style | Default + breadcrumb computed |
| Changelog | Release notes | Default layout, content via runes |

### Expressible with new computed content types (no interface changes)

| Pattern | ComputedContent type | Source |
|---------|---------------------|--------|
| Prev/next navigation | `prev-next` | `region:nav` — walks nav tree |
| Related pages sidebar | `related-pages` | `pages` — matches by tags |
| Reading time estimate | `reading-time` | `content` — word count |

### Requires LayoutStructureEntry extensions

| Pattern | What's needed | Extension |
|---------|--------------|-----------|
| Blog article header (title, date, author) | Inject text from frontmatter | `pageText`, `pageCondition` |
| Tags/categories pill list | Repeat element per array item | `iterate` |
| Date formatting ("February 26, 2026") | Format date strings | `dateFormat` |
| Conditional author bio | Show only if frontmatter field exists | `pageCondition` |

### Requires LayoutSlot extension

| Pattern | What's needed | Extension |
|---------|--------------|-----------|
| Optional sidebar via frontmatter | `sidebar: false` in frontmatter hides slot | `frontmatterCondition` |

### Out of scope (component/behavior territory)

| Pattern | Why | How to support |
|---------|-----|---------------|
| Search interface | Live query + results overlay | `{% search %}` rune + component |
| Dark mode toggle | localStorage + DOM class toggle | Behavior or component in header region |
| Version selector dropdown | Interactive dropdown + redirect | Component in header region |
| Collapsible nav sections | Expand/collapse on click | Behavior on Nav rune |
| Language switcher | Sync all code blocks on page | Behavior coordinating TabGroups |

## Priority Order for New Capabilities

1. **Prev/next navigation** (ComputedContent) — universal docs expectation, pure function
2. **Frontmatter-sourced chrome** (LayoutStructureEntry) — unlocks blog article layout as
   declarative config; `pageText`, `pageCondition`, `dateFormat`
3. **Iterable chrome** (LayoutStructureEntry) — tags, categories, author lists; `iterate`
4. **Frontmatter slot conditions** (LayoutSlot) — optional sidebars; `frontmatterCondition`
5. **Related pages** (ComputedContent) — knowledge base / blog sidebar engagement
6. **Reading time** (ComputedContent) — blog article headers
