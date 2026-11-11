---
title: SvelteKit Adapter
description: Using refrakt.md with SvelteKit for SSR, client-side navigation, and Svelte components
---

# SvelteKit Adapter

The SvelteKit adapter connects refrakt.md to [SvelteKit](https://kit.svelte.dev) through two packages: `@refrakt-md/sveltekit`, a Vite plugin that serves virtual modules and reloads on content changes, and `@refrakt-md/svelte`, the Svelte 5 `Renderer`, `ThemeShell`, component registry, element overrides, and `behaviors` action. It is the only adapter that renders runes as a Svelte component tree, so any rune can be replaced by a Svelte component.

## Installation

```shell
npx create-refrakt my-site --target sveltekit
```

Or add it to an existing SvelteKit project, alongside the [core packages](/docs/adapters/adapters-overview#dependencies):

```shell
npm install @refrakt-md/svelte @refrakt-md/sveltekit
```

Peer dependencies: `@sveltejs/kit` 2+, `vite` 5+, and `svelte` 5.

## Configuration

Add the refrakt plugin to `vite.config.ts` alongside the SvelteKit plugin:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { refrakt } from '@refrakt-md/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit(), refrakt()],
});
```

| Option | Type | Description |
|--------|------|-------------|
| `configPath` | `string` | Path to `refrakt.config.json`. Default: `'./refrakt.config.json'` |
| `site` | `string` | Which site to use; required when the config declares several |
| `noExternal` | `string[]` | Extra packages to add to `ssr.noExternal` |
| `variables` | `Record<string, string>` | Markdoc variables for `{% $name %}`. Values are **JavaScript source expressions** embedded in the generated module (e.g. a Vite `define` global such as `'__REFRAKT_VERSION__'`), not runtime values |
| `security` | `SecurityPolicy` | Policy for untrusted author content. Default `'trusted'`; pass `'strict'` for hosted-product use |

The plugin watches the content directory (and the project's `runes/` directory) and reloads the page when a file changes.

### Virtual modules

| Module | Provides |
|--------|----------|
| `virtual:refrakt/theme` | The assembled `SvelteTheme` — manifest (with `routeRules` and the site-level SEO fields), layouts, component registry including `overrides` from `refrakt.config.json`, and element overrides |
| `virtual:refrakt/tokens` | The theme CSS plus your [site-level token overrides](/docs/adapters/adapters-overview#site-level-token-overrides). In production it imports only `base.css` and the per-rune CSS for runes the content uses |
| `virtual:refrakt/content` | `getSite`, `getTransform`, `getHighlightTransform`, `invalidateSite` — a cached `createRefraktLoader()` for this site |
| `virtual:refrakt/config` | The resolved site configuration as a JSON module |

## Minimal setup

A refrakt SvelteKit site is a catch-all route with server-side content loading:

```
src/
├── hooks.server.ts          # No-flash theme SSR
└── routes/
    ├── +layout.svelte       # Imports virtual:refrakt/tokens
    └── [...slug]/
        ├── +page.server.ts  # Loads the page via virtual:refrakt/content
        └── +page.svelte     # ThemeShell + virtual:refrakt/theme
```

{% codegroup labels="src/routes/[...slug]/+page.server.ts, src/routes/[...slug]/+page.svelte, src/hooks.server.ts" %}

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

  const url = '/' + (params.slug || '');
  const page = site.pages.find(p => p.route.url === url);
  if (!page || page.route.draft) error(404, 'Page not found');

  return {
    title: page.frontmatter.title ?? '',
    description: page.frontmatter.description ?? '',
    renderable: hl(transform(serializeTree(page.renderable))),
    regions: Object.fromEntries(
      [...page.layout.regions.entries()].map(([name, region]) => [
        name,
        { name: region.name, mode: region.mode, content: region.content.map(c => hl(transform(serialize(c)))) }
      ])
    ),
    seo: page.seo,
    url,
    highlightCss: hl.css,
  };
};

export async function entries() {
  const site = await getSite();
  return site.pages
    .filter(p => !p.route.draft)
    .map(p => ({ slug: p.route.url.replace(/^\/+|\/+$/g, '') }));
}
```

```svelte
<script lang="ts">
  import { ThemeShell } from '@refrakt-md/svelte';
  import { theme } from 'virtual:refrakt/theme';

  let { data } = $props();
</script>

<svelte:head>
  {#if data.highlightCss}{@html `<style>${data.highlightCss}</style>`}{/if}
</svelte:head>

<ThemeShell
  {theme}
  page={{
    title: data.title,
    description: data.description,
    renderable: data.renderable,
    regions: data.regions,
    pages: data.pages,
    seo: data.seo,
    url: data.url,
  }}
/>
```

```typescript
import { createThemeHandle } from '@refrakt-md/sveltekit/hooks';
import { getSite } from 'virtual:refrakt/content';

export const handle = createThemeHandle(getSite);
```

{% /codegroup %}

`src/routes/+layout.svelte` only needs `import 'virtual:refrakt/tokens';` in its script to load the CSS. Unlike the other adapters, the tree must be **serialized** (`serializeTree` / `serialize`) before the identity transform: SvelteKit passes `load()` data across the server→client boundary, which needs plain objects rather than Markdoc `Tag` instances. `pages` (the page list for nav and search) comes from a `+layout.server.ts` load; the scaffold includes one.

`createThemeHandle` (from the server-safe `@refrakt-md/sveltekit/hooks` entry) splices the no-flash theme chrome into each response — the tint `data-*` attributes on `<html>`, the `color-scheme` meta, and the pre-paint script. Compose it with other handles via SvelteKit's `sequence()`.

## ThemeShell

`ThemeShell` wraps the page and:

- selects the layout from `routeRules` and renders it through the `Renderer`
- writes SEO into `<svelte:head>` — title, description, Open Graph, Twitter, canonical link, and JSON-LD — using the site-level fields that `virtual:refrakt/theme` puts on the manifest, so no SEO helper is needed
- sets the component registry and element overrides in Svelte context
- initializes [behaviors](/docs/adapters/adapters-overview#behaviors) after each render and re-runs them on client-side navigation

## Renderer and component registry

`Renderer.svelte` walks the serialized tag tree. A node whose `data-rune` matches a component in the registry renders through that component; any other node renders as a plain HTML element with its BEM classes. So a rune is either a **component rune** (a registered Svelte component), a **behavior-driven rune** (plain HTML enhanced by `@refrakt-md/behaviors`, such as Tabs or DataTable), or a **static rune** (identity transform + CSS, such as Hero or Hint).

The base `registry` is empty — every rune renders through the identity transform and behaviors by default. Register components for runes that need custom rendering, either in `refrakt.config.json`:

```json
{
  "overrides": {
    "Hero": "./src/components/MyHero.svelte"
  }
}
```

or in code:

```typescript
import { registry as baseRegistry } from '@refrakt-md/svelte';
import MyCustomChart from './components/MyChart.svelte';

export const registry = { ...baseRegistry, Chart: MyCustomChart };
```

`ThemeShell` calls `setRegistry()` and `setElementOverrides()` for you; if you render with `Renderer` directly, call them yourself in a parent component.

### Component props

The Renderer uses `extractComponentInterface()` to split the node's children into properties, named refs, and anonymous content. A registered component receives:

- **Extracted properties** as named props (e.g., `prepTime`, `difficulty`)
- **Named refs** as Svelte 5 snippets, rendered with `{@render refName()}`
- **`children`** — anonymous content as a snippet (if any)
- **`tag`** — the original serialized tag, as an escape hatch

```svelte
<!-- components/MyRecipe.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { SerializedTag } from '@refrakt-md/svelte';

  let { prepTime, difficulty, headline, children, tag }: {
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

Refs and children are pre-rendered to HTML and wrapped with `createRawSnippet()`, so they render as static markup and work with SSR without client-side hydration.

## Element overrides

Table wrapping and code-block structure (scroll containers, copy buttons) come from framework-agnostic Markdoc node schemas in `@refrakt-md/runes`, so no element overrides are needed for them. You can still replace any HTML element with a Svelte component via `setElementOverrides()`. An element override receives `tag` and `children`:

```svelte
<div class="custom-image-wrapper">
  <img {...tag.attributes} />
  {@render children()}
</div>
```

## Behaviors action

`ThemeShell` already initializes behaviors. When you render content outside it, the `behaviors` action initializes `@refrakt-md/behaviors` on a container — on mount, again on update, with cleanup on destroy:

```svelte
<script>
  import { behaviors } from '@refrakt-md/svelte';
</script>

<div use:behaviors>
  <!-- Content with behavior-enhanced runes -->
</div>
```

## Shared setup

These work the same way for every adapter; see the overview:

- [CSS](/docs/adapters/adapters-overview#css) — here, `virtual:refrakt/tokens` loads it, tree-shaken in production
- [Site-level token overrides](/docs/adapters/adapters-overview#site-level-token-overrides) — included in `virtual:refrakt/tokens`
- [Behaviors](/docs/adapters/adapters-overview#behaviors) — `ThemeShell` or `use:behaviors`
- [SEO and structured data](/docs/adapters/adapters-overview#seo-and-structured-data) — `ThemeShell`
- [Dependencies](/docs/adapters/adapters-overview#dependencies)
