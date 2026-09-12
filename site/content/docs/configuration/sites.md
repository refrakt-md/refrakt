---
title: Sites
description: Single-site vs multi-site configuration; the SiteConfig fields.
---

# Sites

Site-scoped settings live in either `site` (singular, one site) or `sites` (plural map, multiple sites). Each entry is a `SiteConfig` with the same set of fields.

## Single-site

Most projects have one site:

```json
{
  "$schema": "https://refrakt.md/schemas/v0.11/refrakt.config.schema.json",
  "site": {
    "contentDir": "./content",
    "theme": "@refrakt-md/lumina",
    "target": "svelte"
  }
}
```

The SvelteKit plugin (and other adapters) picks the lone site automatically, so single-site projects don't need to pass a `site` option. The legacy flat shape (without the `site` wrapper) still loads but is **deprecated in v0.12.0** and slated for removal in v1.0 — see [Migration](/docs/configuration/migration).

## Multi-site

Multi-site repos declare named entries under `sites`:

```json
{
  "$schema": "https://refrakt.md/schemas/v0.11/refrakt.config.schema.json",
  "sites": {
    "main": {
      "contentDir": "./site/content",
      "theme": "@refrakt-md/lumina",
      "target": "svelte",
      "baseUrl": "https://example.com"
    },
    "blog": {
      "contentDir": "./blog/content",
      "theme": "@refrakt-md/lumina",
      "target": "svelte",
      "baseUrl": "https://blog.example.com"
    }
  }
}
```

Each adapter (SvelteKit, Astro, Nuxt, Next, Eleventy) accepts a `site` option that selects which entry to build:

```ts
// site/vite.config.ts (SvelteKit)
import { sveltekit } from '@sveltejs/kit/vite';
import { refrakt } from '@refrakt-md/sveltekit';

export default defineConfig({
  plugins: [
    sveltekit(),
    refrakt({ configPath: '../refrakt.config.json', site: 'main' }),
  ],
});
```

Single-site projects can omit the `site` option — the plugin picks the only entry automatically. Multi-site projects must pass it explicitly; the plugin throws at config-load time with the available names if it's missing.

## CLI `--site` flag

Site-scoped commands (`inspect`, `contracts`, `validate`, `scaffold-css`, `package validate`) accept `--site <name>`:

```bash
# Pick a specific site explicitly
npx refrakt inspect hint --type=warning --site main

# Single-site projects don't need it
npx refrakt inspect hint --type=warning
```

Unknown site names produce a "did you mean?" suggestion. Plan-only repos (no sites declared) error with a "no site configured" message when site-scoped commands are run.

## SiteConfig fields

The complete list of fields a site accepts — with types, defaults and which
are required — is the **[configuration reference](/docs/configuration/reference)**,
generated from the schema. The sections below cover the two shapes that need
explaining rather than listing.

### Theme object form

The string form (`"theme": "@refrakt-md/lumina"`) is shorthand for `{ "package": "@refrakt-md/lumina" }`. Use the object form when you need any of:

- **`presets`** — palette or syntax presets merged into the theme in declared order (last wins per token).
- **`tokens`** — site-level token overrides applied on top of the theme and any presets.
- **`modes`** — per-mode overlays (e.g. `dark`) layered on top of theme modes and preset modes.
- **`code.colorScheme`** — force fenced code blocks to a fixed scheme (`light` / `dark`) regardless of the page's mode.


```json
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/niwaki"],
      "tokens": {
        "color": { "primary": "#e15f80" }
      },
      "modes": {
        "dark": { "color": { "primary": "#e8788f" } }
      },
      "code": { "colorScheme": "dark" }
    }
  }
}
```

### Example: full site

```json
{
  "site": {
    "contentDir": "./content",
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/niwaki"],
      "code": { "colorScheme": "dark" }
    },
    "target": "svelte",
    "baseUrl": "https://example.com",
    "siteName": "My Documentation",
    "logo": "/favicon-192.png",
    "plugins": ["@refrakt-md/marketing", "@refrakt-md/docs"],
    "routeRules": [
      { "pattern": "blog/**", "layout": "blogArticleLayout" },
      { "pattern": "docs/**", "layout": "docsLayout" },
      { "pattern": "**", "layout": "defaultLayout" }
    ],
    "runes": {
      "prefer": { "storyboard": "@refrakt-md/marketing" },
      "aliases": { "callout": "hint" }
    }
  }
}
```

## Path resolution

Inside a site entry, paths like `contentDir: "./content"` are interpreted relative to the **vite app's resolved root**, not the config file location. So a config at the repo root with `site.contentDir: "./content"` and a SvelteKit plugin running from `site/` resolves content from `site/content/`. This matters when you split your refrakt.config.json across multiple sites with different vite roots.
