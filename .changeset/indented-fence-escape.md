---
'@refrakt-md/runes': patch
---

Rune tags inside an indented code fence are no longer processed as real tags. refrakt escapes `{% … %}` inside fences before parsing, but it only recognised a fence that started at the beginning of a line. A fence inside a list item, or inside a rune whose content is indented, had its tags parsed: for example, an `md` example showing `{% hero %}` became a real `hero`. `refrakt format` now also checks its rewrites against the tree the site actually builds from, with tags inside fences escaped.
