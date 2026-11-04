---
'@refrakt-md/transform': minor
'@refrakt-md/content': minor
---

**`$site` page variable** (SPEC-187 D7). Pages can tell which site they are rendered for: `$site.name` is the site's key in `refrakt.config.json` (`"main"` for a single-site config). `normalizeRefraktConfig` tags each site with its key as `name` (a derived field; an authored `name` that differs from the key is reported), and `buildPageContentVariables` reads it from the site config every adapter already passes, so every adapter's pages get it with no adapter change. A content load with no site config has no `$site`. The new `NamedSiteConfig` type is exported from `@refrakt-md/transform/node`.
