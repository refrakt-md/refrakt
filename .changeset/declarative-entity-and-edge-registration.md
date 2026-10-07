---
'@refrakt-md/runes': minor
'@refrakt-md/content': minor
'@refrakt-md/cli': minor
'@refrakt-md/storytelling': minor
'@refrakt-md/design': minor
'@refrakt-md/editor': patch
---

A rune can declare what it registers in the cross-page registry (WORK-611, WORK-612, WORK-613)

`createContentModelSchema` takes a `registers` block: an `entity` (with `type`,
`idFrom`, `scope`, `data` and `aliases`) or an `edge` (with `from`, `to`, `kind`,
`bidirectional` and `data`). The block is plain data. It is checked when the
module loads, and a function, an unknown key or a class instance is an error. One
core participant does the registering in the same Phase 2 and Phase 3 slots a
plugin's `register` and `aggregate` hooks use. It runs inside the declaring
plugin's hook set, beside any hooks the plugin still writes. A plugin that writes
no `aggregate` of its own gets the participant's name index in its `aggregated`
slot, as `{ entityByName }`. Declared edges are added to the relationship graph,
so `getRelated` and the `relationships` rune can find them.

A source that the rune never provides is reported by `refrakt validate` as
`registers-source-unresolved`, with the file and line of the rune instance. That
id is now on by default. `refrakt inspect` shows the block, and its JSON output
has a new `registers` field. `refrakt reference` documents it.

Storytelling and design now register this way, and their `register` and
`aggregate` hooks have been removed. Their registries are unchanged: the same
entries in the same order, with the same data. Snapshot tests captured before
the migration enforce this. Two outputs did change:

- `bond` edges are now in the relationship graph, with the bond's `type` as the
  edge kind. An endpoint written as an alias resolves to the character's id.
  Storytelling's `aggregated` slot no longer has `relationships` or
  `orphanedBonds`. Nothing in this repository read them, and the
  unknown-endpoint warnings are still reported.
- Design's `aggregated` slot is now `{ entityByName }` instead of `{ contexts }`.
  The editor's sandbox preview and its `context=` autocomplete read the new
  shape, and `/api/aggregated` now sends Maps as plain objects.

Structure contracts and the SEO baseline are unchanged.
