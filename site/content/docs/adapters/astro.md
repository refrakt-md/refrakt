---
title: Astro Adapter
description: Using refrakt.md with Astro for static site generation and MPA content sites
---

# Astro Adapter

The Astro adapter (`@refrakt-md/astro`) connects refrakt.md to [Astro](https://astro.build) through an Astro integration plus rendering, SEO, and behavior helpers. Astro is MPA-first, a natural fit for refrakt's content-first approach: runes render to HTML with `renderPage()`, pages ship zero client JavaScript by default, and the behavior script is included only on pages with interactive runes. It replaces `@astrojs/markdoc` rather than supplementing it.

## Installation

```shell
npx create-refrakt my-site --target astro
```

Or add it to an existing Astro project, alongside the [core packages](/docs/adapters/adapters-overview#dependencies):

```shell
npm install @refrakt-md/astro @refrakt-md/behaviors
```

`@refrakt-md/behaviors` is listed because the page template imports it directly. Peer dependency: `astro` 5.

## Configuration

Add the integration to `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import { refrakt } from '@refrakt-md/astro';

export default defineConfig({
  integrations: [refrakt()],
});
```

The integration reads `refrakt.config.json`, configures SSR `noExternal` for the refrakt packages, injects the theme CSS (only the per-rune CSS the content uses) and your site-level token overrides on every page, and reloads the page when content or rune definitions change during `astro dev`.

| Option | Type | Description |
|--------|------|-------------|
| `configPath` | `string` | Path to `refrakt.config.json`. Default: `'./refrakt.config.json'` |
| `site` | `string` | Which site to use; required for a multi-site config |
| `security` | `SecurityPolicy` | Policy for untrusted author content. Default `'trusted'`; pass `'strict'` for hosted-product use |
| `variables` | `Record<string, unknown>` | Markdoc variables for `{% $name %}`. Real JavaScript values (unlike the SvelteKit plugin's source-text expressions) |

`security` and `variables` reach only the integration's own content pass (the one that works out which rune CSS to inject). Pages render through the loader in `src/setup.ts`, so pass the same values to `createRefraktLoader()` there too.

## Minimal setup

Two files beside `astro.config.mjs` and `refrakt.config.json`: a setup module and a catch-all page.

`src/setup.ts` wraps `createRefraktLoader()` and builds the `AstroTheme` (`{ manifest, layouts }`) from whatever theme package `refrakt.config.json` names, so the page never hard-codes a theme:

{% codegroup labels="src/setup.ts" %}

```typescript
import { createRefraktLoader } from '@refrakt-md/content';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import { getThemePackage } from '@refrakt-md/types';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const configPath = resolve('refrakt.config.json');
const { site } = resolveSite(loadRefraktConfig(configPath));
const loader = createRefraktLoader({ configPath });

export const getTransform = () => loader.getTransform();
export const getHighlightTransform = () => loader.getHighlightTransform();
export const getSite = () => loader.getSite();

export const seoSiteFields = {
  siteName: site.siteName,
  baseUrl: site.baseUrl,
  defaultImage: site.defaultImage,
  logo: site.logo,
};

let _theme: { manifest: any; layouts: any } | null = null;
export async function getTheme() {
  if (_theme) return _theme;
  const themePackage = getThemePackage(site.theme);
  const { layouts } = await import(themePackage + '/layouts');
  // The manifest is JSON: resolve and read it (a bare import() of JSON fails in Node ESM)
  const manifestPath = createRequire(import.meta.url).resolve(themePackage + '/manifest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  _theme = {
    manifest: { ...manifest, routeRules: site.routeRules ?? [{ pattern: '**', layout: 'default' }] },
    layouts,
  };
  return _theme;
}
```

{% /codegroup %}

The page generates one route per content page with `getStaticPaths()`, renders it with `renderPage()`, and writes the head with `buildSeoHead()`:

{% codegroup labels="src/pages/[...slug].astro" %}

```astro
---
import { getTransform, getSite, getTheme, getHighlightTransform, seoSiteFields } from '../setup';
import { renderPage, buildSeoHead } from '@refrakt-md/astro';

export async function getStaticPaths() {
  const [transform, site, hl] = await Promise.all([getTransform(), getSite(), getHighlightTransform()]);
  const pages = site.pages
    .filter((p) => !p.route.draft)
    .map((p) => ({ url: p.route.url, title: p.frontmatter.title ?? '', draft: false }));

  return site.pages
    .filter((p) => !p.route.draft)
    .map((page) => {
      const regions = {};
      for (const [name, region] of page.layout.regions.entries()) {
        regions[name] = { name: region.name, mode: region.mode, content: region.content.map((c) => hl(transform(c))) };
      }
      return {
        params: { slug: page.route.url === '/' ? undefined : page.route.url.slice(1) },
        props: {
          page: {
            renderable: hl(transform(page.renderable)),
            regions,
            title: page.frontmatter.title ?? '',
            url: page.route.url,
            pages,
            frontmatter: page.frontmatter,
            headings: page.headings,
          },
          seo: page.seo,
          highlightCss: hl.css,
        },
      };
    });
}

const { page, seo, highlightCss } = Astro.props;
const theme = await getTheme();
const html = renderPage({ theme, page });
const head = buildSeoHead({ title: page.title, frontmatter: page.frontmatter, seo, ...seoSiteFields });
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
  {highlightCss && <style set:html={highlightCss} />}
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

No CSS imports are needed: the integration injects the theme CSS and site-token overrides. The `astro:page-load` listener re-initializes behaviors after each navigation when you use Astro View Transitions. `buildSeoHead()` returns `title`, `metaTags` (description, Open Graph, Twitter, canonical, `og:site_name`), and `jsonLd` (the script tags) as HTML strings.

## BaseLayout

`@refrakt-md/astro/BaseLayout.astro` packages most of the page body above: it renders with `renderPage()`, writes the page's SEO tags into `<head>`, and adds the behavior script (with the `astro:page-load` listener) only when `hasInteractiveRunes()` says the page needs it. It takes `theme`, `page`, `seo`, and optional `lang` (default `'en'`) and `search` (`false` strips the search chrome). It does not take the site-level SEO fields or the highlight CSS, so write the page yourself, as above, when you need either.

```astro
<BaseLayout {theme} {page} {seo}>
  <link slot="head" rel="icon" href="/favicon.svg" />
  <script slot="body-end" src="/analytics.js" />
</BaseLayout>
```

Use it in place of the `<html>` block of the page above; the `head` and `body-end` slots add your own tags.

## Component overrides

Most runes need only the identity transform, but you can register native `.astro` components for runes that need custom rendering. Render with `RfRenderer` instead of `renderPage()`:

```astro
---
import RfRenderer from '@refrakt-md/astro/RfRenderer.astro';
import MyRecipe from '../components/MyRecipe.astro';

const components = { recipe: MyRecipe };

// ... getStaticPaths() as before
const { page } = Astro.props;
---

<RfRenderer node={page.renderable} components={components} />
```

`RfRenderer` walks the tree. A node whose `data-rune` matches a key in `components` renders through that component; a node whose tag name matches a key in the optional `elements` map renders through that element override; anything else renders as plain HTML via `renderToHtml()`.

A component override receives:

- **Extracted properties** as named props (e.g., `prepTime`, `difficulty`)
- **Named refs** as named slots (e.g., `<slot name="headline" />`)
- **Anonymous content** as the default slot
- **`tag`** — the original tag object, as an escape hatch

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

## Compatibility notes

**`@astrojs/markdoc`:** this adapter replaces it. Refrakt needs the full schema transform pipeline (rune models, content models, meta injection), which cannot be expressed as plain Markdoc tag registrations.

**Content collections:** content is loaded with `createRefraktLoader()` and `getStaticPaths()`, bypassing Astro's content collections. The refrakt pipeline provides the cross-page features (entity registry, aggregation, layout cascade).

## Shared setup

These work the same way for every adapter; see the overview:

- [CSS](/docs/adapters/adapters-overview#css) — injected by the integration, tree-shaken to used runes
- [Site-level token overrides](/docs/adapters/adapters-overview#site-level-token-overrides) — injected as `virtual:refrakt/site-tokens.css`
- [Behaviors](/docs/adapters/adapters-overview#behaviors) — the inline script above, or `BaseLayout`
- [SEO and structured data](/docs/adapters/adapters-overview#seo-and-structured-data) — `buildSeoHead()`
- [Dependencies](/docs/adapters/adapters-overview#dependencies)
