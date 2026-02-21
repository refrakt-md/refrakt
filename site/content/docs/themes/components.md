---
title: Interactive Components
description: When and how to use Svelte components for runes that need JavaScript behavior
---

# Interactive Components

Most runes are styled entirely through the identity transform and CSS. But some runes need JavaScript — for external libraries, complex data rendering, or interactive state. This page covers the three approaches to interactivity and when to use each.

## Three paths to interactivity

| Approach | When to use | Examples |
|----------|-------------|---------|
| **Identity transform + CSS** | Layout, styling, structural decoration | Grid, Hint, Recipe, Feature, Hero |
| **Behaviors library** | Progressive enhancement of native HTML | Accordion, Tabs, DataTable, Form, Reveal |
| **Svelte component** | External libraries, complex rendering | Chart, Map, Diagram, Comparison, Sandbox |

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

In SvelteKit, behaviors are typically applied via a Svelte action:

```svelte
<script>
  import { behaviors } from '@refrakt-md/theme-base/sveltekit/behaviors';
</script>

<div use:behaviors>
  <!-- Content with behavior-enhanced runes -->
</div>
```

The action handles initialization on mount, re-initialization on updates, and cleanup on destroy.

{% hint type="note" %}
Behaviors skip elements managed by framework components. If a rune has a registered Svelte component, the behavior won't apply — the component handles interactivity instead.
{% /hint %}

### Path 3: Svelte components

For runes that need external libraries or complex rendering logic, register a Svelte component in the component registry.

## The component registry

The registry maps `typeof` attribute values to Svelte components. It lives in your theme's SvelteKit adapter:

```typescript
// packages/theme-base/sveltekit/registry.ts
import type { ComponentRegistry } from '@refrakt-md/svelte';
import Chart from './components/Chart.svelte';
import Diagram from './components/Diagram.svelte';
import Embed from './components/Embed.svelte';
// ...

export const registry: ComponentRegistry = {
  'Chart': Chart,
  'Diagram': Diagram,
  'Embed': Embed,
  'Map': MapComponent,
  'MapPin': MapComponent,
  'Comparison': Comparison,
  'ComparisonColumn': Comparison,
  'ComparisonRow': Comparison,
  'Testimonial': Testimonial,
  'Sandbox': Sandbox,
  'DesignContext': DesignContext,
  'Nav': Nav,
  'NavGroup': Nav,
  'NavItem': Nav,
};
```

The registry is set in Svelte context during app initialization. The Renderer checks it when rendering each node:

1. If `typeof` attribute exists and matches a registry entry → use the component
2. If `node.name` matches an element override (e.g., `table`, `pre`) → use the override
3. Otherwise → render as generic HTML with `<svelte:element>`

## Writing a component

Every registered component receives two props:

```svelte
<script lang="ts">
  import type { SerializedTag } from '@refrakt-md/types';
  import type { Snippet } from 'svelte';

  let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>
```

| Prop | Type | Description |
|------|------|-------------|
| `tag` | `SerializedTag` | The full serialized node with attributes and children |
| `children` | `Snippet` | Pre-rendered child content (use `{@render children()}` to output) |

### Reading metadata

Components extract configuration from meta tag children:

```svelte
<script lang="ts">
  let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

  // Helper to read meta tag values
  const getMeta = (prop: string) =>
    tag.children
      .find((c: any) => c?.name === 'meta' && c?.attributes?.property === prop)
      ?.attributes?.content;

  const embedUrl = getMeta('embedUrl') || getMeta('url') || '';
  const title = getMeta('title') || 'Embedded content';
</script>
```

### Reading data attributes

The identity transform sets data attributes from resolved modifiers. Components can read these:

```svelte
<script lang="ts">
  const method = tag.attributes['data-method'] || 'GET';
  const difficulty = tag.attributes['data-difficulty'] || 'medium';
</script>
```

### Rendering children

Use the `children` snippet for the rune's content, or iterate `tag.children` for custom rendering:

```svelte
<!-- Simple: render all children as-is -->
<div class="rf-my-rune">
  {@render children()}
</div>

<!-- Custom: process children individually -->
<div class="rf-my-rune">
  {#each tag.children as child}
    {#if isTag(child) && child.attributes?.typeof === 'ChildRune'}
      <!-- Handle specific child types -->
    {:else}
      <Renderer node={child} />
    {/if}
  {/each}
</div>
```

### Example: Embed component

A complete component that reads metadata and renders an iframe:

```svelte
<script lang="ts">
  import type { SerializedTag } from '@refrakt-md/types';
  import type { Snippet } from 'svelte';

  let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

  const getMeta = (prop: string) =>
    tag.children
      .find((c: any) => c?.name === 'meta' && c?.attributes?.property === prop)
      ?.attributes?.content;

  const embedUrl = getMeta('embedUrl') || getMeta('url') || '';
  const title = getMeta('title') || 'Embedded content';
  const aspectRatio = getMeta('aspectRatio') || '16/9';
</script>

<div class="rf-embed">
  {#if embedUrl}
    <div class="rf-embed__frame" style="aspect-ratio: {aspectRatio}">
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        allowfullscreen
      ></iframe>
    </div>
  {/if}
  <div class="rf-embed__caption">
    {@render children()}
  </div>
</div>
```

## Element overrides

Element overrides enhance standard HTML elements without requiring a `typeof` marker. They're useful for wrapping elements like `<table>` or `<pre>` with additional structure:

```typescript
// packages/theme-base/sveltekit/elements.ts
export const elements: ElementOverrides = {
  'table': Table,
  'pre': Pre,
};
```

Element overrides receive the same `tag` and `children` props as components. Example — wrapping tables with a scrollable container:

```svelte
<div class="table-wrapper">
  <table {...tag.attributes}>
    {@render children()}
  </table>
</div>

<style>
  .table-wrapper {
    overflow-x: auto;
    margin: 1.5rem 0;
    border: 1px solid var(--rf-color-border);
    border-radius: var(--rf-radius-md);
  }
</style>
```

## Deciding which approach to use

Ask these questions in order:

1. **Can CSS handle it?** If yes, use the identity transform + CSS. This covers layout, colors, typography, spacing, visibility, animations, and most responsive behavior.

2. **Does it need DOM enhancement?** If you need ARIA attributes, keyboard navigation, or simple event handling on native HTML elements, use the behaviors library.

3. **Does it need Svelte state, external libraries, or complex rendering?** If yes, create a Svelte component and register it.

The majority of runes fall into category 1. A handful need category 2. Very few need category 3 — the base theme has only 9 registered components out of 45+ runes.
