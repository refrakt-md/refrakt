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

Currently one layout behavior is available:

- **`mobile-menu`** — handles mobile panel toggling via `[data-mobile-menu-open]`, `[data-mobile-menu-close]`, and `[data-mobile-nav-toggle]` data attributes. Panels are shown/hidden via a `[data-open]` attribute. Also handles escape key dismissal and body scroll lock.

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

Standard HTML elements like `<table>` and `<pre>` sometimes need additional structure (e.g., a scrollable wrapper for wide tables, or a copy-to-clipboard button on code blocks). How this is handled depends on the adapter:

- The **SvelteKit adapter** uses Svelte component overrides that wrap the element. See [SvelteKit adapter — Element overrides](/docs/adapters/sveltekit).
- The **HTML adapter** applies tree transforms during rendering (e.g., wrapping `<table>` in a `.rf-table-wrapper` div). See [HTML adapter](/docs/adapters/html).

## The component registry

The component registry is a SvelteKit-specific extension point for runes that need custom rendering beyond what the identity transform provides. It's empty by default — all runes render through the identity transform. See the [SvelteKit adapter — Component registry](/docs/adapters/sveltekit) for details.

## Deciding which approach to use

Ask these questions in order:

1. **Can CSS handle it?** If yes, use the identity transform + CSS. This covers layout, colors, typography, spacing, visibility, animations, and most responsive behavior.

2. **Does it need DOM enhancement?** If you need ARIA attributes, keyboard navigation, or simple event handling on native HTML elements, use the behaviors library.

3. **Does it need data rendering or external libraries?** If yes, use a `postTransform` hook to generate the markup, potentially combined with a behavior or custom element for client-side initialization.
