---
title: Eleventy Adapter
description: Using refrakt.md with Eleventy v3 — no bundler required
---

# Eleventy Adapter

The Eleventy adapter (`@refrakt-md/eleventy`) integrates refrakt.md with [Eleventy (11ty) v3](https://www.11ty.dev/). There is no Vite and no bundler: a global data file loads the content at build time and renders every page to an HTML string, pagination turns that data into one output page per content page, and a Nunjucks (or Liquid) template writes the HTML. It sits between the HTML adapter (a raw API) and SvelteKit (a full application framework) in complexity.

## Installation

```shell
npx create-refrakt my-site --target eleventy
```

Or add it to an existing Eleventy project, alongside the [core packages](/docs/adapters/adapters-overview#dependencies):

```shell
npm install @refrakt-md/eleventy
```

Peer dependency: `@11ty/eleventy` 3. Eleventy 3 is ESM-native, and the adapter, data files, and config all use `import`/`export` — set `"type": "module"` in `package.json`.

## Configuration

Register the plugin in `eleventy.config.js`. It passthrough-copies the theme CSS and the behaviors bundle and watches the content directory under `--serve`:

{% codegroup labels="eleventy.config.js" %}

```javascript
import { refraktPlugin, writeSiteTokensCss } from '@refrakt-md/eleventy';
import { resolve } from 'node:path';

// Compose the site-level token overrides once, at config-load time
await writeSiteTokensCss(resolve('refrakt.config.json'), resolve('src/_generated/site-tokens.css'));

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(refraktPlugin, {
    cssFiles: ['node_modules/@refrakt-md/lumina/index.css'],
    contentDir: resolve('content'),
  });

  eleventyConfig.addPassthroughCopy({
    // The theme barrel @imports these relative to itself
    'node_modules/@refrakt-md/lumina/tokens': '/css/tokens',
    'node_modules/@refrakt-md/lumina/styles': '/css/styles',
    'node_modules/@refrakt-md/behaviors/dist/index.js': '/js/behaviors.js',
    'src/_generated/site-tokens.css': '/css/site-tokens.css',
  });

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
  };
}
```

{% /codegroup %}

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configPath` | `string` | `'./refrakt.config.json'` | Path to the refrakt config |
| `site` | `string` | — | Which site to use from a multi-site config |
| `cssFiles` | `string[]` | — | CSS files to passthrough-copy (typically from `node_modules`) |
| `cssPrefix` | `string` | `'/css'` | Output location for the copied CSS |
| `behaviorFile` | `string` | — | The behaviors bundle to passthrough-copy |
| `jsPrefix` | `string` | `'/js'` | Output location for the copied bundle |
| `contentDir` | `string` | — | Content directory to watch under `eleventy --serve` |
| `examplesDir` | `string` | — | Sandbox examples directory to watch |

Keep the content directory outside Eleventy's input directory (or add it to `eleventyConfig.ignores`), so Eleventy does not process refrakt's `.md` files as its own Markdown. Content edits under `--serve` trigger a full rebuild rather than HMR, typically visible in a second or two.

To copy only the per-rune CSS your content uses instead of the whole theme, pass `getUsedCssCopyMap()` (a passthrough map for the used rune blocks) to `addPassthroughCopy()`, and generate one `<link>` per block from `getUsedCssImports()`.

## Minimal setup

```
content/                 # Markdoc content, outside Eleventy's input
src/
├── _data/refrakt.js     # Global data file — loads and renders content
├── _includes/base.njk   # Base template
└── pages.njk            # Pagination — one page per content item
eleventy.config.js
refrakt.config.json
```

{% codegroup labels="src/_data/refrakt.js, src/pages.njk, src/_includes/base.njk" %}

```javascript
import { createDataFile } from '@refrakt-md/eleventy';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';
import { resolve } from 'node:path';

const { site } = resolveSite(loadRefraktConfig(resolve('refrakt.config.json')));

export default createDataFile({
  theme: { manifest, layouts },
  contentDir: site.contentDir,
  seo: {
    siteName: site.siteName,
    baseUrl: site.baseUrl,
    defaultImage: site.defaultImage,
    logo: site.logo,
  },
});
```

```jinja
---
layout: base.njk
pagination:
  data: refrakt
  size: 1
  alias: page
permalink: "{{ page.url }}{% if not page.url.endsWith('/') %}/{% endif %}"
---
```

```jinja
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  {% if page.seo.title %}<title>{{ page.seo.title }}</title>{% endif %}
  {{ page.seo.metaTags | safe }}
  {{ page.seo.jsonLd | safe }}
  <link rel="stylesheet" href="/css/index.css">
  <link rel="stylesheet" href="/css/site-tokens.css">
</head>
<body>
  {{ page.html | safe }}
  <script type="application/json" id="rf-context">{{ page.contextJson | safe }}</script>
  {% if page.hasInteractiveRunes %}
  <script type="module">
    import { registerElements, RfContext, initRuneBehaviors, initLayoutBehaviors } from '/js/behaviors.js';

    const contextEl = document.getElementById('rf-context');
    if (contextEl) {
      try {
        const ctx = JSON.parse(contextEl.textContent || '{}');
        RfContext.pages = ctx.pages;
        RfContext.currentUrl = ctx.currentUrl;
      } catch {}
    }
    registerElements();
    initRuneBehaviors();
    initLayoutBehaviors();
  </script>
  {% endif %}
</body>
</html>
```

{% /codegroup %}

Eleventy iterates over the `refrakt` data array and writes each item to `<url>/index.html`. Always use `| safe` on `page.html`, `page.seo.metaTags`, `page.seo.jsonLd`, and `page.contextJson`; without it Nunjucks escapes the HTML and the page shows raw markup. The behavior script is included only where `page.hasInteractiveRunes` is true, so static pages ship no JavaScript. A reference template ships in the package at `@refrakt-md/eleventy/templates/base.njk`.

## createDataFile

`createDataFile()` returns an Eleventy [global data](https://www.11ty.dev/docs/data-global/) function that loads all content, renders each page through its layout, and returns one object per page.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme` | `EleventyTheme` | — | `{ manifest, layouts }` (required) |
| `contentDir` | `string` | `'./content'` | The content directory |
| `basePath` | `string` | `'/'` | Base URL path for all pages |
| `plugins` | `Plugin[]` | — | Loaded plugin objects to run in the content pipeline |
| `seo` | `SeoToHtmlOptions` | — | The site-level SEO fields (`siteName`, `baseUrl`, `defaultImage`, `logo`), applied to every page's tags |
| `security` | `SecurityPolicy` | `'trusted'` | Policy for untrusted author content; `'strict'` sanitizes author scripts |
| `variables` | `Record<string, unknown>` | — | Markdoc variables for `{% $name %}` (real values) |
| `search` | `boolean` | `true` | `false` strips the search chrome |

Each item has this shape:

```typescript
interface EleventyPageData {
  url: string;                    // e.g. '/docs/getting-started'
  title: string;                  // Page title from frontmatter
  html: string;                   // Pre-rendered page HTML, layout included
  seo: {
    title: string;                // Resolved page title
    description: string;          // Meta description
    metaTags: string;             // Pre-built <meta>/<link> tags (OG, Twitter, canonical)
    jsonLd: string;               // Pre-built <script type="application/ld+json"> tags
  };
  frontmatter: Record<string, unknown>;
  contextJson: string;            // Serialized { pages, currentUrl } for #rf-context
  hasInteractiveRunes: boolean;   // Whether the page needs the behaviors script
}
```

`hasInteractiveRunes()` is also exported for custom templates or build scripts that work with a rendered tree directly.

## Shared setup

These work the same way for every adapter; see the overview:

- [CSS](/docs/adapters/adapters-overview#css) — passthrough-copied, linked from the template
- [Site-level token overrides](/docs/adapters/adapters-overview#site-level-token-overrides) — `writeSiteTokensCss()`, linked after the theme CSS (an empty config still writes a zero-byte file, so the link never 404s)
- [Behaviors](/docs/adapters/adapters-overview#behaviors) — the inline module script above
- [SEO and structured data](/docs/adapters/adapters-overview#seo-and-structured-data) — the `seo` option of `createDataFile()`
- [Dependencies](/docs/adapters/adapters-overview#dependencies)
