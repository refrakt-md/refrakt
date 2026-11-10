---
'@refrakt-md/runes': patch
'@refrakt-md/plan': patch
---

**Unpublished pages are not linked to.** Plan entities on a `draft: true` page register without a URL, so a backlog, decision log or activity feed shows them unlinked rather than linking to a page that is not built. An inline `{% link %}` with an empty `href` now renders its content unlinked, as the block form already did, rather than as `<a href="">`.
