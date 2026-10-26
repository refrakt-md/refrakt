---
'@refrakt-md/runes': minor
'@refrakt-md/lumina': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/marketing': patch
'@refrakt-md/docs': patch
'@refrakt-md/storytelling': patch
'@refrakt-md/business': patch
'@refrakt-md/places': patch
'@refrakt-md/media': patch
'@refrakt-md/learning': patch
---

The `data-field="content-section"` attribute is gone from every rune root (SPEC-133). Nothing read it. It came from `property: 'contentSection'` in 28 transforms, which are now cleaned up.

- **Removed outright:** the `documents` and `Page` exports of `@refrakt-md/runes`. The `Page` document node was never registered by any Markdoc config, and it compared the attribute with the wrong casing, so it never ran. The `PageSection` config entry and `page-section.css` in Lumina and the skeleton went with it.
- **Deprecated:** `property` on `createComponentRenderable` and on an `emits` declaration is still accepted, so a plugin that passes it keeps type-checking, but it is ignored and renders nothing. It is removed in the release after this one.
