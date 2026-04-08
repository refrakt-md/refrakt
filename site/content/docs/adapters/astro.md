---
title: Astro Adapter
description: Using refrakt.md with Astro for static site generation and MPA content sites
---

# Astro Adapter

The Astro adapter connects refrakt.md to [Astro](https://astro.build) via a single package:

- `@refrakt-md/astro` — Astro integration, BaseLayout component, rendering utilities, SEO helpers, and behavior initialization

Astro is an MPA-first framework, making it a natural fit for refrakt.md's content-first approach. All runes render through `renderToHtml()` with zero client-side JavaScript by default — behavior scripts are only included on pages that use interactive runes.

## Installation

```shell
npm install @refrakt-md/astro @refrakt-md/content @refrakt-md/runes @refrakt-md/transform @refrakt-md/types @refrakt-md/behaviors @markdoc/markdoc
```

Install your theme (Lumina is the default):

```shell
npm install @refrakt-md/lumina
```

## Configuration

Create a `refrakt.config.json` in your project root with `target` set to `"astro"`:

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "astro",
  "routeRules": [
    { "pattern": "docs/**", "layout": "docs" },
    { "pattern": "**", "layout": "default" }
  ]
}
```

## Astro Integration

Add the refrakt integration to your `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import { refrakt } from '@refrakt-md/astro';

export default defineConfig({
  integrations: [refrakt()],
});
```

The integration:

- Reads `refrakt.config.json` for package configuration
- Configures SSR `noExternal` for refrakt packages (ensures they're bundled correctly)
- Watches the content directory for changes in dev mode

### Options

```javascript
refrakt({
  configPath: './refrakt.config.json', // default
})
```

## AstroTheme Interface

The Astro adapter uses the `AstroTheme` interface for theme objects:

```typescript
interface AstroTheme {
  manifest: ThemeManifest;
  layouts: Record<string, LayoutConfig>;
}
```

By default all runes render through the identity transform and `renderToHtml()`. Interactive runes are enhanced client-side by `@refrakt-md/behaviors`. For runes that need custom rendering, use `RfRenderer` with component overrides — see [Component Overrides](#component-overrides) below.

## Project Structure

```
src/
├── pages/
│   └── [...slug].astro      # Catch-all route for content pages
├── layouts/                  # (optional) custom Astro layouts
content/
├── docs/
│   ├── _layout.md            # Layout cascade for docs section
│   └── getting-started.md
├── _layout.md                # Root layout
└── index.md
astro.config.mjs
refrakt.config.json
```

## Content Loading

Use Astro's `getStaticPaths()` to generate pages from your content directory. The `loadContent()` function from `@refrakt-md/content` loads all pages at build time:

{% codegroup labels="src/pages/[...slug].astro" %}

```astro
---
import { loadContent } from '@refrakt-md/content';
import { createTransform } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/runes';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';
const theme = { manifest, layouts };
import { renderPage, buildSeoHead, hasInteractiveRunes } from '@refrakt-md/astro';

export async function getStaticPaths() {
  const site = await loadContent('./content', '/');
  const transform = createTransform(baseConfig);

  return site.pages.map((page) => {
    const renderable = transform(page.content);
    return {
      params: { slug: page.url === '/' ? undefined : page.url.slice(1) },
      props: {
        page: {
          renderable,
          regions: page.regions,
          title: page.title,
          url: page.url,
          pages: site.pages.map(p => ({
            url: p.url,
            title: p.title,
            draft: p.draft ?? false,
          })),
          frontmatter: page.frontmatter,
          headings: page.headings,
        },
        seo: page.seo,
      },
    };
  });
}

const { page, seo } = Astro.props;
const html = renderPage({ theme, page });
const head = buildSeoHead({ title: page.title, frontmatter: page.frontmatter, seo });
const needsBehaviors = hasInteractiveRunes(page.renderable);
const contextData = JSON.stringify({ pages: page.pages, currentUrl: page.url });
---

<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  {head.title && <title>{head.title}</title>}
  <Fragment set:html={head.metaTags} />
  <Fragment set:html={head.jsonLd} />
</head>
<body>
  <Fragment set:html={html} />
  <script type="application/json" id="rf-context" set:html={contextData} />
  {needsBehaviors && (
    <script>
      import { registerElements, RfContext, initRuneBehaviors, initLayoutBehaviors } from '@refrakt-md/behaviors';

      function init() {
        const el = document.getElementById('rf-context');
        if (el) {
          try {
            const ctx = JSON.parse(el.textContent || '{}');
            RfContext.pages = ctx.pages;
            RfContext.currentUrl = ctx.currentUrl;
          } catch {}
        }
        registerElements();
        initRuneBehaviors();
        initLayoutBehaviors();
      }

      init();
      document.addEventListener('astro:page-load', () => init());
    </script>
  )}
</body>
</html>
```

{% /codegroup %}

## BaseLayout Component

For convenience, `@refrakt-md/astro` provides a `BaseLayout.astro` component that handles layout selection, rendering, SEO injection, and conditional behavior loading:

{% codegroup labels="src/pages/[...slug].astro" %}

```astro
---
import BaseLayout from '@refrakt-md/astro/BaseLayout.astro';
import { loadContent } from '@refrakt-md/content';
import { createTransform } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/runes';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';
const theme = { manifest, layouts };

export async function getStaticPaths() {
  // ... same content loading as above
}

const { page, seo } = Astro.props;
---

<BaseLayout {theme} {page} {seo} />
```

{% /codegroup %}

The BaseLayout component:

- Selects the layout via `matchRouteRule()` using your route rules
- Runs `layoutTransform()` to produce the full page tree (sidebar, TOC, breadcrumbs)
- Renders via `renderToHtml()` + `set:html`
- Injects SEO meta tags (Open Graph, JSON-LD) into `<head>`
- Conditionally includes the behavior script only on pages with interactive runes

### Slots

BaseLayout accepts named slots for customization:

```astro
<BaseLayout {theme} {page} {seo}>
  <link slot="head" rel="icon" href="/favicon.svg" />
  <script slot="body-end" src="/analytics.js" />
</BaseLayout>
```

## CSS Injection

Import the theme CSS in your Astro layout or page. For Lumina:

```astro
---
// In your layout or page component
---
<style is:global>
  @import '@refrakt-md/lumina';
</style>
```

Or add it to your `astro.config.mjs`:

```javascript
export default defineConfig({
  integrations: [refrakt()],
  vite: {
    css: {
      preprocessorOptions: {
        // Theme CSS is handled by the integration
      }
    }
  }
});
```

## SEO

The `buildSeoHead()` helper transforms page SEO data into HTML meta tag strings:

```typescript
import { buildSeoHead } from '@refrakt-md/astro';

const head = buildSeoHead({
  title: page.title,
  frontmatter: page.frontmatter,
  seo: page.seo,
});

// head.title — page title string
// head.metaTags — OG, description, twitter card meta tags
// head.jsonLd — JSON-LD structured data script tags
```

## Behavior Initialization

Behaviors are interactive enhancements for runes like tabs, accordions, and data tables. The Astro adapter ships zero JavaScript for pages that only use static runes.

### Conditional Loading

Use `hasInteractiveRunes()` to check whether a page needs behavior scripts:

```typescript
import { hasInteractiveRunes } from '@refrakt-md/astro';

const needsBehaviors = hasInteractiveRunes(page.renderable);
```

### View Transitions

When using Astro View Transitions, behaviors must re-initialize after each navigation. The behavior script listens to the `astro:page-load` event:

```javascript
document.addEventListener('astro:page-load', () => {
  registerElements();
  initRuneBehaviors();
  initLayoutBehaviors();
});
```

This is handled automatically by the BaseLayout component.

## Component Overrides

While most runes need only the identity transform, you can register native `.astro` components for runes that need custom rendering. Use `RfRenderer` instead of `renderPage()` to enable component dispatch:

{% codegroup labels="src/pages/[...slug].astro" %}

```astro
---
import RfRenderer from '@refrakt-md/astro/RfRenderer.astro';
import Table from '@refrakt-md/astro/elements/Table.astro';
import Pre from '@refrakt-md/astro/elements/Pre.astro';
import MyRecipe from '../components/MyRecipe.astro';

const components = { recipe: MyRecipe };
const elements = { table: Table, pre: Pre };

// ... getStaticPaths() as before
const { page } = Astro.props;
---

<RfRenderer node={page.renderable} components={components} elements={elements} />
```

{% /codegroup %}

### How it works

`RfRenderer` recursively walks the renderable tree. For each tag node:

1. If the node has a `data-rune` attribute matching a key in `components`, the registered `.astro` component renders it
2. If the node's HTML tag name matches a key in `elements`, the element override renders it
3. Otherwise, the node renders as plain HTML via `renderToHtml()`

### Component props

Component overrides receive:

- **Extracted properties** as named props (e.g., `prepTime`, `difficulty`)
- **Named refs** as named Astro slots (e.g., `<slot name="headline" />`)
- **Anonymous content** as the default slot
- **`tag`** — the original tag object for escape-hatch access

```astro
---
// components/MyRecipe.astro
const { prepTime, difficulty, tag } = Astro.props;
---

<div class="my-recipe" data-difficulty={difficulty}>
  <header>
    <slot name="headline" />
    {prepTime && <span class="prep-time">{prepTime}</span>}
  </header>
  <div class="body">
    <slot />
  </div>
</div>
```

### Built-in element overrides

The adapter ships two element overrides:

- `Table.astro` — wraps tables in a scrollable container
- `Pre.astro` — enhances code blocks with copy-to-clipboard

Import them from `@refrakt-md/astro/elements/Table.astro` and `@refrakt-md/astro/elements/Pre.astro`.

## Theme Integration

When creating a theme for Astro, export an `AstroTheme` object from the `./astro` subpath:

```typescript
// astro/index.ts
import type { AstroTheme } from '@refrakt-md/astro';
import { defaultLayout, docsLayout } from '@refrakt-md/transform';

export const theme: AstroTheme = {
  manifest: { /* ... */ },
  layouts: {
    default: defaultLayout,
    docs: docsLayout,
  },
};
```

## Differences from SvelteKit

| Concern | SvelteKit | Astro |
|---------|-----------|-------|
| **Rendering** | Recursive Svelte Renderer | `renderToHtml()` or recursive `RfRenderer` |
| **Component registry** | Svelte components for custom runes | `.astro` components via `RfRenderer` |
| **Behavior cleanup** | SPA lifecycle (navigate, destroy) | MPA — no cleanup needed |
| **CSS** | Virtual module with tree-shaking | Direct import |
| **Content loading** | `+page.server.ts` with `load()` | `getStaticPaths()` |
| **HMR** | Full-reload on content change | Vite watcher via integration |

## Compatibility Notes

**`@astrojs/markdoc` coexistence:** This adapter replaces `@astrojs/markdoc` — it does not supplement it. Refrakt needs the full schema transform pipeline (rune models, content models, meta tag injection) which cannot be expressed as simple Markdoc tag registrations. For a lighter integration that preserves Astro's content collections, use `@refrakt-md/vite` instead.

**Astro content collections:** This adapter uses `loadContent()` + `getStaticPaths()`, bypassing Astro's native content collections. The refrakt content pipeline provides richer cross-page features (entity registry, aggregation, layout cascade) than content collections alone.
