---
'@refrakt-md/runes': patch
'@refrakt-md/marketing': patch
'@refrakt-md/docs': patch
'@refrakt-md/design': patch
'@refrakt-md/learning': patch
'@refrakt-md/storytelling': patch
'@refrakt-md/business': patch
'@refrakt-md/places': patch
'@refrakt-md/media': patch
'@refrakt-md/plan': patch
---

Stop emitting property-mapped meta tags into rune `children`.

Every rune that mapped a meta under `properties` and also listed it in `children`
had it filtered straight back out by `createComponentRenderable`; the value
already lives in the `data-rune-fields` bag. The emission is removed from 62 tag
files and the auto-breadcrumb builder. Rendered output is unchanged: structure
contracts, the structured-data baseline, and `refrakt inspect` across every rune
and variant are identical before and after.

The one exception is content that is already invalid. A `blog` with no `folder`
(a required attribute) no longer renders an empty `<meta data-field="folder">`.
