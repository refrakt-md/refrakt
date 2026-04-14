---
title: Configuration Reference
description: Complete reference for refrakt.config.json — the project-level configuration file
---

# Configuration Reference

Every refrakt.md project has a `refrakt.config.json` file at its root. This file tells the framework where your content lives, which theme to use, and which adapter and packages to load.

## Minimal example

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "svelte"
}
```

## Required fields

| Field | Type | Description |
|-------|------|-------------|
| `contentDir` | `string` | Path to the content directory, relative to the project root |
| `theme` | `string` | Active theme — an npm package name (e.g., `@refrakt-md/lumina`) or a relative path to a local theme |
| `target` | `string` | Target adapter identifier (e.g., `svelte`, `astro`, `next`, `nuxt`, `eleventy`, `html`) |

## Optional fields

### baseUrl

```json
{
  "baseUrl": "https://example.com"
}
```

The public base URL of your site. Used to generate absolute URLs for `<link rel="canonical">`, `og:url`, `og:image`, and other SEO meta tags. Also required for automatic WebSite and Organization JSON-LD generation (see `logo`). Without this, canonical links and Open Graph URLs will use relative paths.

### siteName

```json
{
  "siteName": "My Site"
}
```

Human-readable site name, used in the `og:site_name` meta tag and the auto-generated WebSite/Organization JSON-LD schemas. If omitted, defaults to `"refrakt.md"` in the Svelte adapter.

### logo

```json
{
  "logo": "/favicon-192.png"
}
```

Site logo image used in the auto-generated [Organization](https://schema.org/Organization) JSON-LD schema. Google uses this to display your site's icon in search results and knowledge panels. The path is relative to the site root and is resolved to an absolute URL using `baseUrl`.

When `baseUrl` is set, refrakt automatically emits [WebSite](https://schema.org/WebSite) and [Organization](https://schema.org/Organization) JSON-LD schemas. The Organization schema includes `logo` as its logo property.

### defaultImage

```json
{
  "defaultImage": "/og-image.png"
}
```

Default image for Open Graph and Twitter Card meta tags on pages that don't have their own image (from frontmatter or content). The path is relative to the site root and is resolved to an absolute URL using `baseUrl`. The recommended size is 1200x630px — this is the image shown when your pages are shared on social media (Twitter, Slack, Discord, LinkedIn, etc.).

This is separate from `logo`, which is used for structured data. Most sites can leave `defaultImage` unset and instead set `image` in frontmatter on pages that benefit from a social preview (blog posts, landing pages, etc.).

### packages

```json
{
  "packages": [
    "@refrakt-md/marketing",
    "@refrakt-md/docs"
  ]
}
```

An array of community rune package names to load. Packages are npm modules that export a `RunePackage` object. Their rune schemas, theme configs, and pipeline hooks are merged into the build automatically.

See [Community Packages](/docs/packages) for the full list of official packages.

### runes

Controls rune name resolution — useful when multiple packages define runes with the same name or when you want shorthand aliases.

```json
{
  "runes": {
    "prefer": {
      "timeline": "@refrakt-md/business"
    },
    "aliases": {
      "callout": "hint",
      "note": "hint"
    },
    "local": {
      "custom-card": "./runes/custom-card.ts"
    }
  }
}
```

| Sub-field | Type | Description |
|-----------|------|-------------|
| `prefer` | `Record<string, string>` | Resolve name collisions between packages. The value is the package that wins. Use `"__core__"` to force the core version. |
| `aliases` | `Record<string, string>` | Tag name aliases — use `{% callout %}` as shorthand for `{% hint %}` |
| `local` | `Record<string, string>` | Local rune module paths (highest priority). Keys are tag names, values are relative paths to schema files. |

### overrides

```json
{
  "overrides": {
    "Recipe": "./components/MyRecipe.svelte",
    "Hero": "./components/MyHero.svelte"
  }
}
```

Component override mapping. Keys are `typeof` names (the rune's component identifier), values are relative paths to replacement components. This lets you swap out the default rendering for any rune without modifying the theme.

### routeRules

```json
{
  "routeRules": [
    { "pattern": "blog/**", "layout": "blogArticleLayout" },
    { "pattern": "docs/**", "layout": "docsLayout" },
    { "pattern": "**", "layout": "defaultLayout" }
  ]
}
```

An array of route-to-layout rules, evaluated in order (first match wins). Each rule has a `pattern` (glob matched against the page URL) and a `layout` (layout name from the theme).

### highlight

```json
{
  "highlight": {
    "theme": "github-dark"
  }
}
```

Or with separate light/dark themes:

```json
{
  "highlight": {
    "theme": {
      "light": "github-light",
      "dark": "github-dark"
    }
  }
}
```

Syntax highlighting configuration. The `theme` field accepts a single theme name or a `{ light, dark }` pair for dual-mode highlighting.

### icons

```json
{
  "icons": {
    "rocket": "<svg>...</svg>",
    "custom-logo": "<svg>...</svg>"
  }
}
```

Project-level custom icon SVGs. These are merged into the theme's global icon group and become available to the `{% icon %}` rune and any structure entries that reference icons by name.

### tints

```json
{
  "tints": {
    "brand": {
      "bg": "var(--rf-color-brand-50)",
      "border": "var(--rf-color-brand-200)"
    }
  }
}
```

Project-level tint presets, merged after the theme's built-in tints. Tints are named color schemes that runes can reference via the `tint` attribute (e.g., `{% hint tint="brand" %}`).

### backgrounds

```json
{
  "backgrounds": {
    "hero-gradient": {
      "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    }
  }
}
```

Project-level background presets, merged after the theme's built-in backgrounds. Used by runes like `{% bg %}` and `{% hero %}`.

### sandbox

```json
{
  "sandbox": {
    "examplesDir": "./examples"
  }
}
```

Configuration for the `{% sandbox %}` rune. The `examplesDir` field sets the directory where external sandbox example files are stored (defaults to `./examples`).

## Full example

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "svelte",
  "baseUrl": "https://example.com",
  "siteName": "My Documentation",
  "logo": "/favicon-192.png",
  "packages": [
    "@refrakt-md/marketing",
    "@refrakt-md/docs",
    "@refrakt-md/design"
  ],
  "runes": {
    "prefer": {
      "storyboard": "@refrakt-md/marketing"
    },
    "aliases": {
      "callout": "hint"
    }
  },
  "overrides": {
    "Recipe": "./components/MyRecipe.svelte"
  },
  "routeRules": [
    { "pattern": "blog/**", "layout": "blogArticleLayout" },
    { "pattern": "**", "layout": "defaultLayout" }
  ],
  "highlight": {
    "theme": { "light": "github-light", "dark": "github-dark" }
  },
  "icons": {
    "custom-logo": "<svg viewBox='0 0 24 24'>...</svg>"
  }
}
```
