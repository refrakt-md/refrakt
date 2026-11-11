---
'@refrakt-md/eleventy': minor
'@refrakt-md/content': minor
'create-refrakt': patch
---

**Eleventy sites render their runes.** `createDataFile()` rendered each page without the identity transform or syntax highlighting, and never loaded the plugins named in `refrakt.config.json`, so every rune was unstyled and a plugin rune such as `cta` failed to parse. It now loads the site through `createRefraktLoader`: the content directory, plugins and theme come from the config, and pages get the identity transform and highlighting. `contentDir` and `plugins` are ignored (with a warning); `configPath` and `site` select the config and site, and each page carries `highlightCss`. `createRefraktLoader` gains a `basePath` option.

The Eleventy plugin now copies a package a theme stylesheet `@import`s by name (Lumina's `@refrakt-md/skeleton`) beside it and points the import there, since a browser cannot resolve a package name.

The Eleventy scaffold and the packaged `templates/base.njk` are fixed: the data file imports the theme manifest with `with { type: 'json' }`, which Node requires; pages are paginated under `entry` rather than Eleventy's reserved `page`, so they are no longer blank; and nested URLs keep their slashes (`/docs/getting-started/`, not `/docsgetting-started/`).
