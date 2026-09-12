---
"@refrakt-md/runes": patch
"@refrakt-md/transform": patch
---

Bind booleans in `{% data %}` per-row templates, and describe every schema definition

The table intermediate `data` builds is text, so a JSON `false` reached a per-row body as the *string* `"false"` — which is truthy, making `{% if $row.flag %}` render for every row. Cells whose entire text is `true` or `false` now bind as booleans, alongside the existing numeric channel.

`refrakt.config.schema.json` gains descriptions on `SiteConfig`, `RouteRule` and `RunesConfig`, so a `$ref` property inherits meaningful prose instead of an empty string.
