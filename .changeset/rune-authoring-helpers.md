---
'@refrakt-md/runes': minor
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

New rune-authoring helpers in `@refrakt-md/runes` (WORK-602, WORK-603)

- `renderNodes(value, config)` returns a `RenderableNodeCursor` over the
  transformed content. It replaces
  `new RenderableNodeCursor(Markdoc.transform(asNodes(x), config) as RenderableTreeNode[])`.
- `bodyOnly()` is the content model of a rune whose children are all body. It
  returns a fresh object per call.
- `fieldMetas(attrs, config, spec)` builds a rune's property metas from one
  declaration. A bare string is the default for the attribute of the same name.
  `{ from: ['attrs.x', 'file.x'], default }` takes the first non-empty source.
  The spec is plain data and round-trips through JSON. Any root other than
  `attrs` or `file` is rejected.
- `groupByHeading(nodes, { initial, heading, item, other? })` is the shared walk
  where a heading sets the running group and list items become entries.

The built-in runes now use these helpers: 78 cursor constructions, 49 content
models, 12 property maps (including the five plan runes' `created` / `modified`
fallback to file dates) and six heading-grouped list parsers. Neither helper is
mandatory. Rendered output is unchanged.
