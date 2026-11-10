---
title: HTML Adapter
description: Pure HTML rendering for refrakt.md — no framework required
---

# HTML Adapter

The HTML adapter (`@refrakt-md/html`) renders refrakt.md content to plain HTML strings. There is no framework runtime and no plugin: you write a Node.js build script that loads the content, renders each page, and writes static HTML files, plus a small client entry that enables interactive runes.

## Installation

```shell
npx create-refrakt my-site --target html
```

Or install it alongside the [core packages](/docs/adapters/adapters-overview#dependencies):

```shell
npm install @refrakt-md/html
```

The scaffold also uses `esbuild` to bundle the client entry.

## Configuration

There is nothing to register. The build script reads `refrakt.config.json` through `createRefraktLoader()` (or `loadContent()` directly). `security` (untrusted-content sanitization) and `variables` (Markdoc `{% $name %}` values) are passed to whichever you call:

```typescript
const loader = createRefraktLoader({
  variables: { version: '1.0.0' },
  security: 'strict',
});
```

For most static sites neither is needed.

## Minimal setup

```
build.ts            # Loads content, writes build/**/index.html
client.ts           # Client entry — initializes behaviors
refrakt.config.json
```

{% codegroup labels="build.ts, client.ts" %}

```typescript
import { createRefraktLoader } from '@refrakt-md/content';
import { renderFullPage, composeSiteTokensCss } from '@refrakt-md/html';
import type { HtmlTheme } from '@refrakt-md/html';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';

const theme: HtmlTheme = { manifest, layouts };
const configPath = path.resolve('refrakt.config.json');
const { site: siteConfig } = resolveSite(loadRefraktConfig(configPath));
const loader = createRefraktLoader({ configPath });

/** Convert Markdoc Tag instances to plain objects before the identity transform. */
function serialize(node: any): any {
  if (node == null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(serialize);
  if (node.$$mdtype === 'Tag') {
    return { $$mdtype: 'Tag', name: node.name, attributes: node.attributes, children: (node.children ?? []).map(serialize) };
  }
  return node;
}

async function build() {
  const [site, transform, hl] = await Promise.all([
    loader.getSite(),
    loader.getTransform(),
    loader.getHighlightTransform(),
  ]);
  const siteTokensCss = await composeSiteTokensCss(siteConfig, path.dirname(configPath));
  const pages = site.pages
    .filter(p => !p.route.draft)
    .map(p => ({ url: p.route.url, title: p.frontmatter.title ?? '', draft: false }));

  for (const page of site.pages) {
    if (page.route.draft) continue;

    const renderable = hl(transform(serialize(page.renderable)));
    const regions = Object.fromEntries(
      [...page.layout.regions.entries()].map(([name, r]) => [
        name,
        { name: r.name, mode: r.mode, content: r.content.map(c => hl(transform(serialize(c)))) },
      ])
    );

    const html = renderFullPage(
      { theme, page: { renderable, regions, title: page.frontmatter.title ?? '', url: page.route.url, pages } },
      {
        stylesheets: ['/styles.css'],
        scripts: ['/client.js'],
        // Highlight CSS first, then site tokens, so overrides resolve last
        headExtra: (hl.css ? `<style>${hl.css}</style>` : '') + (siteTokensCss ? `<style>${siteTokensCss}</style>` : ''),
        seo: page.seo,
        siteName: siteConfig.siteName,
        baseUrl: siteConfig.baseUrl,
        defaultImage: siteConfig.defaultImage,
        logo: siteConfig.logo,
        tintCascade: page.tintCascade,
      }
    );

    const filePath = page.route.url === '/'
      ? 'build/index.html'
      : path.join('build', page.route.url.slice(1), 'index.html');
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, html);
  }
}

build();
```

```typescript
import { initPage } from '@refrakt-md/html/client';

initPage();
```

{% /codegroup %}

The build also has to put the theme CSS at `/styles.css` (copy the theme package's `index.css`, or only the used rune files — see below) and bundle `client.ts` to `build/client.js`, for example with esbuild (`bundle: true, format: 'iife', platform: 'browser'`). The scaffolded `build.ts` does both.

## Core API

### `renderPage(input)`

Renders a page to an HTML fragment: selects the layout from `routeRules`, applies the layout transform and the HTML-specific tree transforms (table wrapping), and serializes. No `<!DOCTYPE>` or `<head>`. Use it when your own template supplies the document shell.

```typescript
import { renderPage } from '@refrakt-md/html';

const html = renderPage({ theme, page });
```

### `renderFullPage(input, options?)`

Renders a complete document: `<!DOCTYPE>`, a `<head>` with title, meta, Open Graph, JSON-LD, and stylesheets, the no-flash theme attributes and pre-paint script, the page body, the `#rf-context` data block, and script tags.

| Option | Type | Description |
|--------|------|-------------|
| `stylesheets` | `string[]` | Stylesheet URLs for `<link>` tags in `<head>` |
| `scripts` | `string[]` | Script URLs loaded before `</body>` |
| `headExtra` | `string` | Extra HTML for `<head>` (use it to inline highlight and site-tokens CSS) |
| `bodyExtra` | `string` | Extra HTML before `</body>` |
| `lang` | `string` | `<html lang>` (default `"en"`) |
| `seo` | `PageSeo` | The page's SEO data (`page.seo`) |
| `baseUrl`, `siteName`, `defaultImage`, `logo` | `string` | The [site-level SEO fields](/docs/adapters/adapters-overview#seo-and-structured-data) |
| `tintCascade` | `ResolvedTintCascade` | The page's tint cascade (`page.tintCascade`), for the no-flash `<html>` tint attributes and `color-scheme` meta |
| `locale` | `LocaleContext` | Locale strings for client behaviors; omit for English |

### `composeSiteTokensCss(site, configDir)`

Composes the [site-level token overrides](/docs/adapters/adapters-overview#site-level-token-overrides) into one CSS string — empty when there are none. Re-exported from `@refrakt-md/transform/node`.

### `computeUsedCssBlocks()` / `buildUsedCssImports()`

The used-rune CSS analysis, re-exported from `@refrakt-md/transform/node`. The scaffolded build uses it to copy only `base.css` and the per-rune files the content needs, falling back to the theme barrel if analysis fails.

### `applyHtmlTransforms(tree)`

The HTML-specific tree transforms `renderPage` applies, exported for custom render paths.

### `initPage(container?)`

From `@refrakt-md/html/client`. Reads the `#rf-context` block that `renderFullPage` embeds, then registers the custom elements and initializes rune and layout behaviors. It dynamically imports `@refrakt-md/behaviors` and resolves to a cleanup function — call it before swapping the DOM if you add SPA-style navigation.

## Shared setup

These work the same way for every adapter; see the overview:

- [CSS](/docs/adapters/adapters-overview#css) — copied into the build and linked via `stylesheets`
- [Site-level token overrides](/docs/adapters/adapters-overview#site-level-token-overrides) — `composeSiteTokensCss()`, inlined via `headExtra`
- [Behaviors](/docs/adapters/adapters-overview#behaviors) — `initPage()`
- [SEO and structured data](/docs/adapters/adapters-overview#seo-and-structured-data) — `renderFullPage` options
- [Dependencies](/docs/adapters/adapters-overview#dependencies)
