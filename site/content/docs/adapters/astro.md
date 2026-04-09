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
- Injects theme CSS automatically (from the configured `theme` field)
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
├── setup.ts                  # Theme + transform initialization (reads refrakt.config.json)
├── pages/
│   └── [...slug].astro       # Catch-all route for content pages
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

## Setup Module

The `src/setup.ts` module reads `refrakt.config.json` and initializes the theme, transform pipeline, and content loader. It dynamically imports the theme's manifest and layouts based on the `theme` field in your config — so the page template never hardcodes a specific theme package:

{% codegroup labels="src/setup.ts" %}

```typescript
import { loadContent } from '@refrakt-md/content';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import { loadRunePackage, mergePackages, runes as coreRunes } from '@refrakt-md/runes';
import type { RefraktConfig } from '@refrakt-md/types';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const config: RefraktConfig = JSON.parse(
  readFileSync(path.resolve('refrakt.config.json'), 'utf-8')
);
const contentDir = path.resolve(config.contentDir);
const routeRules = config.routeRules ?? [{ pattern: '**', layout: 'default' }];

let _transform, _theme, _communityTags;

async function init() {
  if (_transform) return;

  const [themeModule, manifestModule, layoutsModule] = await Promise.all([
    import(config.theme + '/transform'),
    import(config.theme + '/manifest'),
    import(config.theme + '/layouts'),
  ]);

  _theme = {
    manifest: { ...manifestModule.default, routeRules },
    layouts: layoutsModule.layouts,
  };

  const themeConfig = themeModule.themeConfig ?? themeModule.luminaConfig ?? themeModule.default;
  // ... community package merging (if config.packages is set) ...
  _transform = createTransform(themeConfig);
}

export async function getTransform() { await init(); return _transform; }
export async function getTheme() { await init(); return _theme; }
export async function getSite() {
  await init();
  return loadContent(contentDir, '/', {}, _communityTags);
}
```

{% /codegroup %}

The key detail: `config.theme` (e.g. `"@refrakt-md/lumina"`) drives the dynamic imports for `/manifest`, `/layouts`, and `/transform`. Switching themes in `refrakt.config.json` is all you need — no import changes in your page files.

## Content Loading

Use Astro's `getStaticPaths()` to generate pages from your content directory. The setup module handles config loading, community package merging, theme assembly, and caching automatically:

{% codegroup labels="src/pages/[...slug].astro" %}

```astro
---
import { getTransform, getSite, getTheme } from '../setup';
import { renderPage, buildSeoHead } from '@refrakt-md/astro';
import type { RendererNode } from '@refrakt-md/types';

export async function getStaticPaths() {
  const [transform, site] = await Promise.all([getTransform(), getSite()]);

  return site.pages
    .filter((p) => !p.route.draft)
    .map((page) => {
      const renderable = transform(page.renderable) as RendererNode;
      const regions = {};
      for (const [name, region] of page.layout.regions.entries()) {
        regions[name] = {
          name: region.name,
          mode: region.mode,
          content: region.content.map((c) => transform(c) as RendererNode),
        };
      }

      const pages = site.pages
        .filter((p) => !p.route.draft)
        .map((p) => ({
          url: p.route.url,
          title: p.frontmatter.title ?? '',
          draft: false,
        }));

      const slug = page.route.url === '/' ? undefined : page.route.url.slice(1);

      return {
        params: { slug },
        props: {
          page: {
            renderable,
            regions,
            title: page.frontmatter.title ?? '',
            url: page.route.url,
            pages,
            frontmatter: page.frontmatter,
            headings: page.headings,
          },
          seo: page.seo,
        },
      };
    });
}

const { page, seo } = Astro.props;
const theme = await getTheme();
const html = renderPage({ theme, page });
const head = buildSeoHead({ title: page.title, frontmatter: page.frontmatter, seo });
const needsBehaviors = html.includes('data-layout-behaviors') || html.includes('data-rune=');
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
import { getSite, getTransform, getTheme } from '../setup';

export async function getStaticPaths() {
  // ... same content loading as above
}

const { page, seo } = Astro.props;
const theme = await getTheme();
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

The `refrakt()` integration automatically injects CSS from the theme specified in `refrakt.config.json`. No manual CSS imports are needed in your page templates — changing the `theme` field in your config is sufficient.

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

After rendering the page HTML, check whether it contains interactive runes or layout behaviors:

```typescript
const html = renderPage({ theme, page });
const needsBehaviors = html.includes('data-layout-behaviors') || html.includes('data-rune=');
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
