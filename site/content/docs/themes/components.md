---
title: Interactive Components
description: How runes achieve interactivity through behaviors, postTransform hooks, and element overrides
---

# Interactive Components

All runes are rendered through the identity transform — there are no framework-specific component overrides in the base theme. Interactivity is achieved through progressive enhancement and engine-level hooks. This page covers the three approaches and when to use each.

## Three paths to interactivity

| Approach | When to use | Examples |
|----------|-------------|---------|
| **Identity transform + CSS** | Layout, styling, structural decoration | Grid, Hint, Recipe, Feature, Hero |
| **Behaviors library** | Progressive enhancement of native HTML | Accordion, Tabs, DataTable, Form, Reveal, Preview, CodeGroup, Details |
| **postTransform hooks** | Data rendering or custom element output | Chart, Map, Diagram, Comparison, Embed, Sandbox |

### Path 1: Identity transform + CSS only

~75% of runes need nothing beyond configuration and CSS. The identity transform produces semantic HTML with BEM classes, and CSS handles all visual presentation. No JavaScript required.

This is the default path. If you can achieve what you need with CSS, don't reach for JavaScript.

### Path 2: Behaviors library

Some runes need interactivity but not a full component. The `@refrakt-md/behaviors` package provides progressive enhancement for native HTML elements:

- **Accordion** — ARIA attributes, keyboard navigation (ArrowUp/Down, Home/End), exclusive-open mode
- **Tabs** — Tab panel switching, ARIA roles, keyboard navigation
- **DataTable** — Search, sort, pagination
- **Form** — Validation, honeypot, submission handling
- **Reveal** — Step-through content display
- **Preview** — Live code preview with iframe
- **CodeGroup** — Tab-like code block switching
- **Details** — Enhanced native `<details>` elements
- **Gallery** — Image gallery navigation and lightbox display
- **Juxtapose** — Before/after image comparison with slider
- **Copy** — Copy-to-clipboard buttons on all `<pre>` code blocks
- **Scrollspy** — Active heading tracking for "On This Page" navigation
- **Version Switcher** — Version switching for versioned documentation pages

Behaviors work by scanning the DOM for `[data-rune]` attributes (set by the identity transform) and enhancing the elements with event listeners and ARIA attributes:

```typescript
import { initRuneBehaviors } from '@refrakt-md/behaviors';

// Initialize behaviors on a container element
const cleanup = initRuneBehaviors(document.querySelector('.content'));

// Clean up when done (removes event listeners)
cleanup();
```

Each behavior function receives a DOM element and returns a cleanup function:

```typescript
type BehaviorFn = (el: HTMLElement) => (() => void) | void;
```

How behaviors are initialized depends on the adapter. In SvelteKit, behaviors are applied via a Svelte action (`use:behaviors`). In the HTML adapter, `initPage()` handles initialization. See the [SvelteKit adapter](/docs/adapters/sveltekit) and [HTML adapter](/docs/adapters/html) pages for adapter-specific details.

#### Layout behaviors

Layout behaviors work like rune behaviors but operate on the page layout structure rather than individual runes. They're initialized separately via `initLayoutBehaviors()`:

```typescript
import { initLayoutBehaviors } from '@refrakt-md/behaviors';

const cleanup = initLayoutBehaviors(document.querySelector('[data-layout]'));
```

`initLayoutBehaviors()` scans for elements with `data-layout-behaviors` attributes (set by the layout transform) and wires up the matching behaviors.

Currently available layout behaviors:

- **`mobile-menu`** — handles mobile panel toggling via `[data-mobile-menu-open]`, `[data-mobile-menu-close]`, and `[data-mobile-nav-toggle]` data attributes. Panels are shown/hidden via a `[data-open]` attribute. Also handles escape key dismissal and body scroll lock.
- **`search`** — layout-level search functionality for site-wide content search.

See the [layouts reference](/docs/themes/layouts) for details on how layout behaviors connect to `LayoutConfig`.

### Path 3: postTransform hooks

For runes that need external libraries or complex data rendering, `postTransform` hooks in the engine config generate the required output during the identity transform. There are two patterns:

**Data rendering** — the hook generates complete HTML structure from the rune's metadata:

```typescript
// In the engine config
Chart: {
  block: 'chart',
  modifiers: { chartType: { source: 'meta', default: 'bar' } },
  postTransform: (node, { modifiers }) => {
    // Generate chart markup from metadata
    return node;
  },
},
```

**Custom elements** — the hook produces a custom element tag, and `@refrakt-md/behaviors` initializes it as a framework-neutral web component:

```typescript
// In the engine config
Diagram: {
  block: 'diagram',
  postTransform: (node, { modifiers }) => {
    // Produce <rf-diagram> custom element
    return node;
  },
},
```

Runes using this pattern include Chart, Map, Diagram, Comparison, Embed, Testimonial, Sandbox, Nav, and DesignContext.

## Element overrides

Standard HTML elements like `<table>` and `<pre>` get additional structure (e.g., a scrollable wrapper for wide tables, a header with language label on code blocks) from Markdoc node schemas in `@refrakt-md/runes`. This happens in the shared, framework-agnostic schema layer so the output is SSR-correct regardless of adapter. The copy-to-clipboard button on code blocks is handled by `@refrakt-md/behaviors` (progressive enhancement).

The element override system still exists for user-defined overrides — themes can register custom Svelte components for any HTML element via the `elements` export from `@refrakt-md/svelte`.

## Component override interface

When a rune has a registered component override, the renderer extracts a framework-native interface from the serialized tag tree. Component authors receive **props** and **slots** (Svelte 5 snippets) instead of working with the raw `tag` object.

### What components receive

The renderer partitions a rune's children into three categories:

| Category | Source | Component receives |
|----------|--------|--------------------|
| **Properties** | `<meta>` children with `data-field` | Scalar string props (e.g., `prepTime="15 min"`) |
| **Named refs** | Top-level children with `data-name` | Named snippets with identity-transformed content |
| **Anonymous content** | Everything else | `children` snippet |

The original `tag` object is always passed alongside as an escape hatch for advanced use cases.

### Svelte 5 example

A recipe component override using the typed interface:

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { RecipeProps } from '@refrakt-md/learning';

  let {
    prepTime, cookTime, servings, difficulty,
    headline, ingredients, steps, media,
    children, tag
  }: RecipeProps<Snippet> = $props();
</script>

<article class="my-recipe">
  <div class="hero">
    {@render media?.()}
    {@render headline?.()}
  </div>
  <div class="meta">
    {#if prepTime}<span>Prep: {prepTime}</span>{/if}
    {#if cookTime}<span>Cook: {cookTime}</span>{/if}
  </div>
  <div class="body">
    {@render ingredients?.()}
    {@render steps?.()}
  </div>
</article>
```

### Key points

- **Slots arrive identity-transformed.** BEM classes, structural elements, and data attributes are already applied. Component overrides control *placement*, not internal rendering.
- **Nested refs stay inside their parent.** Only top-level `data-name` children become slots. Nested refs (e.g., `label` inside `detail`) remain inside the parent slot's content.
- **The `tag` escape hatch.** For cases that need full tree access, the original `tag` prop is always available. Existing components using `tag` continue to work unchanged.
- **Use `refrakt inspect <rune> --interface`** to discover what props and slots a rune provides.

## The component registry

The component registry is a SvelteKit-specific extension point for runes that need custom rendering beyond what the identity transform provides. It's empty by default — all runes render through the identity transform. See the [SvelteKit adapter — Component registry](/docs/adapters/sveltekit) for details.

## Deciding which approach to use

Ask these questions in order:

1. **Can CSS handle it?** If yes, use the identity transform + CSS. This covers layout, colors, typography, spacing, visibility, animations, and most responsive behavior.

2. **Does it need DOM enhancement?** If you need ARIA attributes, keyboard navigation, or simple event handling on native HTML elements, use the behaviors library.

3. **Does it need data rendering or external libraries?** If yes, use a `postTransform` hook to generate the markup, potentially combined with a behavior or custom element for client-side initialization.
