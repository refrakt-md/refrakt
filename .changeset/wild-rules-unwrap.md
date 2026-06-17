---
"@refrakt-md/runes": patch
"@refrakt-md/marketing": patch
"@refrakt-md/places": patch
"@refrakt-md/business": patch
"@refrakt-md/docs": patch
"@refrakt-md/learning": patch
---

Fix paragraph-wrapped media in media+content runes. Markdoc wraps inline media (a bare image, or a single block rune like `{% sandbox %}`) in a `<p>`; several runes passed their media/header zone through raw, so the media well held a stray paragraph instead of the element. `hero`, `feature`, `step`, `event`, `organization`, `symbol`, and `howto` now unwrap it, matching `card`/`bento`. Additionally, content-model fields matching `image` now capture standalone images (parsed by Markdoc as a paragraph), fixing the `character` portrait being silently dropped.
