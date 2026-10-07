---
'@refrakt-md/runes': minor
---

Runes resolve before the transform in tree order, and a rune can declare `preprocess` (WORK-618, BUG-027)

`createContentModelSchema` accepts a `preprocess(node, page, ctx)` hook beside
`transform`. It receives the rune's own tag node and returns a replacement, an
array of nodes to splice in its place, or nothing. `ctx` is the page's
`PreprocessContext` plus `ancestors`, the enclosing nodes from the document
down. `include`, `snippet` and `data` now declare theirs this way. The core
pipeline hook runs one walk over the page and calls each rune's hook where it
meets the tag. Plugin runes in the site's tag table take part the same way.
`preprocessTree`, `RunePreprocess` and `RunePreprocessContext` are exported.
`PluginPipelineHooks.preprocess` is unchanged.

The walk continues into whatever a hook returns. The order between
preprocessing runes therefore follows where they sit in the page, and is no
longer a fixed sequence of include, snippet, data. This fixes a
`{% snippet path=$row.path %}` inside a `{% data %}` row template. The snippet
used to resolve before any row was bound, so every row rendered the same
"`path` attribute is required" error fence. It now reads the file each row
names. An `{% include file=$row.file %}` in a row template works the same way.
Pages that do not combine these runes render as before. Structure contracts and
the SEO baseline are unchanged.
