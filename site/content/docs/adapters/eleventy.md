---
title: Eleventy Adapter
description: Using refrakt.md with Eleventy v3 — the simplest adapter, no bundler required
---

# Eleventy Adapter

The Eleventy adapter (`@refrakt-md/eleventy`) integrates refrakt.md with [Eleventy (11ty) v3](https://www.11ty.dev/). It is the simplest adapter — no Vite, no bundler, just Eleventy's template engine and data cascade. Content is loaded at build time, transformed to HTML strings, and injected into Nunjucks (or Liquid) templates.

## Installation

```shell
npm install @refrakt-md/eleventy @refrakt-md/content @refrakt-md/runes @refrakt-md/transform @refrakt-md/types @refrakt-md/lumina @markdoc/markdoc
```

## Configuration

Set `target` to `"eleventy"` in `refrakt.config.json`:

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "eleventy",
  "routeRules": [
    { "pattern": "**", "layout": "default" }
  ]
}
```

## EleventyTheme Interface

Like the HTML adapter, the Eleventy adapter uses a theme interface with no component registry — all runes render through the identity transform and `renderToHtml()`:

```typescript
interface EleventyTheme {
  manifest: ThemeManifest;
  layouts: Record<string, LayoutConfig>;
}
```

Interactive runes get their behavior from `@refrakt-md/behaviors` via client-side initialization in the template.

## Project Structure

A typical Eleventy + refrakt project looks like this:

```
my-site/
  content/              # Markdoc content (separate from Eleventy templates)
    index.md
    docs/
      getting-started.md
  _data/
    refrakt.js          # Global data file — loads and transforms content
  _includes/
    base.njk            # Base Nunjucks template
  pages.njk             # Pagination template — one page per content item
  eleventy.config.js    # Eleventy configuration
  refrakt.config.json   # refrakt configuration
  package.json
```

{% hint type="note" %}
Keep the content directory separate from Eleventy's template input directory. Eleventy should not try to process `.md` files in `content/` as its own Markdown — refrakt handles all Markdown processing through Markdoc.
{% /hint %}

## Plugin Setup

Register the refrakt plugin in your Eleventy configuration file. The plugin configures passthrough file copy for theme CSS:

```javascript
// eleventy.config.js
import { refraktPlugin } from '@refrakt-md/eleventy';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(refraktPlugin, {
    cssFiles: ['node_modules/@refrakt-md/lumina/index.css'],
    cssPrefix: '/css',
  });

  // Ignore the content directory — refrakt processes it, not Eleventy
  eleventyConfig.ignores.add('content/**');

  return {
    dir: {
      input: '.',
      includes: '_includes',
      data: '_data',
      output: '_site',
    },
  };
}
```

### RefraktEleventyOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configPath` | `string` | `'./refrakt.config.json'` | Path to the refrakt config file |
| `cssFiles` | `string[]` | — | CSS file paths to passthrough copy (typically from `node_modules`) |
| `cssPrefix` | `string` | `'/css'` | URL prefix for copied CSS files in the output |

## Global Data File

The `createDataFile` function produces an Eleventy [global data file](https://www.11ty.dev/docs/data-global/) that loads all refrakt content, applies the identity and layout transforms, and returns an array of page objects with pre-rendered HTML.

Create `_data/refrakt.js`:

```javascript
import { createDataFile } from '@refrakt-md/eleventy';
import { theme } from '@refrakt-md/lumina/eleventy';

export default createDataFile({
  theme,
  contentDir: './content',
  basePath: '/',
});
```

### createDataFile Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme` | `EleventyTheme` | — | Theme definition (required) |
| `contentDir` | `string` | `'./content'` | Path to the content directory |
| `basePath` | `string` | `'/'` | Base URL path for all generated pages |
| `configPath` | `string` | `'./refrakt.config.json'` | Path to refrakt config |

### EleventyPageData

Each item in the returned array has this shape:

```typescript
interface EleventyPageData {
  url: string;           // e.g. '/docs/getting-started/'
  title: string;         // Page title from frontmatter
  html: string;          // Pre-rendered HTML (identity + layout transform)
  seo: {
    title: string;       // Resolved page title
    description: string; // Meta description
    metaTags: string;    // Pre-built <meta> tags (OG, Twitter)
    jsonLd: string;      // Pre-built <script type="application/ld+json"> tags
  };
  frontmatter: Record<string, unknown>;
}
```

## Base Template

Use a Nunjucks template that outputs the pre-rendered HTML with the `| safe` filter (to prevent HTML escaping):

```nunjucks
{# _includes/base.njk #}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  {% if page.seo.title %}<title>{{ page.seo.title }}</title>{% endif %}
  {{ page.seo.metaTags | safe }}
  {{ page.seo.jsonLd | safe }}
  <link rel="stylesheet" href="/css/index.css">
</head>
<body>
  {{ page.html | safe }}
  <script type="module">
    import { registerElements, RfContext, initRuneBehaviors, initLayoutBehaviors } from '/js/behaviors.js';

    RfContext.currentUrl = '{{ page.url }}';
    registerElements();
    initRuneBehaviors();
    initLayoutBehaviors();
  </script>
</body>
</html>
```

{% hint type="warning" %}
Always use `| safe` when outputting `page.html`, `page.seo.metaTags`, and `page.seo.jsonLd`. Without it, Nunjucks escapes the HTML entities and the output renders as visible markup instead of formatted content.
{% /hint %}

A reference template is included in the package at `@refrakt-md/eleventy/templates/base.njk`.

## Pagination

Use Eleventy's [pagination](https://www.11ty.dev/docs/pagination/) to generate one HTML page per content item from the global data:

```nunjucks
---js
{
  pagination: {
    data: "refrakt",
    size: 1,
    alias: "page"
  },
  permalink: "{{ page.url }}",
  layout: "base.njk"
}
---
```

Save this as `pages.njk` at the root of your input directory. Eleventy iterates over the `refrakt` data array and generates a page for each item, using the `url` from the content as the output permalink.

## CSS Setup

Theme CSS needs to be copied into the output directory. The plugin's `cssFiles` option handles this via Eleventy's passthrough file copy:

```javascript
eleventyConfig.addPlugin(refraktPlugin, {
  cssFiles: ['node_modules/@refrakt-md/lumina/index.css'],
  cssPrefix: '/css',
});
```

This copies `index.css` to `_site/css/index.css`. Reference it in your template with:

```html
<link rel="stylesheet" href="/css/index.css">
```

For community package CSS, add their stylesheets to the `cssFiles` array:

```javascript
cssFiles: [
  'node_modules/@refrakt-md/lumina/index.css',
  'node_modules/@refrakt-md/marketing/styles/index.css',
],
```

## Behavior Initialization

Interactive runes (tabs, accordion, datatable, etc.) need client-side JavaScript from `@refrakt-md/behaviors`. Copy the behaviors bundle to your output and initialize it in the template:

```javascript
// eleventy.config.js — add passthrough copy for behaviors
eleventyConfig.addPassthroughCopy({
  'node_modules/@refrakt-md/behaviors/dist/index.js': 'js/behaviors.js',
});
```

The template script block registers web component elements, sets the current URL for active-link behaviors, and initializes rune and layout behaviors:

```html
<script type="module">
  import { registerElements, RfContext, initRuneBehaviors, initLayoutBehaviors } from '/js/behaviors.js';

  RfContext.currentUrl = window.location.pathname;
  registerElements();
  initRuneBehaviors();
  initLayoutBehaviors();
</script>
```

{% hint type="note" %}
`@refrakt-md/behaviors` is optional. Without it, the page renders correctly but interactive runes will not have JavaScript enhancement.
{% /hint %}

## ESM Compatibility

Eleventy 3.0 is ESM-native. The `@refrakt-md/eleventy` package, data files, and configuration files all use ES module syntax (`import`/`export`). Ensure your `package.json` has `"type": "module"`.

## Differences from Other Adapters

| Feature | Eleventy | SvelteKit | HTML |
|---------|----------|-----------|------|
| Build tool | Eleventy CLI | Vite | Custom script |
| Template language | Nunjucks/Liquid | Svelte | None (API) |
| Dev server | `--serve` (live reload) | `vite dev` (HMR) | Manual |
| Component overrides | No | Yes (Svelte) | No |
| Data loading | Global data file | Vite plugin + virtual modules | Direct API call |
| Output | Static HTML | SSR + SPA | Static HTML |
| Client routing | No (full page loads) | Yes (SvelteKit router) | No |

The Eleventy adapter sits between the HTML adapter and the SvelteKit adapter in complexity. It provides Eleventy's template system and data cascade without requiring a bundler, while the HTML adapter gives you a raw API and the SvelteKit adapter gives you a full application framework.

## Dependencies

| Package | Required | Purpose |
|---------|----------|---------|
| `@refrakt-md/content` | Yes | Content loading, routing, layout cascade, cross-page pipeline |
| `@refrakt-md/transform` | Yes | Identity transform engine, layout transform, `renderToHtml` |
| `@refrakt-md/types` | Yes | Shared TypeScript interfaces |
| `@11ty/eleventy` | Peer | Eleventy v3 (ESM) |
| `@refrakt-md/behaviors` | Optional | Client-side progressive enhancement for interactive runes |

## Theme Integration

Lumina provides a dedicated Eleventy adapter export:

```javascript
import { theme } from '@refrakt-md/lumina/eleventy';
```

This export bundles the theme manifest and layout configurations (default, docs, blog-article) so you can pass it directly to `createDataFile`. Custom themes can implement the `EleventyTheme` interface by providing a manifest and layout map.
