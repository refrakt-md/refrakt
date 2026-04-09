---
title: SvelteKit Adapter
description: Using refrakt.md with SvelteKit for SSR, client-side navigation, and Svelte components
---

# SvelteKit Adapter

The SvelteKit adapter connects refrakt.md to [SvelteKit](https://kit.svelte.dev) via two packages:

- `@refrakt-md/svelte` — Svelte 5 Renderer component, ThemeShell, serialization, component registry, element overrides, and behaviors action
- `@refrakt-md/sveltekit` — Vite plugin with virtual modules and content HMR

## Installation

```shell
npm install @refrakt-md/svelte @refrakt-md/sveltekit @refrakt-md/content @refrakt-md/runes @refrakt-md/highlight @refrakt-md/types @markdoc/markdoc
```

Or scaffold a complete project:

```shell
npx create-refrakt my-site
```

## Configuration

Set `target` to `"svelte"` in `refrakt.config.json`:

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "svelte",
  "routeRules": [
    { "pattern": "**", "layout": "default" }
  ]
}
```

## Vite Plugin

Add the refrakt plugin to your `vite.config.ts` alongside the SvelteKit plugin:

```typescript
import { sveltekit } from '@sveltejs/vite-plugin-svelte';
import { refrakt } from '@refrakt-md/sveltekit';

export default {
  plugins: [refrakt(), sveltekit()],
};
```

The plugin watches the content directory for changes and triggers page reloads during development.

### Virtual Modules

The Vite plugin provides three virtual modules that decouple your application from hardcoded theme references:

| Virtual Module | Provides |
|---------------|----------|
| `virtual:refrakt/theme` | The resolved theme object (component registry, layouts, manifest). Supports component overrides from `refrakt.config.json` |
| `virtual:refrakt/tokens` | CSS import for the theme's design tokens. In production, includes only CSS for runes actually used |
| `virtual:refrakt/content` | Content loading functions (`getSite`, `getTransform`, `getHighlightTransform`, `invalidateSite`). Handles config reading, community package loading, theme assembly, and caching automatically |
| `virtual:refrakt/config` | The project configuration as a JSON module |

## SvelteTheme Interface

The SvelteKit adapter uses the `SvelteTheme` interface for theme objects:

```typescript
interface SvelteTheme {
  manifest: ThemeManifest;
  layouts: Record<string, LayoutConfig | Component>;
  components: ComponentRegistry;
  elements?: ElementOverrides;
}
```

- `layouts` — maps layout names to `LayoutConfig` objects (or legacy Svelte components)
- `components` — maps rune `typeof` values to Svelte components for custom rendering
- `elements` — maps HTML element names to Svelte component overrides

## Route Structure

A SvelteKit refrakt.md site uses a catch-all route with server-side content loading:

```
src/routes/
├── +layout.svelte           # Imports theme tokens CSS
└── [...slug]/
    ├── +page.svelte         # ThemeShell + Renderer from virtual:refrakt/theme
    └── +page.server.ts      # Loads page content via virtual:refrakt/content
```

The `+page.server.ts` imports from `virtual:refrakt/content` to load content, apply the identity transform, and add syntax highlighting:

```typescript
import { getSite, getTransform, getHighlightTransform } from 'virtual:refrakt/content';
import { serialize, serializeTree } from '@refrakt-md/svelte';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = async ({ params }) => {
  const [site, transform, hl] = await Promise.all([
    getSite(),
    getTransform(),
    getHighlightTransform(),
  ]);

  const slug = params.slug || '';
  const url = '/' + slug;
  const page = site.pages.find(p => p.route.url === url);

  if (!page || page.route.draft) {
    error(404, 'Page not found');
  }

  const serialized = serializeTree(page.renderable);
  const renderable = hl(transform(serialized));

  return {
    title: page.frontmatter.title ?? '',
    description: page.frontmatter.description ?? '',
    frontmatter: page.frontmatter,
    renderable,
    regions: Object.fromEntries(
      [...page.layout.regions.entries()].map(([name, region]) => [
        name,
        { name: region.name, mode: region.mode, content: region.content.map(c => hl(transform(serialize(c)))) }
      ])
    ),
    seo: page.seo,
    url,
    headings: page.headings,
    highlightCss: hl.css,
  };
};

export async function entries() {
  const site = await getSite();
  return site.pages
    .filter(p => !p.route.draft)
    .map(p => ({ slug: p.route.url === '/' ? '' : p.route.url.slice(1) }));
}
```

The virtual module handles all config loading, community package merging, theme assembly, and caching internally — no boilerplate needed.

## Renderer Component

The `Renderer.svelte` component recursively walks the serialized tag tree. For each node with a `typeof` attribute, it checks the component registry:

- If a component is registered for that type, the component handles rendering
- Otherwise, the node is rendered as a plain HTML element with its BEM classes

This gives three tiers of rune rendering:

1. **Component runes** — handled by registered Svelte components (Diagram, Chart, Nav, etc.)
2. **Behavior-driven runes** — rendered as plain HTML, enhanced by `@refrakt-md/behaviors` (Tabs, Accordion, DataTable, etc.)
3. **Static runes** — fully rendered by identity transform + CSS (Hero, Hint, Feature, etc.)

## ThemeShell Component

The `ThemeShell` component wraps the page and handles:

- SEO injection into `<svelte:head>` (JSON-LD, Open Graph, title)
- Theme context setup (component registry, element overrides, page data)
- Behavior initialization after each render

```svelte
<ThemeShell {theme} page={{ title, renderable, regions, pages, url }} />
```

## Element Overrides

Table wrapping and code block structure (scrollable containers, copy-to-clipboard buttons) are handled automatically by Markdoc node schemas in `@refrakt-md/runes`. This is framework-agnostic and SSR-correct — no adapter-specific element overrides are needed for these. The copy-to-clipboard button is progressively enhanced by `@refrakt-md/behaviors`.

The element override system is still available for user-defined overrides. You can replace any HTML element with a custom Svelte component by registering it with `setElementOverrides()`. Element overrides receive `tag` and `children` props:

```svelte
<div class="custom-image-wrapper">
  <img {...tag.attributes} />
  {@render children()}
</div>
```

## Component Registry

The component registry maps rune type names (the `data-rune` attribute value) to Svelte components. The base registry is empty — all runes render through the identity transform + behaviors by default. Themes and projects can register components for runes that need custom rendering:

```typescript
import { registry as baseRegistry } from '@refrakt-md/svelte';
import MyCustomChart from './components/MyChart.svelte';

export const registry = {
  ...baseRegistry,
  'Chart': MyCustomChart,
};
```

The registry is provided to the Renderer via Svelte context. `ThemeShell` calls `setRegistry()` automatically; if you're rendering manually, call it in your layout:

```svelte
<script>
  import { setRegistry, setElementOverrides } from '@refrakt-md/svelte';
  import { registry, elements } from './my-theme';

  setRegistry(registry);
  setElementOverrides(elements);
</script>
```

Projects can also override components via `refrakt.config.json`:

```json
{
  "overrides": {
    "Hero": "./src/components/MyHero.svelte"
  }
}
```

### Component props

When the Renderer encounters a node whose `data-rune` matches a registered component, it uses `extractComponentInterface()` to partition the node's children into properties, named refs, and anonymous content. The component receives:

- **Extracted properties** as named props (e.g., `prepTime`, `difficulty`)
- **Named refs** as Svelte 5 snippets — each ref is converted via `createRawSnippet()` so you render them with `{@render refName()}`
- **`children`** — anonymous content as a Svelte 5 snippet (if any)
- **`tag`** — the original serialized tag object for escape-hatch access

```svelte
<!-- components/MyRecipe.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { SerializedTag } from '@refrakt-md/svelte';

  let {
    prepTime,
    difficulty,
    headline,   // Snippet — named ref
    children,   // Snippet — anonymous content
    tag,        // SerializedTag — escape hatch
  }: {
    prepTime?: string;
    difficulty?: string;
    headline?: Snippet;
    children?: Snippet;
    tag: SerializedTag;
  } = $props();
</script>

<div class="my-recipe" data-difficulty={difficulty}>
  <header>
    {#if headline}{@render headline()}{/if}
    {#if prepTime}<span class="prep-time">{prepTime}</span>{/if}
  </header>
  <div class="body">
    {#if children}{@render children()}{/if}
  </div>
</div>
```

Named refs are pre-rendered to HTML and wrapped in `createRawSnippet()`, so they render as static markup. Anonymous children are wrapped the same way. This means component overrides work seamlessly with SSR — no client-side hydration is required for the ref content.

## Behaviors Action

The `behaviors` Svelte action from `@refrakt-md/svelte` initializes `@refrakt-md/behaviors` on a container element. It handles initialization on mount, re-initialization on updates, and cleanup on destroy:

```svelte
<script>
  import { behaviors } from '@refrakt-md/svelte';
</script>

<div use:behaviors>
  <!-- Content with behavior-enhanced runes -->
</div>
```

## Theme Integration

When creating a theme for SvelteKit, export a `SvelteTheme` object from the `./svelte` subpath:

```typescript
// svelte/index.ts
import type { SvelteTheme } from '@refrakt-md/svelte';
import { registry, elements } from '@refrakt-md/svelte';
import { defaultLayout, docsLayout } from '@refrakt-md/transform';

export const theme: SvelteTheme = {
  manifest: { /* ... */ },
  layouts: {
    default: defaultLayout,
    docs: docsLayout,
  },
  components: registry,
  elements,
};
```

See [Creating a Theme](/docs/themes/creating-a-theme) for the full guide.
